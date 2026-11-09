"""
AI Adaptive Traffic Signal Digital Twin - Backend Configuration
Constants, dimensions, physics parameters, vehicle specifications, presets,
emergency sirens, accident triage, pedestrian crosswalks, multi-intersection,
and Indian Smart City economic ROI factors.
"""

import math

SIM_CONFIG = {
    # Physical Intersection Dimensions (world coordinate units / pixels)
    "ROAD_WIDTH": 140,            # 70px per direction (2 lanes * 35px)
    "LANE_WIDTH": 35,             # 35px per lane
    "LANES_PER_DIR": 2,           # 2 inbound, 2 outbound lanes
    "INTERSECTION_SIZE": 140,     # Central 140x140 conflict box
    "STOP_LINE_OFFSET": 75,       # Distance from center to stop line
    "SENSOR_LOOP_OFFSET": 130,    # Distance to inductive loop sensor
    "SENSOR_LOOP_LENGTH": 40,     # Sensor length
    "SPAWN_OFFSET": 480,          # Spawn distance from intersection center

    # Physics & Kinematics (Intelligent Driver Model - IDM)
    "MAX_SPEED": 110.0,           # Max free-flow speed (units/sec)
    "ACCELERATION": 85.0,         # Normal comfortable acceleration
    "DECELERATION": 110.0,        # Normal comfortable braking
    "HARD_BRAKING": 220.0,        # Emergency / stop-line braking
    "STANDSTILL_GAP": 12.0,       # Minimum bumper-to-bumper standstill gap
    "TIME_HEADWAY": 1.2,          # Desired safe time headway (seconds)

    # Signal Phases
    "SIGNAL_STATES": {
        "RED": "RED",
        "YELLOW": "YELLOW",
        "GREEN": "GREEN",
        "ALL_RED": "ALL_RED",
        "PEDESTRIAN_SCRAMBLE": "PEDESTRIAN_SCRAMBLE"
    },

    # Road Definitions
    "ROADS": {
        "NORTH": {"id": "A", "name": "Road A (North / College & School)", "dir": "N", "angle": math.pi / 2},
        "EAST":  {"id": "B", "name": "Road B (East / Arterial East)", "dir": "E", "angle": math.pi},
        "SOUTH": {"id": "C", "name": "Road C (South / City Center)", "dir": "S", "angle": -math.pi / 2},
        "WEST":  {"id": "D", "name": "Road D (West / Sector West)", "dir": "W", "angle": 0.0}
    },

    "CYCLE_ORDER": ["A", "B", "C", "D"],

    # Baseline Fixed-Time Controller Parameters
    "FIXED_TIME_DEFAULTS": {
        "greenDuration": {"A": 30.0, "B": 30.0, "C": 30.0, "D": 30.0},
        "yellowDuration": 3.5,
        "allRedDuration": 1.5
    },

    # AI Adaptive Controller Parameters
    "ADAPTIVE_AI_DEFAULTS": {
        "minGreen": 7.0,
        "maxGreen": 45.0,
        "yellowDuration": 3.5,
        "allRedDuration": 1.5,
        "saturationHeadway": 1.8, # Saturation discharge rate (sec/veh)
        "startupLostTime": 2.5,   # Green startup loss (sec)
        "gapOutThreshold": 2.2,   # Early green truncation gap (sec)
        "weights": {
            "queueLength": 1.2,
            "maxWaitTime": 1.5,
            "totalWaitTime": 0.6,
            "arrivalRate": 0.4,
            "starvationMultiplier": 2.0
        },
        "starvationThresholdSec": 35.0
    },

    # Vehicle Specifications & Probabilities
    "VEHICLE_TYPES": {
        "SEDAN": {
            "type": "SEDAN",
            "name": "Sedan",
            "length": 28,
            "width": 14,
            "maxSpeed": 115.0,
            "accel": 90.0,
            "decel": 120.0,
            "weight": 0.32,
            "colors": ["#38bdf8", "#0ea5e9", "#e2e8f0", "#94a3b8", "#3b82f6", "#475569"]
        },
        "SUV": {
            "type": "SUV",
            "name": "SUV",
            "length": 32,
            "width": 16,
            "maxSpeed": 105.0,
            "accel": 80.0,
            "decel": 110.0,
            "weight": 0.18,
            "colors": ["#059669", "#10b981", "#1e293b", "#64748b", "#0d9488"]
        },
        "AUTO_RICKSHAW": {
            "type": "AUTO_RICKSHAW",
            "name": "Auto Rickshaw (3-Wheeler)",
            "length": 22,
            "width": 13,
            "maxSpeed": 75.0,
            "accel": 65.0,
            "decel": 90.0,
            "weight": 0.18,
            "colors": ["#eab308"]
        },
        "BUS": {
            "type": "BUS",
            "name": "City Bus",
            "length": 52,
            "width": 17,
            "maxSpeed": 85.0,
            "accel": 55.0,
            "decel": 90.0,
            "weight": 0.10,
            "colors": ["#0284c7", "#f59e0b", "#d97706"]
        },
        "TRUCK": {
            "type": "TRUCK",
            "name": "Delivery Truck",
            "length": 44,
            "width": 17,
            "maxSpeed": 80.0,
            "accel": 50.0,
            "decel": 85.0,
            "weight": 0.08,
            "colors": ["#e11d48", "#be123c", "#cbd5e1"]
        },
        "SPORTS": {
            "type": "SPORTS",
            "name": "Sports Car",
            "length": 26,
            "width": 14,
            "maxSpeed": 135.0,
            "accel": 120.0,
            "decel": 140.0,
            "weight": 0.06,
            "colors": ["#ec4899", "#f43f5e", "#8b5cf6"]
        },
        "POLICE": {
            "type": "POLICE",
            "name": "Police Patrol / PCR Interceptor",
            "length": 34,
            "width": 16,
            "maxSpeed": 135.0,
            "accel": 115.0,
            "decel": 135.0,
            "weight": 0.03,
            "isEmergency": True,
            "emergencyType": "POLICE",
            "colors": ["#1e3a8a", "#ffffff"]
        },
        "AMBULANCE": {
            "type": "AMBULANCE",
            "name": "108 ALS Ambulance",
            "length": 36,
            "width": 16,
            "maxSpeed": 130.0,
            "accel": 110.0,
            "decel": 130.0,
            "weight": 0.025,
            "isEmergency": True,
            "emergencyType": "AMBULANCE",
            "colors": ["#ffffff", "#ef4444"]
        },
        "FIRE_ENGINE": {
            "type": "FIRE_ENGINE",
            "name": "Fire & Rescue Tender",
            "length": 46,
            "width": 18,
            "maxSpeed": 115.0,
            "accel": 95.0,
            "decel": 120.0,
            "weight": 0.025,
            "isEmergency": True,
            "emergencyType": "FIRE_ENGINE",
            "colors": ["#dc2626", "#b91c1c"]
        },
        "EMERGENCY": {
            "type": "AMBULANCE",
            "name": "108 ALS Ambulance",
            "length": 36,
            "width": 16,
            "maxSpeed": 130.0,
            "accel": 110.0,
            "decel": 130.0,
            "weight": 0.0,
            "isEmergency": True,
            "emergencyType": "AMBULANCE",
            "colors": ["#ffffff"]
        }
    },

    # Built-in Traffic Demand Presets (Arrival rates in veh/min)
    "PRESETS": {
        "LOW": {
            "name": "Low Traffic",
            "description": "Sparse traffic with minimal queues",
            "rates": {"A": 5.0, "B": 3.0, "C": 4.0, "D": 2.0}
        },
        "BALANCED": {
            "name": "Balanced Traffic",
            "description": "Equal medium density across all directions",
            "rates": {"A": 18.0, "B": 18.0, "C": 18.0, "D": 18.0}
        },
        "HEAVY": {
            "name": "Heavy Traffic",
            "description": "High congestion stress test on all approaches",
            "rates": {"A": 38.0, "B": 36.0, "C": 38.0, "D": 35.0}
        },
        "UNEVEN": {
            "name": "Uneven Traffic",
            "description": "Asymmetric distribution where Road A dominates",
            "rates": {"A": 50.0, "B": 10.0, "C": 5.0, "D": 20.0}
        },
        "RUSH_HOUR": {
            "name": "Rush Hour Dynamic",
            "description": "Dynamically shifts heavy flow across roads over time",
            "dynamic": True,
            "phases": [
                {"durationSec": 40.0, "label": "Phase 1: Morning Inbound (North heavy)", "rates": {"A": 52.0, "B": 8.0, "C": 6.0, "D": 14.0}},
                {"durationSec": 40.0, "label": "Phase 2: Commercial Cross-Flow (West & East heavy)", "rates": {"A": 12.0, "B": 48.0, "C": 10.0, "D": 44.0}},
                {"durationSec": 40.0, "label": "Phase 3: Evening Outbound (South heavy)", "rates": {"A": 8.0, "B": 14.0, "C": 54.0, "D": 16.0}},
                {"durationSec": 40.0, "label": "Phase 4: Mixed Evening Congestion", "rates": {"A": 32.0, "B": 36.0, "C": 28.0, "D": 34.0}}
            ]
        }
    },

    # Directional Acoustic & Visual Sirens on Corner Utility Poles
    "POLE_SIRENS": {
        "A": {"id": "POLE_NORTH", "roadId": "A", "name": "North Signal Pole (Road A)", "x": -85, "y": -90, "angle": math.pi / 2},
        "B": {"id": "POLE_EAST",  "roadId": "B", "name": "East Signal Pole (Road B)",  "x": 90,  "y": -85, "angle": math.pi},
        "C": {"id": "POLE_SOUTH", "roadId": "C", "name": "South Signal Pole (Road C)", "x": 85,  "y": 90,  "angle": -math.pi / 2},
        "D": {"id": "POLE_WEST",  "roadId": "D", "name": "West Signal Pole (Road D)",  "x": -90, "y": 85,  "angle": 0.0}
    },

    # Accident Severity Triage & Hospital CAD Dispatch System
    "ACCIDENT_SYSTEM": {
        "HOSPITAL_NAME": "City Multi-Specialty Trauma Care & Emergency Center",
        "HOSPITAL_PHONE": "+91 422 2570170",
        "EMERGENCY_DISPATCH_CODE": "108-DISPATCH-METRO",
        "GPS_LOCATION": {
            "lat": 11.0245,
            "lng": 76.9982,
            "address": "Main Arterial Corridor, Central Junction, Metro Smart City - 641001",
            "landmark": "Near College / School Campus & Medical Center"
        },
        "SEVERITY_THRESHOLDS": {
            "CRITICAL_MIN_SCORE": 50,
            "CRITICAL_MIN_GFORCE": 4.0,
            "CRITICAL_MIN_SPEED_KMH": 35.0
        }
    },

    # Public Safety & Crime Scene Computer Vision Triage (Police 100/112 CAD)
    "CRIME_SYSTEM": {
        "POLICE_STATION": "Central City Police & Cyber Traffic Control",
        "POLICE_PHONE": "112 / 100",
        "EMERGENCY_DISPATCH_CODE": "CAD-POLICE-112-METRO-PCR-4",
        "GPS_LOCATION": {
            "lat": 11.0245,
            "lng": 76.9982,
            "address": "Main Arterial Corridor, Central Junction, Metro Smart City - 641001",
            "sector": "Central Sector 4 Law & Order Beat"
        },
        "SEVERITY_THRESHOLDS": {
            "CRITICAL_MIN_THREAT_SCORE": 70,
            "CONFIDENCE_THRESHOLD": 0.85
        }
    },

    # Smart School Zone / Student Crossing Computer Vision Config
    "SCHOOL_ZONE_CONFIG": {
        "SCHOOL_NAME": "College / School Campus Crosswalk",
        "APPROACH_ROAD": "A",
        "SMALL_GROUP_MAX": 3,
        "SMALL_GROUP_CROSS_SEC": 8.0,
        "PLATOON_AGGREGATION_WINDOW_SEC": 4.0,
        "CONSOLIDATED_SCRAMBLE_SEC": 18.0
    },

    # Pedestrian & Vulnerable Road User (VRU) Crossing System
    "PEDESTRIAN_CONFIG": {
        "CROSSWALK_WIDTH": 22,
        "CROSSWALK_OFFSET": 72,
        "WALK_SPEED": 22.0, # pixels / second
        "SCRAMBLE_DURATION": 14.0,
        "MIN_CROWD_FOR_SCRAMBLE": 4
    },

    # Multi-Intersection Cooperative Arterial Corridor
    "MULTI_INTERSECTION": {
        "CORRIDOR_NAME": "Metropolitan Arterial Corridor (Smart City)",
        "SPEED_LIMIT_KMH": 45.0,
        "NODES": [
            {
                "id": "I-1",
                "name": "Upstream Feeder Junction",
                "role": "Upstream Feeder",
                "distance_meters": -650,
                "current_signal": "GREEN",
                "offset_sec": 14.0
            },
            {
                "id": "I-2",
                "name": "Central Junction (Digital Twin Main)",
                "role": "Hero Active Twin",
                "distance_meters": 0,
                "current_signal": "AI_ADAPTIVE",
                "offset_sec": 0.0
            },
            {
                "id": "I-3",
                "name": "Downstream Exit Junction",
                "role": "Downstream Exit",
                "distance_meters": 750,
                "current_signal": "GREEN",
                "offset_sec": 16.0
            }
        ]
    },

    # Indian Smart City Economic & Environmental ROI Impact Factors
    "ENVIRONMENTAL": {
        "IDLE_FUEL_LITER_PER_HOUR": 1.2,
        "IDLE_CO2_KG_PER_LITER": 2.31,
        "FUEL_PRICE_INR_PER_LITER": 102.50, # Metro Urban Petrol/Diesel avg in INR
        "COMMUTER_TIME_VALUE_INR_PER_HOUR": 150.00, # MoRTH / Indian Urban standard (₹/hr)
        "CARBON_OFFSET_INR_PER_KG": 2.50,
        "ANNUAL_SCALING_FACTOR": 365 * 14 # 14 active urban transit hours / day
    }
}
