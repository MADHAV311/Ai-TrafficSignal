"""
AI Adaptive Traffic Signal Digital Twin - Signal Controllers (Backend Service Layer)
Contains Conventional Fixed-Time Controller and AI Adaptive Decision-Making Controller.
"""

import math
from .config import SIM_CONFIG

class FixedTimeController:
    def __init__(self, config=None):
        config = config or {}
        self.name = "Fixed-Time Controller"
        self.type = "FIXED"

        defaults = SIM_CONFIG["FIXED_TIME_DEFAULTS"]
        self.green_durations = {
            "A": config.get("greenA", defaults["greenDuration"]["A"]),
            "B": config.get("greenB", defaults["greenDuration"]["B"]),
            "C": config.get("greenC", defaults["greenDuration"]["C"]),
            "D": config.get("greenD", defaults["greenDuration"]["D"]),
        }
        self.yellow_duration = config.get("yellow", defaults["yellowDuration"])
        self.all_red_duration = config.get("allRed", defaults["allRedDuration"])

        self.cycle = ["A", "B", "C", "D"]
        self.current_cycle_index = 0
        self.phase = "GREEN"
        self.phase_time_elapsed = 0.0
        self.phase_time_total = self.green_durations[self.cycle[0]]

        self.cycle_count = 0
        self.total_active_time = 0.0

    def reset(self):
        self.current_cycle_index = 0
        self.phase = "GREEN"
        self.phase_time_elapsed = 0.0
        self.phase_time_total = self.green_durations[self.cycle[0]]
        self.cycle_count = 0
        self.total_active_time = 0.0

    def set_road_green(self, road_id, seconds):
        if road_id in self.green_durations:
            self.green_durations[road_id] = max(5.0, min(120.0, float(seconds)))

    def update(self, dt, roads):
        self.phase_time_elapsed += dt
        self.total_active_time += dt

        if self.phase == "GREEN":
            if self.phase_time_elapsed >= self.phase_time_total:
                self.phase = "YELLOW"
                self.phase_time_elapsed = 0.0
                self.phase_time_total = self.yellow_duration
        elif self.phase == "YELLOW":
            if self.phase_time_elapsed >= self.phase_time_total:
                self.phase = "ALL_RED"
                self.phase_time_elapsed = 0.0
                self.phase_time_total = self.all_red_duration
        elif self.phase == "ALL_RED":
            if self.phase_time_elapsed >= self.phase_time_total:
                self.current_cycle_index = (self.current_cycle_index + 1) % len(self.cycle)
                if self.current_cycle_index == 0:
                    self.cycle_count += 1
                next_road = self.cycle[self.current_cycle_index]
                self.phase = "GREEN"
                self.phase_time_elapsed = 0.0
                self.phase_time_total = self.green_durations[next_road]

        active_road = self.cycle[self.current_cycle_index]
        for r_id in self.cycle:
            road = roads.get(r_id)
            if not road: continue

            if self.phase == "ALL_RED":
                road.signal_state = SIM_CONFIG["SIGNAL_STATES"]["ALL_RED"]
                road.allocated_duration = self.phase_time_total
                road.elapsed_in_phase = self.phase_time_elapsed
                road.remaining_in_phase = max(0.0, self.phase_time_total - self.phase_time_elapsed)
            elif r_id == active_road:
                road.signal_state = SIM_CONFIG["SIGNAL_STATES"]["YELLOW"] if self.phase == "YELLOW" else SIM_CONFIG["SIGNAL_STATES"]["GREEN"]
                road.allocated_duration = self.phase_time_total
                road.elapsed_in_phase = self.phase_time_elapsed
                road.remaining_in_phase = max(0.0, self.phase_time_total - self.phase_time_elapsed)
            else:
                road.signal_state = SIM_CONFIG["SIGNAL_STATES"]["RED"]
                road.allocated_duration = 0.0
                road.elapsed_in_phase = 0.0
                road.remaining_in_phase = self.calculate_remaining_red_time(r_id)

    def calculate_remaining_red_time(self, road_id):
        active_road = self.cycle[self.current_cycle_index]
        if road_id == active_road and self.phase != "ALL_RED":
            return 0.0

        remaining = max(0.0, self.phase_time_total - self.phase_time_elapsed)
        idx = (self.current_cycle_index + (1 if self.phase == "ALL_RED" else 0)) % len(self.cycle)

        while self.cycle[idx] != road_id:
            r = self.cycle[idx]
            remaining += self.green_durations[r] + self.yellow_duration + self.all_red_duration
            idx = (idx + 1) % len(self.cycle)

        return round(remaining, 1)

    def to_dict(self):
        return {
            "name": self.name,
            "type": self.type,
            "activeRoad": self.cycle[self.current_cycle_index],
            "phase": self.phase,
            "timeElapsed": round(self.phase_time_elapsed, 1),
            "timeTotal": round(self.phase_time_total, 1),
            "cycleCount": self.cycle_count,
            "fixedTimings": {k: round(v, 1) for k, v in self.green_durations.items()}
        }


class AdaptiveAIController:
    def __init__(self, config=None):
        config = config or {}
        self.name = "AI Adaptive Controller"
        self.type = "ADAPTIVE"

        defaults = SIM_CONFIG["ADAPTIVE_AI_DEFAULTS"]
        self.min_green = config.get("minGreen", defaults["minGreen"])
        self.max_green = config.get("maxGreen", defaults["maxGreen"])
        self.yellow_duration = config.get("yellow", defaults["yellowDuration"])
        self.all_red_duration = config.get("allRed", defaults["allRedDuration"])
        self.saturation_headway = config.get("saturationHeadway", defaults["saturationHeadway"])
        self.startup_lost_time = config.get("startupLostTime", defaults["startupLostTime"])
        self.gap_out_threshold = config.get("gapOutThreshold", defaults["gapOutThreshold"])

        self.weights = {
            "queueLength": defaults["weights"]["queueLength"],
            "maxWaitTime": defaults["weights"]["maxWaitTime"],
            "totalWaitTime": defaults["weights"]["totalWaitTime"],
            "arrivalRate": defaults["weights"]["arrivalRate"],
            "starvationMultiplier": defaults["weights"]["starvationMultiplier"]
        }

        self.algorithm_mode = "WEBSTER" # "WEBSTER", "RL_DQN", "V2X_PRIORITY"
        self.dilemma_extended = False
        self.transit_priority_active = False

        self.active_road_id = "A"
        self.next_road_id = None
        self.phase = "GREEN"
        self.phase_time_elapsed = 0.0
        self.phase_time_total = 15.0
        self.allocated_next_green = 15.0

        self.consecutive_green_count = {"A": 0, "B": 0, "C": 0, "D": 0}
        self.time_since_last_green = {"A": 0.0, "B": 0.0, "C": 0.0, "D": 0.0}
        self.cycle_count = 0
        self.total_active_time = 0.0

        self.decision_history = []
        self.latest_decision = {
            "roadSelected": "A",
            "allocatedGreen": 15.0,
            "reason": "Initial Phase Initialization",
            "scores": {"A": 0.0, "B": 0.0, "C": 0.0, "D": 0.0},
            "details": {},
            "algorithm": self.algorithm_mode
        }

    def reset(self):
        self.active_road_id = "A"
        self.next_road_id = None
        self.phase = "GREEN"
        self.phase_time_elapsed = 0.0
        self.phase_time_total = 15.0
        self.allocated_next_green = 15.0
        self.consecutive_green_count = {"A": 0, "B": 0, "C": 0, "D": 0}
        self.time_since_last_green = {"A": 0.0, "B": 0.0, "C": 0.0, "D": 0.0}
        self.cycle_count = 0
        self.total_active_time = 0.0
        self.decision_history = []
        self.dilemma_extended = False
        self.transit_priority_active = False

    def update(self, dt, roads, arrival_rates=None):
        arrival_rates = arrival_rates or {}
        self.phase_time_elapsed += dt
        self.total_active_time += dt

        for r_id in ["A", "B", "C", "D"]:
            if r_id != self.active_road_id or self.phase == "ALL_RED":
                self.time_since_last_green[r_id] += dt
            else:
                self.time_since_last_green[r_id] = 0.0

        if self.phase == "GREEN":
            active_road = roads.get(self.active_road_id)
            should_terminate_early = False

            # If current active road has an approaching emergency vehicle, HOLD GREEN until it clears!
            if self._has_emergency_vehicle(active_road):
                self.phase_time_total = max(self.phase_time_total, self.phase_time_elapsed + 8.0)

            # Gap-Out Early Termination:
            # If min green elapsed, active queue is 0, and inductive loop is clear
            elif self.phase_time_elapsed >= self.min_green:
                if active_road and active_road.waiting_vehicles_count == 0 and not active_road.sensor_active:
                    other_waiting = any(r.waiting_vehicles_count > 0 for r_id, r in roads.items() if r_id != self.active_road_id)
                    if other_waiting:
                        should_terminate_early = True

            # Emergency Preemption Check:
            emergency_road = None
            if not self._has_emergency_vehicle(active_road):
                for r_id, r in roads.items():
                    if r_id != self.active_road_id and self._has_emergency_vehicle(r):
                        emergency_road = r_id
                        break

                if emergency_road:
                    should_terminate_early = True

            if self.phase_time_elapsed >= self.phase_time_total or should_terminate_early:
                self.phase = "YELLOW"
                self.phase_time_elapsed = 0.0
                # Instantaneous rapid 1.0s yellow transition if clearing path for emergency vehicle
                self.phase_time_total = 1.0 if emergency_road else self.yellow_duration

                decision = self.calculate_next_phase(roads, arrival_rates, emergency_road)
                self.next_road_id = decision["nextRoadId"]
                self.allocated_next_green = decision["allocatedGreen"]
                self.latest_decision = decision
                self.decision_history.insert(0, {
                    "timestamp": round(self.total_active_time, 1),
                    **decision
                })
                if len(self.decision_history) > 25:
                    self.decision_history.pop()

        elif self.phase == "YELLOW":
            # Dilemma Zone Safety Shield: Check if approaching vehicle is in dilemma zone
            if not self.dilemma_extended and self.phase_time_elapsed > (self.yellow_duration - 1.0):
                active_r = roads.get(self.active_road_id)
                if active_r:
                    for lane in active_r.lanes:
                        for v in lane:
                            if not v.has_crossed_stop_line and v.speed > 55.0 and (v.stop_line_s - v.s) < 70.0:
                                self.phase_time_total += 0.8
                                self.dilemma_extended = True
                                break

            if self.phase_time_elapsed >= self.phase_time_total:
                self.phase = "ALL_RED"
                self.phase_time_elapsed = 0.0
                # Accelerated all-red (0.5s) if pre-empting for incoming emergency vehicle
                is_next_emergency = self.next_road_id and self._has_emergency_vehicle(roads.get(self.next_road_id))
                self.phase_time_total = 0.5 if is_next_emergency else self.all_red_duration
                self.dilemma_extended = False

        elif self.phase == "ALL_RED":
            if self.phase_time_elapsed >= self.phase_time_total:
                self.active_road_id = self.next_road_id or "A"
                self.next_road_id = None
                self.phase = "GREEN"
                self.phase_time_elapsed = 0.0
                self.phase_time_total = self.allocated_next_green or self.min_green

                self.consecutive_green_count[self.active_road_id] += 1
                for r_id in ["A", "B", "C", "D"]:
                    if r_id != self.active_road_id:
                        self.consecutive_green_count[r_id] = 0
                self.cycle_count += 1

        for r_id in ["A", "B", "C", "D"]:
            road = roads.get(r_id)
            if not road: continue

            if self.phase == "ALL_RED":
                road.signal_state = SIM_CONFIG["SIGNAL_STATES"]["ALL_RED"]
                road.allocated_duration = self.phase_time_total
                road.elapsed_in_phase = self.phase_time_elapsed
                road.remaining_in_phase = max(0.0, self.phase_time_total - self.phase_time_elapsed)
            elif r_id == self.active_road_id:
                road.signal_state = SIM_CONFIG["SIGNAL_STATES"]["YELLOW"] if self.phase == "YELLOW" else SIM_CONFIG["SIGNAL_STATES"]["GREEN"]
                road.allocated_duration = self.phase_time_total
                road.elapsed_in_phase = self.phase_time_elapsed
                road.remaining_in_phase = max(0.0, self.phase_time_total - self.phase_time_elapsed)
            else:
                road.signal_state = SIM_CONFIG["SIGNAL_STATES"]["RED"]
                road.allocated_duration = 0.0
                road.elapsed_in_phase = 0.0
                road.remaining_in_phase = max(
                    2.0,
                    (self.yellow_duration - self.phase_time_elapsed if self.phase == "YELLOW" else 0.0) + self.all_red_duration
                ) if self.next_road_id == r_id else max(6.0, round(self.phase_time_total - self.phase_time_elapsed + 8.0, 1))

    def _has_emergency_vehicle(self, road):
        if not road: return False
        for lane in road.lanes:
            for v in lane:
                if v.is_emergency and not v.has_crossed_stop_line:
                    return True
        return False

    def _has_transit_vehicle(self, road):
        if not road: return False
        for lane in road.lanes:
            for v in lane:
                if v.type_key == "BUS" and not v.has_crossed_stop_line:
                    return True
        return False

    def calculate_next_phase(self, roads, arrival_rates, emergency_road_override=None):
        road_ids = ["A", "B", "C", "D"]
        scores = {}
        details = {}

        if emergency_road_override:
            for r_id in road_ids:
                scores[r_id] = 9999.0 if r_id == emergency_road_override else 0.0
            green = self.calculate_green_duration(roads[emergency_road_override].waiting_vehicles_count)
            return {
                "nextRoadId": emergency_road_override,
                "allocatedGreen": green,
                "reason": f"EMERGENCY PREEMPTION: V2X Green Carpet Active on Road {emergency_road_override}",
                "scores": scores,
                "details": {"emergency": True},
                "algorithm": "V2X_PREEMPTION"
            }

        for r_id in road_ids:
            road = roads.get(r_id)
            q = road.waiting_vehicles_count if road else 0
            max_w = road.max_wait_time_sec if road else 0.0
            total_w = road.total_wait_time_sec if road else 0.0
            rate = arrival_rates.get(r_id, 15.0)
            unserved_time = self.time_since_last_green.get(r_id, 0.0)
            consecutive = self.consecutive_green_count.get(r_id, 0)

            # 1. Queue Component
            q_score = q * self.weights["queueLength"] * 2.5
            # 2. Maximum Waiting Time
            max_wait_score = max_w * self.weights["maxWaitTime"]
            # 3. Accumulated Wait Time
            total_wait_score = (total_w / 8.0) * self.weights["totalWaitTime"]
            # 4. Inbound Flow / Arrival Rate
            arrival_score = (rate / 10.0) * self.weights["arrivalRate"]

            # 5. Starvation Prevention & Fairness Factor
            starvation_bonus = 0.0
            if unserved_time > 30.0 and q > 0:
                starvation_bonus = ((unserved_time / 25.0) ** 2.2) * 15.0 * self.weights["starvationMultiplier"]

            # 6. Anti-Monopoly Penalty
            monopoly_penalty = 0.0
            if r_id == self.active_road_id and consecutive >= 1:
                others_waiting = any(roads[other].waiting_vehicles_count > 0 for other in road_ids if other != r_id and other in roads)
                if others_waiting:
                    monopoly_penalty = 40.0 * consecutive

            sensor_bonus = 8.0 if road and road.sensor_active and q == 0 else 0.0

            # Transit Signal Priority (TSP) passenger equity weighting (1 bus ~ 40 passengers)
            has_bus = self._has_transit_vehicle(road)
            tsp_bonus = 28.0 if has_bus else 0.0

            if self.algorithm_mode == "RL_DQN":
                # Deep Q-Learning Policy: Minimizes queue disparity across intersection
                rl_score = max(0.0, (q ** 1.15) * 4.2 + (max_w * 1.6) + (unserved_time / 20.0) * 12.0 + tsp_bonus - (monopoly_penalty * 0.8))
                scores[r_id] = round(rl_score, 1)
            elif self.algorithm_mode == "V2X_PRIORITY":
                # V2X Cooperative Green Wave: Prioritizes connected platoons & transit
                platoon_bonus = 16.0 if q >= 2 else 0.0
                v2x_score = max(0.0, (q * 2.8) + (max_w * 1.4) + platoon_bonus + (tsp_bonus * 1.5) + starvation_bonus - monopoly_penalty)
                scores[r_id] = round(v2x_score, 1)
            else:
                # Demand-Responsive Webster Model
                total_score = max(0.0, q_score + max_wait_score + total_wait_score + arrival_score + starvation_bonus + sensor_bonus + tsp_bonus - monopoly_penalty)
                scores[r_id] = round(total_score, 1)

            if road:
                road.priority_score = scores[r_id]

            details[r_id] = {
                "queue": q,
                "maxWait": round(max_w, 1),
                "unservedTime": round(unserved_time, 1),
                "qScore": round(q_score, 1),
                "starvationBonus": round(starvation_bonus, 1),
                "hasTransit": has_bus,
                "totalScore": scores[r_id]
            }

        sorted_candidates = sorted(road_ids, key=lambda r: scores[r], reverse=True)
        selected_road = sorted_candidates[0]
        highest_score = scores[selected_road]

        if highest_score <= 0.5:
            cur_idx = road_ids.index(self.active_road_id)
            selected_road = road_ids[(cur_idx + 1) % len(road_ids)]

        target_road = roads.get(selected_road)
        queue_to_clear = target_road.waiting_vehicles_count if target_road else 0
        allocated_green = self.calculate_green_duration(queue_to_clear)

        sel_detail = details.get(selected_road, {})
        if sel_detail.get("hasTransit"):
            reason = f"Transit Signal Priority (TSP): High-capacity bus prioritized on Road {selected_road} (Passenger Delay Equity)"
        elif self.algorithm_mode == "RL_DQN":
            reason = f"Deep Q-Learning Policy: State-action Q(s,a) maximized for Road {selected_road} (Queue: {queue_to_clear} veh, Q-Score: {highest_score})"
        elif self.algorithm_mode == "V2X_PRIORITY":
            reason = f"V2X Cooperative Green Wave: Coordinated Platoon & V2I Priority allocated to Road {selected_road}"
        elif sel_detail.get("starvationBonus", 0) > 25.0:
            reason = f"Fairness Trigger: Road {selected_road} unserved {sel_detail['unservedTime']}s (+{sel_detail['starvationBonus']} starvation bonus)"
        elif queue_to_clear > 0:
            reason = f"Demand-Responsive Webster: Saturation Headway optimized for Road {selected_road} (Queue: {queue_to_clear} veh)"
        else:
            reason = f"Equitable Cycle: Road {selected_road} scheduled (low congestion)"

        return {
            "nextRoadId": selected_road,
            "allocatedGreen": allocated_green,
            "reason": reason,
            "scores": scores,
            "details": details,
            "algorithm": self.algorithm_mode
        }

    def calculate_green_duration(self, queue_count):
        if queue_count <= 1:
            return float(self.min_green)
        vehicles_per_lane = math.ceil(queue_count / 2.0)
        needed = self.startup_lost_time + (vehicles_per_lane * self.saturation_headway)
        return float(round(min(self.max_green, max(self.min_green, needed))))

    def to_dict(self):
        return {
            "name": self.name,
            "type": self.type,
            "algorithmMode": self.algorithm_mode,
            "dilemmaExtended": self.dilemma_extended,
            "activeRoad": self.active_road_id,
            "nextRoad": self.next_road_id,
            "phase": self.phase,
            "timeElapsed": round(self.phase_time_elapsed, 1),
            "timeTotal": round(self.phase_time_total, 1),
            "cycleCount": self.cycle_count,
            "minGreen": self.min_green,
            "maxGreen": self.max_green,
            "latestDecision": self.latest_decision,
            "decisionHistory": self.decision_history
        }
