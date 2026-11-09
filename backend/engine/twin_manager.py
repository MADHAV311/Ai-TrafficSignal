"""
AI Adaptive Traffic Signal Digital Twin - Twin Manager (Backend Service Layer)
Coordinates synchronized twin simulations (Fixed-Time vs AI Adaptive) with identical vehicle stream,
accident triage dispatch, directional pole sirens, pedestrian VRU scramble phases,
multi-intersection corridor coordination, and Indian Smart City economic ROI calculator.
"""

from .intersection_sim import IntersectionSim
from .traffic_generator import TrafficGenerator
from .controllers import FixedTimeController, AdaptiveAIController
from .accident_detector import AccidentDetector
from .crime_detector import CrimeDetector
from .multi_intersection import MultiIntersectionCorridor
from .config import SIM_CONFIG

class TwinManager:
    def __init__(self):
        self.fixed_controller = FixedTimeController()
        self.ai_controller = AdaptiveAIController()

        self.sim_fixed = IntersectionSim("SIM_FIXED", "Conventional Fixed-Time Signal", self.fixed_controller)
        self.sim_adaptive = IntersectionSim("SIM_ADAPTIVE", "AI Adaptive Traffic Signal", self.ai_controller)

        self.generator = TrafficGenerator(42)

        # Advanced Digital Twin Subsystems
        self.accident_detector = AccidentDetector()
        self.crime_detector = CrimeDetector()
        self.multi_intersection = MultiIntersectionCorridor()

        self.is_playing = True
        self.speed_multiplier = 1.0
        self.view_mode = "DUAL"
        self.weather_mode = "CLEAR" # "CLEAR" or "RAIN"
        self.situation_mode = "NORMAL"

        self.comparison_stats = {
            "waitTimeReductionPct": 0.0,
            "queueReductionPct": 0.0,
            "throughputGainPct": 0.0,
            "co2SavedKg": 0.0,
            "fuelSavedLiters": 0.0,
            "rupeesSaved": 0.0,
            "timeValueSavedInr": 0.0,
            "fuelValueSavedInr": 0.0,
            "annualRupeesSavedLakhs": 0.0,
            "dollarsSaved": 0.0,
            "cleanAirRating": "A+"
        }

    def reset(self):
        self.generator = TrafficGenerator(42)
        self.sim_fixed.reset()
        self.sim_adaptive.reset()
        self.accident_detector.clear_accident()
        self.situation_mode = "NORMAL"
        self.comparison_stats = {
            "waitTimeReductionPct": 0.0,
            "queueReductionPct": 0.0,
            "throughputGainPct": 0.0,
            "co2SavedKg": 0.0,
            "fuelSavedLiters": 0.0,
            "rupeesSaved": 0.0,
            "timeValueSavedInr": 0.0,
            "fuelValueSavedInr": 0.0,
            "annualRupeesSavedLakhs": 0.0,
            "dollarsSaved": 0.0,
            "cleanAirRating": "A+"
        }

    def update(self, raw_dt):
        if not self.is_playing:
            return

        dt = min(0.1, raw_dt * self.speed_multiplier)

        # 1. Generate shared vehicle arrivals
        new_specs = self.generator.update(dt, self.sim_adaptive.sim_time)
        for spec in new_specs:
            self.sim_fixed.spawn_vehicle(dict(spec))
            self.sim_adaptive.spawn_vehicle(dict(spec))

        # 2. Update Simulations
        self.sim_fixed.update(dt, self.generator.arrival_rates)
        self.sim_adaptive.update(dt, self.generator.arrival_rates)

        # 3. Update Incident & CAD progression
        self.accident_detector.update(dt)
        self.crime_detector.update(dt)
        self.sim_fixed.active_crime = self.crime_detector.active_crime
        self.sim_adaptive.active_crime = self.crime_detector.active_crime

        # 4. Update Multi-Intersection Corridor Synchronization
        is_em = any(p["active"] for p in self.sim_adaptive.directional_sirens.values())
        em_road = "B"
        for r_id, p in self.sim_adaptive.directional_sirens.items():
            if p["active"]:
                em_road = r_id
                break

        hero_state = self.sim_adaptive.roads["B"].signal_state
        hero_rem = self.sim_adaptive.roads["B"].remaining_in_phase
        self.multi_intersection.update(dt, hero_state, hero_rem, is_em, em_road)

        # 5. Calculate Real-Time Deltas & Indian Economic ROI
        self._calculate_deltas()

    def step(self):
        step_dt = 0.05
        new_specs = self.generator.update(step_dt, self.sim_adaptive.sim_time)
        for spec in new_specs:
            self.sim_fixed.spawn_vehicle(dict(spec))
            self.sim_adaptive.spawn_vehicle(dict(spec))

        self.sim_fixed.update(step_dt, self.generator.arrival_rates)
        self.sim_adaptive.update(step_dt, self.generator.arrival_rates)
        self.accident_detector.update(step_dt)
        self._calculate_deltas()

    def _calculate_deltas(self):
        fixed_wait = self.sim_fixed.avg_wait_time
        ai_wait = self.sim_adaptive.avg_wait_time
        wait_reduction = 0.0
        if fixed_wait > 0.5:
            wait_reduction = round(((fixed_wait - ai_wait) / fixed_wait) * 100.0, 1)

        fixed_q = self.sim_fixed.current_total_queue
        ai_q = self.sim_adaptive.current_total_queue
        q_reduction = 0.0
        if fixed_q > 0:
            q_reduction = round(((fixed_q - ai_q) / fixed_q) * 100.0, 1)

        fixed_tp = self.sim_fixed.total_passed
        ai_tp = self.sim_adaptive.total_passed
        tp_gain = 0.0
        if fixed_tp > 5:
            tp_gain = round(((ai_tp - fixed_tp) / fixed_tp) * 100.0, 1)

        fuel_saved = max(0.0, round(self.sim_fixed.fuel_wasted_liters - self.sim_adaptive.fuel_wasted_liters, 2))
        co2_saved = max(0.0, round(self.sim_fixed.co2_emissions_kg - self.sim_adaptive.co2_emissions_kg, 2))

        # Real-World Indian Urban Economic Impact (₹ INR)
        # Fuel: ₹102.50 / Liter, Commuter Delay Value: ₹150.00 / hour
        delay_saved_hours = max(0.0, (self.sim_fixed.total_wait_time - self.sim_adaptive.total_wait_time) / 3600.0)
        time_value_saved_inr = round(delay_saved_hours * SIM_CONFIG["ENVIRONMENTAL"]["COMMUTER_TIME_VALUE_INR_PER_HOUR"], 2)
        fuel_value_saved_inr = round(fuel_saved * SIM_CONFIG["ENVIRONMENTAL"]["FUEL_PRICE_INR_PER_LITER"], 2)
        rupees_saved = round(time_value_saved_inr + fuel_value_saved_inr, 2)

        # Annualized Smart City Projection (₹ in Lakhs)
        # Scaling factor: 365 days * 14 peak hours / day
        annual_factor = (365 * 14 * 3600) / max(1.0, self.sim_adaptive.sim_time)
        annual_rupees = (rupees_saved / max(1.0, self.sim_adaptive.sim_time)) * (365 * 14 * 3600)
        annual_rupees_lakhs = round(annual_rupees / 100000.0, 2)

        dollars_saved = round(rupees_saved / 84.0, 2)
        rating = "A+" if wait_reduction > 25.0 or co2_saved > 0.3 else ("A" if wait_reduction > 12.0 else ("B" if wait_reduction > 0 else "C"))

        self.comparison_stats = {
            "waitTimeReductionPct": wait_reduction,
            "queueReductionPct": q_reduction,
            "throughputGainPct": tp_gain,
            "co2SavedKg": co2_saved,
            "fuelSavedLiters": fuel_saved,
            "rupeesSaved": rupees_saved,
            "timeValueSavedInr": time_value_saved_inr,
            "fuelValueSavedInr": fuel_value_saved_inr,
            "annualRupeesSavedLakhs": annual_rupees_lakhs,
            "dollarsSaved": dollars_saved,
            "cleanAirRating": rating
        }

    def spawn_manual_vehicle(self, road_id, type_key="SEDAN"):
        spec = self.generator.generate_vehicle_spec(road_id, self.sim_adaptive.sim_time, forced_type=type_key)
        self.sim_fixed.spawn_vehicle(dict(spec))
        self.sim_adaptive.spawn_vehicle(dict(spec))

    def spawn_emergency_vehicle(self, road_id="A", emergency_type="AMBULANCE"):
        """
        Spawns emergency vehicle (AMBULANCE, FIRE_ENGINE, or POLICE) on specified road.
        Activates directional pole sirens and green carpet priority.
        """
        if emergency_type == "FIRE_ENGINE":
            veh_type = "FIRE_ENGINE"
        elif emergency_type == "POLICE":
            veh_type = "POLICE"
        else:
            veh_type = "AMBULANCE"
        spec = self.generator.generate_vehicle_spec(road_id, self.sim_adaptive.sim_time, forced_type=veh_type, forced_lane=1)
        self.sim_fixed.spawn_vehicle(dict(spec))
        self.sim_adaptive.spawn_vehicle(dict(spec))

    def trigger_accident(self, severity_type="CRITICAL", road_id="C"):
        """
        Triggers collision with sub-second AI severity triage:
        - CRITICAL: Auto-dials 108 CAD call to Trauma Care Hospital with GPS
        - MINOR: Decides NOT to call hospital, logs advisory and flushes lane
        """
        res = self.accident_detector.trigger_accident(severity_type=severity_type, road_id=road_id)
        self.sim_fixed.active_accident = res
        self.sim_adaptive.active_accident = res
        return res

    def clear_accident(self):
        self.accident_detector.clear_accident()
        self.sim_fixed.active_accident = None
        self.sim_adaptive.active_accident = None

    def trigger_crime(self, threat_type="CRITICAL", road_id="B"):
        """
        Triggers crime / public safety incident with sub-second AI threat triage:
        - CRITICAL: Auto-dials Police 100/112 CAD call to Central City Police Station with GPS
        - MINOR: Non-violent dispute / vendor tool -> Police call SUPPRESSED to save dispatch bandwidth
        """
        res = self.crime_detector.trigger_crime(threat_type=threat_type, road_id=road_id)
        self.sim_fixed.active_crime = res
        self.sim_adaptive.active_crime = res
        return res

    def clear_crime(self):
        self.crime_detector.clear_crime()
        self.sim_fixed.active_crime = None
        self.sim_adaptive.active_crime = None

    def trigger_school_zone(self, scenario="SMALL_GROUP"):
        """
        Triggers Smart School Zone student crossing dynamic logic:
        - SMALL_GROUP: 2 students waiting, 0 inflow -> Immediate Red signal for cars, quick 8s walk
        - PLATOON_INFLOW: 10 students waiting + 6 approaching behind -> Hold car green for 4s aggregation window, then 18s consolidated scramble
        """
        self.sim_adaptive.pedestrian_manager.trigger_school_zone(scenario)
        self.sim_fixed.pedestrian_manager.trigger_school_zone(scenario)
        return self.sim_adaptive.pedestrian_manager.to_dict()["schoolZone"]

    def clear_school_zone(self):
        self.sim_adaptive.pedestrian_manager.clear_school_zone()
        self.sim_fixed.pedestrian_manager.clear_school_zone()

    def press_pedestrian_button(self, road_id="A"):
        """Triggers pedestrian walk demand call."""
        self.sim_adaptive.pedestrian_manager.press_demand_button(road_id)
        self.sim_fixed.pedestrian_manager.press_demand_button(road_id)

    def trigger_pedestrian_surge(self):
        """Triggers crowd surge & Barnes Dance scramble phase."""
        self.sim_adaptive.pedestrian_manager.trigger_crowd_surge()
        self.sim_fixed.pedestrian_manager.trigger_crowd_surge()
        self.sim_adaptive.pedestrian_manager.activate_scramble()
        self.sim_fixed.pedestrian_manager.activate_scramble()

    def apply_situation_mode(self, mode_key):
        """
        Preset situation modes to demonstrate every scenario to the jury:
        - NORMAL: Standard balanced flow
        - AMBULANCE: Directional North Pole Siren + Green Carpet preemption (Never stops)
        - FIRE_ENGINE: Directional East Pole Siren + Fire Engine preemption (Never stops)
        - SEVERE_ACCIDENT: Severe crash -> AI Triage CRITICAL -> Auto 108 CAD call to Trauma Center + GPS + Pole Sirens
        - MINOR_ACCIDENT: Minor scrape -> AI Triage MINOR -> NO hospital call -> Lane flush
        - CRIME_CRITICAL: Weapon / harsh violent assault detected -> Auto Police 112 CAD Call + GPS + Police Strobes
        - CRIME_MINOR: Verbal dispute / street vendor tool -> Police 112 Call Suppressed (False alarm protection)
        - SCHOOL_SMALL_GROUP: School crosswalk: 2 students waiting, 0 inflow -> Immediate Red & quick walk
        - SCHOOL_PLATOON_INFLOW: School crosswalk: 10 students + 6 incoming -> 4s aggregation window -> 18s scramble
        - PEDESTRIAN_SCRAMBLE: Crowd surge -> All-Pedestrian Barnes Dance Scramble Phase
        - MULTI_INTERSECTION: Metropolitan Arterial Corridor Green Wave
        """
        self.situation_mode = mode_key

        if mode_key == "NORMAL":
            self.accident_detector.clear_accident()
            self.clear_crime()
            self.clear_school_zone()
            self.generator.apply_preset("BALANCED")

        elif mode_key == "AMBULANCE":
            self.accident_detector.clear_accident()
            self.clear_crime()
            self.clear_school_zone()
            self.spawn_emergency_vehicle("A", "AMBULANCE")

        elif mode_key == "FIRE_ENGINE":
            self.accident_detector.clear_accident()
            self.clear_crime()
            self.clear_school_zone()
            self.spawn_emergency_vehicle("B", "FIRE_ENGINE")

        elif mode_key == "SEVERE_ACCIDENT":
            self.clear_crime()
            self.clear_school_zone()
            self.trigger_accident("CRITICAL", "C")

        elif mode_key == "MINOR_ACCIDENT":
            self.clear_crime()
            self.clear_school_zone()
            self.trigger_accident("MINOR", "D")

        elif mode_key == "CRIME_CRITICAL":
            self.accident_detector.clear_accident()
            self.clear_school_zone()
            self.trigger_crime("CRITICAL", "B")

        elif mode_key == "CRIME_MINOR":
            self.accident_detector.clear_accident()
            self.clear_school_zone()
            self.trigger_crime("MINOR", "B")

        elif mode_key == "SCHOOL_SMALL_GROUP":
            self.accident_detector.clear_accident()
            self.clear_crime()
            self.trigger_school_zone("SMALL_GROUP")

        elif mode_key == "SCHOOL_PLATOON_INFLOW":
            self.accident_detector.clear_accident()
            self.clear_crime()
            self.trigger_school_zone("PLATOON_INFLOW")

        elif mode_key == "PEDESTRIAN_SCRAMBLE":
            self.accident_detector.clear_accident()
            self.clear_crime()
            self.clear_school_zone()
            self.trigger_pedestrian_surge()

        elif mode_key == "MULTI_INTERSECTION":
            self.accident_detector.clear_accident()
            self.clear_crime()
            self.clear_school_zone()
            self.generator.apply_preset("HEAVY")

        return {"success": True, "situationMode": mode_key}

    def set_ai_algorithm(self, algo_key):
        if algo_key in ("WEBSTER", "RL_DQN", "V2X_PRIORITY"):
            self.ai_controller.algorithm_mode = algo_key
            return True
        return False

    def set_weather(self, weather_key):
        if weather_key in ("CLEAR", "RAIN"):
            self.weather_mode = weather_key
            return True
        return False

    def get_state(self):
        return {
            "isPlaying": self.is_playing,
            "speed": self.speed_multiplier,
            "viewMode": self.view_mode,
            "weatherMode": self.weather_mode,
            "situationMode": self.situation_mode,
            "aiAlgorithm": self.ai_controller.algorithm_mode,
            "currentPreset": self.generator.current_preset_key,
            "rushHourPhase": self.generator.rush_hour_phase_index,
            "arrivalRates": self.generator.arrival_rates,
            "comparisonStats": self.comparison_stats,
            "accidentState": self.accident_detector.to_dict(),
            "crimeState": self.crime_detector.to_dict(),
            "multiIntersection": self.multi_intersection.to_dict(),
            "simFixed": self.sim_fixed.to_dict(),
            "simAdaptive": self.sim_adaptive.to_dict()
        }
