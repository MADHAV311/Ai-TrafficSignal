/**
 * AI Adaptive Traffic Signal Digital Twin - Simplified Dashboard UI Controller
 * Focused on the hero intersection, clear live metrics, transparent AI decisions, and genuine comparison language.
 */

import { SIM_CONFIG } from '../config.js';
import { AudioEffects } from './AudioEffects.js';

export class DashboardUI {
  constructor(apiClient, chartRenderer, renderer = null) {
    this.api = apiClient;
    this.chartRenderer = chartRenderer;
    this.renderer = renderer;
    this.audioEffects = new AudioEffects();

    this.isPlaying = true;
    this.speedMultiplier = 1.0;
    this.heroMode = 'AI'; // 'AI' or 'FIXED'
    this.weather = 'CLEAR';
    this.prevAiPhase = null;
    this.inspectedVehicleId = null;

    // Dismissal states for floating monitor cards
    this.accidentCardDismissed = false;
    this.crimeCardDismissed = false;
    this.schoolCardDismissed = false;

    this.cacheElements();
    this.bindEvents();
  }

  cacheElements() {
    // Navigation Tabs & Views
    this.navBtns = document.querySelectorAll('.nav-tab-btn');
    this.views = document.querySelectorAll('.view-section');

    // Header Controls
    this.selectPreset = document.getElementById('select-preset');
    this.btnPlayPause = document.getElementById('btn-play-pause');
    this.btnReset = document.getElementById('btn-reset');
    this.selectSpeed = document.getElementById('select-speed');
    this.btnToggleHeroMode = document.getElementById('btn-toggle-hero-mode');
    this.labelActiveControllerName = document.getElementById('label-active-controller-name');

    // Sound Controls
    this.btnToggleSound = document.getElementById('btn-toggle-sound');
    this.soundIcon = document.getElementById('sound-icon');
    this.soundText = document.getElementById('sound-text');

    // Perception HUD Elements
    this.btnVisionRealistic = document.getElementById('btn-vision-realistic');
    this.btnVisionAi = document.getElementById('btn-vision-ai');
    this.btnVisionThermal = document.getElementById('btn-vision-thermal');
    this.btnToggleWeather = document.getElementById('btn-toggle-weather');
    this.btnVisionSchoolMap = document.getElementById('btn-vision-school-map');

    // Incident & Priority Stress Buttons
    this.btnInjectAmbulance = document.getElementById('btn-inject-ambulance');
    this.btnInjectFire = document.getElementById('btn-inject-fire');
    this.btnTriggerAccidentCrit = document.getElementById('btn-trigger-accident-crit');
    this.btnTriggerAccidentMin = document.getElementById('btn-trigger-accident-min');
    this.btnPedSurge = document.getElementById('btn-ped-surge');
    this.btnInjectBus = document.getElementById('btn-inject-bus');
    this.btnInjectSurge = document.getElementById('btn-inject-surge');

    // Situation Mode Buttons
    this.situationBtns = document.querySelectorAll('.situation-btn');

    // Directional Pole Sirens HUD Elements
    this.poleElements = {
      A: { card: document.getElementById('pole-card-a'), ind: document.getElementById('pole-ind-a'), stat: document.getElementById('pole-stat-a') },
      B: { card: document.getElementById('pole-card-b'), ind: document.getElementById('pole-ind-b'), stat: document.getElementById('pole-stat-b') },
      C: { card: document.getElementById('pole-card-c'), ind: document.getElementById('pole-ind-c'), stat: document.getElementById('pole-stat-c') },
      D: { card: document.getElementById('pole-card-d'), ind: document.getElementById('pole-ind-d'), stat: document.getElementById('pole-stat-d') }
    };

    // Accident Severity Triage & 108 CAD Card Elements
    this.accidentCadCard = document.getElementById('accident-cad-card');
    this.btnCloseAccident = document.getElementById('btn-close-accident');
    this.btnCadClear = document.getElementById('btn-cad-clear');
    this.cadStatusPulse = document.getElementById('cad-status-pulse');
    this.cadIncidentId = document.getElementById('cad-incident-id');
    this.cadVerdictBanner = document.getElementById('cad-verdict-banner');
    this.cadVerdictIcon = document.getElementById('cad-verdict-icon');
    this.cadVerdictText = document.getElementById('cad-verdict-text');
    this.cadReasonText = document.getElementById('cad-reason-text');
    this.cadSensorSpeed = document.getElementById('cad-sensor-speed');
    this.cadSensorGforce = document.getElementById('cad-sensor-gforce');
    this.cadSensorAirbags = document.getElementById('cad-sensor-airbags');
    this.cadSensorIntrusion = document.getElementById('cad-sensor-intrusion');
    this.cadSensorCasualties = document.getElementById('cad-sensor-casualties');
    this.cadSensorAcoustic = document.getElementById('cad-sensor-acoustic');
    this.cadHospitalSection = document.getElementById('cad-hospital-section');
    this.cadHospitalName = document.getElementById('cad-hospital-name');
    this.cadHospitalGps = document.getElementById('cad-hospital-gps');
    this.cadHospitalPhone = document.getElementById('cad-hospital-phone');
    this.cadLiveStatus = document.getElementById('cad-live-status');
    this.cadAudioText = document.getElementById('cad-audio-text');

    // Crime Scene Public Safety & 112 CAD Card Elements
    this.crimeCadCard = document.getElementById('crime-cad-card');
    this.btnCloseCrime = document.getElementById('btn-close-crime');
    this.btnCrimeClear = document.getElementById('btn-crime-clear');
    this.crimeStatusPulse = document.getElementById('crime-status-pulse');
    this.crimeIncidentId = document.getElementById('crime-incident-id');
    this.crimeVerdictBanner = document.getElementById('crime-verdict-banner');
    this.crimeVerdictIcon = document.getElementById('crime-verdict-icon');
    this.crimeVerdictText = document.getElementById('crime-verdict-text');
    this.crimeReasonText = document.getElementById('crime-reason-text');
    this.crimeSensorWeapon = document.getElementById('crime-sensor-weapon');
    this.crimeSensorBehavior = document.getElementById('crime-sensor-behavior');
    this.crimeSensorScore = document.getElementById('crime-sensor-score');
    this.crimeSensorAcoustic = document.getElementById('crime-sensor-acoustic');
    this.crimeSensorTracking = document.getElementById('crime-sensor-tracking');
    this.crimeSensorLatency = document.getElementById('crime-sensor-latency');
    this.crimePoliceSection = document.getElementById('crime-police-section');
    this.crimePoliceStation = document.getElementById('crime-police-station');
    this.crimePoliceGps = document.getElementById('crime-police-gps');
    this.crimePolicePhone = document.getElementById('crime-police-phone');
    this.crimeLiveStatus = document.getElementById('crime-live-status');
    this.crimeAudioText = document.getElementById('crime-audio-text');

    // Smart School Zone CV Monitor Elements
    this.schoolCvCard = document.getElementById('school-cv-card');
    this.btnCloseSchool = document.getElementById('btn-close-school');
    this.btnSchoolClear = document.getElementById('btn-school-clear');
    this.schoolVerdictIcon = document.getElementById('school-verdict-icon');
    this.schoolVerdictText = document.getElementById('school-verdict-text');
    this.schoolReasonText = document.getElementById('school-reason-text');
    this.schoolCurbCount = document.getElementById('school-curb-count');
    this.schoolInflowCount = document.getElementById('school-inflow-count');
    this.schoolCvConfidence = document.getElementById('school-cv-confidence');
    this.schoolAggregationTimer = document.getElementById('school-aggregation-timer');
    this.schoolWalkWindow = document.getElementById('school-walk-window');

    // Metropolitan Arterial Corridor Sync Elements
    this.corridorCoordinationBadge = document.getElementById('corridor-coordination-badge');
    this.node1Signal = document.getElementById('node-1-signal');
    this.node1Platoon = document.getElementById('node-1-platoon');
    this.node2Signal = document.getElementById('node-2-signal');
    this.node3Signal = document.getElementById('node-3-signal');
    this.node3Platoon = document.getElementById('node-3-platoon');

    // Pedestrian VRU Crosswalk Elements
    this.pedCallBtns = document.querySelectorAll('.ped-call-btn');
    this.btnPedSurgeSide = document.getElementById('btn-ped-surge-side');
    this.pedScrambleStatusTag = document.getElementById('ped-scramble-status-tag');
    this.pedWaitingCount = document.getElementById('ped-waiting-count');
    this.pedCrossingCount = document.getElementById('ped-crossing-count');
    this.pedTimerVal = document.getElementById('ped-timer-val');

    // AI Model Architecture Elements
    this.selectAiAlgorithm = document.getElementById('select-ai-algorithm');
    this.aiFormulaDisplay = document.getElementById('ai-formula-display');

    // Indian Smart City ESG & Economic Sustainability Elements
    this.statEsgCai = document.getElementById('stat-esg-cai');
    this.statEsgCo2 = document.getElementById('stat-esg-co2');
    this.statEsgFuel = document.getElementById('stat-esg-fuel');
    this.statEsgSavings = document.getElementById('stat-esg-savings');
    this.statEsgSavingsInr = document.getElementById('stat-esg-savings-inr');
    this.statEsgAnnualLakhs = document.getElementById('stat-esg-annual-lakhs');
    this.statEsgTimeValue = document.getElementById('stat-esg-time-value');
    this.statEsgFuelValue = document.getElementById('stat-esg-fuel-value');
    this.statEsgDelayCut = document.getElementById('stat-esg-delay-cut');

    // Vehicle Telemetry Inspector Elements
    this.telemetryContainer = document.getElementById('telemetry-container');
    this.telemetryBadge = document.getElementById('telemetry-badge');

    // Hero Road HUD Elements
    this.hudElements = {
      A: {
        signal: document.getElementById('hud-signal-a'),
        waitCount: document.getElementById('hud-wait-count-a'),
        avgWait: document.getElementById('hud-avg-wait-a')
      },
      B: {
        signal: document.getElementById('hud-signal-b'),
        waitCount: document.getElementById('hud-wait-count-b'),
        avgWait: document.getElementById('hud-avg-wait-b')
      },
      C: {
        signal: document.getElementById('hud-signal-c'),
        waitCount: document.getElementById('hud-wait-count-c'),
        avgWait: document.getElementById('hud-avg-wait-c')
      },
      D: {
        signal: document.getElementById('hud-signal-d'),
        waitCount: document.getElementById('hud-wait-count-d'),
        avgWait: document.getElementById('hud-avg-wait-d')
      }
    };

    // Live Metrics Elements
    this.statAvgWait = document.getElementById('stat-avg-wait');
    this.statQueueLength = document.getElementById('stat-queue-length');
    this.statClearedCount = document.getElementById('stat-cleared-count');
    this.statThroughput = document.getElementById('stat-throughput');

    // AI Decision Panel Elements
    this.aiActivePhaseTag = document.getElementById('ai-active-phase-tag');
    this.aiSelectedRoad = document.getElementById('ai-selected-road');
    this.aiRoadQueue = document.getElementById('ai-road-queue');
    this.aiRoadWait = document.getElementById('ai-road-wait');
    this.aiRoadPriority = document.getElementById('ai-road-priority');
    this.aiGreenDuration = document.getElementById('ai-green-duration');
    this.aiDecisionReason = document.getElementById('ai-decision-reason');

    // Live Comparison Callout
    this.calloutWaitHeadline = document.getElementById('callout-wait-headline');
    this.calloutWaitDetail = document.getElementById('callout-wait-detail');
    this.calloutQueueDetail = document.getElementById('callout-queue-detail');

    // Comparison View Table Elements
    this.compFixedWait = document.getElementById('comp-fixed-wait');
    this.compAiWait = document.getElementById('comp-ai-wait');
    this.compDiffWait = document.getElementById('comp-diff-wait');

    this.compFixedQueue = document.getElementById('comp-fixed-queue');
    this.compAiQueue = document.getElementById('comp-ai-queue');
    this.compDiffQueue = document.getElementById('comp-diff-queue');

    this.compFixedThroughput = document.getElementById('comp-fixed-throughput');
    this.compAiThroughput = document.getElementById('comp-ai-throughput');
    this.compDiffThroughput = document.getElementById('comp-diff-throughput');

    this.compFixedMaxQueue = document.getElementById('comp-fixed-max-queue');
    this.compAiMaxQueue = document.getElementById('comp-ai-max-queue');
    this.compDiffMaxQueue = document.getElementById('comp-diff-max-queue');

    this.chartWaitTime = document.getElementById('chart-wait-time');
    this.chartQueue = document.getElementById('chart-queue');
    this.btnExportCsv = document.getElementById('btn-export-csv');

    // Experiments View Elements
    this.btnRunBenchmark = document.getElementById('btn-run-benchmark');
    this.expResultsContainer = document.getElementById('experiments-results-container');

    // Settings Sliders
    this.settingSliderRateA = document.getElementById('setting-slider-rate-a');
    this.settingSliderRateB = document.getElementById('setting-slider-rate-b');
    this.settingSliderRateC = document.getElementById('setting-slider-rate-c');
    this.settingSliderRateD = document.getElementById('setting-slider-rate-d');
    this.settingValRateA = document.getElementById('setting-val-rate-a');
    this.settingValRateB = document.getElementById('setting-val-rate-b');
    this.settingValRateC = document.getElementById('setting-val-rate-c');
    this.settingValRateD = document.getElementById('setting-val-rate-d');

    this.settingSliderFixedGreen = document.getElementById('setting-slider-fixed-green');
    this.settingValFixedGreen = document.getElementById('setting-val-fixed-green');
    this.settingSliderMinGreen = document.getElementById('setting-slider-min-green');
    this.settingValMinGreen = document.getElementById('setting-val-min-green');
    this.settingSliderMaxGreen = document.getElementById('setting-slider-max-green');
    this.settingValMaxGreen = document.getElementById('setting-val-max-green');

    // Vehicle Tooltip
    this.vehicleTooltip = document.getElementById('vehicle-inspector-tooltip');
  }

  bindEvents() {
    // Navigation Tabs
    this.navBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.navBtns.forEach(b => b.classList.remove('active'));
        this.views.forEach(v => v.classList.remove('active'));
        btn.classList.add('active');

        const targetView = document.getElementById(`view-${btn.dataset.view}`);
        if (targetView) targetView.classList.add('active');
        window.dispatchEvent(new Event('resize'));
      });
    });

    // Check initial URL hash for direct tab navigation
    if (window.location.hash) {
      const hashView = window.location.hash.replace('#', '');
      const matchedBtn = Array.from(this.navBtns).find(b => b.dataset.view === hashView);
      if (matchedBtn) {
        setTimeout(() => matchedBtn.click(), 100);
      }
    }

    // Playback Controls
    this.btnPlayPause.addEventListener('click', async () => {
      this.isPlaying = !this.isPlaying;
      this.updatePlayPauseBtn();
      await this.api.sendControl(this.isPlaying ? 'play' : 'pause');
    });

    this.btnReset.addEventListener('click', async () => {
      await this.api.sendControl('reset');
      this.showToast('Simulation reset');
    });

    this.selectSpeed.addEventListener('change', async (e) => {
      const speed = parseFloat(e.target.value);
      this.speedMultiplier = speed;
      await this.api.sendControl('speed', { speed });
    });

    // Preset Selection
    this.selectPreset.addEventListener('change', async (e) => {
      const presetKey = e.target.value;
      const res = await this.api.setPreset(presetKey);
      if (res && res.rates) {
        this.updateSettingsSliderDisplays(res.rates);
      }
      this.showToast(`Active Scenario: ${SIM_CONFIG.PRESETS[presetKey].name}`);
    });

    // Hero Mode Toggle (AI Adaptive vs Fixed-Time on main screen)
    this.btnToggleHeroMode.addEventListener('click', () => {
      this.heroMode = (this.heroMode === 'AI') ? 'FIXED' : 'AI';
      if (this.heroMode === 'AI') {
        this.btnToggleHeroMode.textContent = '🟢 AI Adaptive Signal';
        this.btnToggleHeroMode.className = 'mode-toggle-btn active-ai';
        if (this.labelActiveControllerName) {
          this.labelActiveControllerName.textContent = 'AI Adaptive';
          this.labelActiveControllerName.style.color = 'var(--color-purple)';
        }
      } else {
        this.btnToggleHeroMode.textContent = '🔵 Fixed-Time Baseline';
        this.btnToggleHeroMode.className = 'mode-toggle-btn active-fixed';
        if (this.labelActiveControllerName) {
          this.labelActiveControllerName.textContent = 'Fixed-Time';
          this.labelActiveControllerName.style.color = 'var(--color-blue)';
        }
      }
      window.dispatchEvent(new Event('resize'));
    });

    // Sound Synthesizer Toggle
    if (this.btnToggleSound) {
      this.btnToggleSound.addEventListener('click', () => {
        const isSoundOn = this.audioEffects.toggle();
        if (isSoundOn) {
          this.btnToggleSound.classList.add('sound-on');
          if (this.soundIcon) this.soundIcon.textContent = '🔊';
          if (this.soundText) this.soundText.textContent = 'Sound: ON';
          this.showToast('Audio Synthesizer: ON (Procedural)');
        } else {
          this.btnToggleSound.classList.remove('sound-on');
          if (this.soundIcon) this.soundIcon.textContent = '🔇';
          if (this.soundText) this.soundText.textContent = 'Sound: OFF';
          this.showToast('Audio Synthesizer: OFF');
        }
      });
    }

    // Perception HUD Vision Modes
    const visionButtons = [
      { btn: this.btnVisionRealistic, mode: 'REALISTIC', label: '📷 Realistic 2D Surface' },
      { btn: this.btnVisionAi, mode: 'AI_VISION', label: '🤖 AI Vision HUD: Bounding Brackets, Pavement Loops & Safety Zone' },
      { btn: this.btnVisionThermal, mode: 'THERMAL_ESG', label: '🔥 Thermal Emissions Heatmap & Slipstream HUD' }
    ];

    visionButtons.forEach(({ btn, mode, label }) => {
      if (!btn) return;
      btn.addEventListener('click', () => {
        visionButtons.forEach(b => b.btn && b.btn.classList.remove('active'));
        btn.classList.add('active');
        if (this.renderer) {
          this.renderer.setVisionMode(mode);
        }
        this.showToast(label);
      });
    });

    // 3D Perspective & Orbit View Controls
    const btn3d = document.getElementById('btn-view-3d');
    const btnOrbit = document.getElementById('btn-view-orbit');
    const btnStreet = document.getElementById('btn-view-street');
    const btn2d = document.getElementById('btn-view-2d');

    const cameraButtons = [
      { btn: btn3d, mode: '3D_PERSPECTIVE', toast: '📐 3D Perspective Isometric View' },
      { btn: btnOrbit, mode: '3D_ORBIT', toast: '🎥 360° Cinematic Drone Orbit' },
      { btn: btnStreet, mode: '3D_STREET', toast: '🚦 Low-Angle Street Level View' },
      { btn: btn2d, mode: '2D_PLAN', toast: '🗺️ 2D Overhead Plan View' }
    ];

    cameraButtons.forEach(({ btn, mode, toast }) => {
      if (!btn) return;
      btn.addEventListener('click', () => {
        cameraButtons.forEach(b => b.btn && b.btn.classList.remove('active'));
        btn.classList.add('active');
        if (this.renderer) {
          this.renderer.setCameraMode(mode);
        }
        this.showToast(toast);
      });
    });

    // School Campus Map View Toggle
    if (this.btnVisionSchoolMap) {
      this.btnVisionSchoolMap.addEventListener('click', (e) => {
        if (e) {
          e.stopPropagation();
          e.preventDefault();
        }
        if (this.renderer) {
          const active = this.renderer.toggleSchoolMap();
          if (active) {
            this.btnVisionSchoolMap.classList.add('active');
            this.showToast('🏫 Switched to College / School Campus Map View');
          } else {
            this.btnVisionSchoolMap.classList.remove('active');
            this.showToast('🚦 Switched to Standard Intersection View');
          }
        }
      });
    }

    // Weather Simulation Toggle
    if (this.btnToggleWeather) {
      this.btnToggleWeather.addEventListener('click', async () => {
        this.weather = (this.weather === 'CLEAR') ? 'RAIN' : 'CLEAR';
        if (this.weather === 'RAIN') {
          this.btnToggleWeather.textContent = '🌧️ Rain';
          this.btnToggleWeather.classList.add('rain');
          this.showToast('Weather: Wet Surface & Decreased Tire Adhesion Physics');
        } else {
          this.btnToggleWeather.textContent = '☀️ Clear';
          this.btnToggleWeather.classList.remove('rain');
          this.showToast('Weather: Clear Dry Conditions');
        }
        if (this.renderer) {
          this.renderer.setWeatherMode(this.weather);
        }
        await this.api.setWeather(this.weather);
      });
    }

    // Situation Mode Buttons (For Jury Presentation Showcase)
    if (this.situationBtns) {
      this.situationBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
          const mode = btn.dataset.mode;
          this.situationBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');

          // Reset dismissals and sync renderer views based on mode
          if (mode === 'SCHOOL_SMALL_GROUP' || mode === 'SCHOOL_PLATOON_INFLOW') {
            this.schoolCardDismissed = false;
            if (this.renderer) {
              this.renderer.setSituationMode(mode);
              this.renderer.toggleSchoolMap(true);
            }
            if (this.btnVisionSchoolMap) this.btnVisionSchoolMap.classList.add('active');
          } else if (mode === 'CRIME_CRITICAL' || mode === 'CRIME_MINOR') {
            this.crimeCardDismissed = false;
            if (this.renderer) {
              this.renderer.setSituationMode(mode);
              this.renderer.toggleSchoolMap(false);
            }
            if (this.btnVisionSchoolMap) this.btnVisionSchoolMap.classList.remove('active');
          } else if (mode === 'SEVERE_ACCIDENT' || mode === 'MINOR_ACCIDENT') {
            this.accidentCardDismissed = false;
            if (this.renderer) {
              this.renderer.setSituationMode(mode);
              this.renderer.toggleSchoolMap(false);
            }
            if (this.btnVisionSchoolMap) this.btnVisionSchoolMap.classList.remove('active');
          } else {
            if (this.renderer) {
              this.renderer.setSituationMode(mode);
              this.renderer.toggleSchoolMap(false);
            }
            if (this.btnVisionSchoolMap) this.btnVisionSchoolMap.classList.remove('active');
          }

          if (mode === 'AMBULANCE' || mode === 'FIRE_ENGINE' || mode === 'SEVERE_ACCIDENT' || mode === 'CRIME_CRITICAL') {
            this.audioEffects.playEmergencySiren();
          } else {
            this.audioEffects.playSignalSwitch();
          }

          try {
            await this.api.setSituationMode(mode);
            this.showToast(`🎯 Situation Mode Activated: ${btn.textContent.trim()}`);
          } catch (e) {
            console.error(e);
          }
        });
      });
    }

    // Incident & Priority Stress Injection
    if (this.btnInjectAmbulance) {
      this.btnInjectAmbulance.addEventListener('click', async () => {
        this.audioEffects.playEmergencySiren();
        await this.api.spawnVehicle('A', 'AMBULANCE', true);
        this.showToast('🚑 108 Emergency Ambulance Dispatched on Road A! North Pole Siren Active!');
      });
    }

    if (this.btnInjectFire) {
      this.btnInjectFire.addEventListener('click', async () => {
        this.audioEffects.playEmergencySiren();
        await this.api.spawnVehicle('B', 'FIRE_ENGINE', true);
        this.showToast('🚒 Fire & Rescue Tender Dispatched on Road B! East Pole Siren Active!');
      });
    }

    if (this.btnTriggerAccidentCrit) {
      this.btnTriggerAccidentCrit.addEventListener('click', async () => {
        this.accidentCardDismissed = false;
        this.audioEffects.playEmergencySiren();
        await this.api.triggerAccident('CRITICAL', 'C');
        this.showToast('💥 CRITICAL Crash on Road C! AI Triage: Auto 108 CAD Call Dispatched to Trauma Care Hospital!');
      });
    }

    if (this.btnTriggerAccidentMin) {
      this.btnTriggerAccidentMin.addEventListener('click', async () => {
        this.accidentCardDismissed = false;
        this.audioEffects.playSignalSwitch();
        await this.api.triggerAccident('MINOR', 'D');
        this.showToast('🛡️ Minor Scrape on Road D! Sub-Second AI Triage: 108 Call Suppressed!');
      });
    }

    // Clear / Close Accident
    const clearAccidentHandler = async (e) => {
      if (e) {
        e.stopPropagation();
        e.preventDefault();
      }
      this.accidentCardDismissed = true;
      if (this.accidentCadCard) this.accidentCadCard.classList.add('hidden');
      try {
        await this.api.clearAccident();
        this.showToast('✅ Incident Cleared & Normal Corridor Flow Restored.');
      } catch (err) {
        console.error(err);
      }
    };
    if (this.btnCloseAccident) {
      this.btnCloseAccident.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        this.accidentCardDismissed = true;
        if (this.accidentCadCard) this.accidentCadCard.classList.add('hidden');
      });
    }
    if (this.btnCadClear) this.btnCadClear.addEventListener('click', clearAccidentHandler);

    // Clear / Close Crime Incident
    const clearCrimeHandler = async (e) => {
      if (e) {
        e.stopPropagation();
        e.preventDefault();
      }
      this.crimeCardDismissed = true;
      if (this.crimeCadCard) this.crimeCadCard.classList.add('hidden');
      try {
        await this.api.clearCrime();
        this.showToast('✅ Crime Incident Cleared & Normal Public Surveillance Restored.');
      } catch (err) {
        console.error(err);
      }
    };
    if (this.btnCloseCrime) {
      this.btnCloseCrime.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        this.crimeCardDismissed = true;
        if (this.crimeCadCard) this.crimeCadCard.classList.add('hidden');
      });
    }
    if (this.btnCrimeClear) this.btnCrimeClear.addEventListener('click', clearCrimeHandler);

    // Clear / Close School Zone Crosswalk
    const clearSchoolHandler = async (e) => {
      if (e) {
        e.stopPropagation();
        e.preventDefault();
      }
      this.schoolCardDismissed = true;
      if (this.schoolCvCard) this.schoolCvCard.classList.add('hidden');
      if (this.renderer) this.renderer.toggleSchoolMap(false);
      if (this.btnVisionSchoolMap) this.btnVisionSchoolMap.classList.remove('active');
      try {
        await this.api.setSituationMode('NORMAL');
        this.showToast('✅ School Zone Priority Cleared & Normal Signal Operation Restored.');
      } catch (err) {
        console.error(err);
      }
    };
    if (this.btnCloseSchool) {
      this.btnCloseSchool.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        this.schoolCardDismissed = true;
        if (this.schoolCvCard) this.schoolCvCard.classList.add('hidden');
      });
    }
    if (this.btnSchoolClear) this.btnSchoolClear.addEventListener('click', clearSchoolHandler);

    // Pedestrian Controls
    const triggerSurgeHandler = async () => {
      this.audioEffects.playSignalSwitch();
      await this.api.triggerPedestrianSurge();
      this.showToast('🚶 Student Crowd Surge Detected! Barnes Dance Pedestrian Scramble Activated!');
    };
    if (this.btnPedSurge) this.btnPedSurge.addEventListener('click', triggerSurgeHandler);
    if (this.btnPedSurgeSide) this.btnPedSurgeSide.addEventListener('click', triggerSurgeHandler);

    if (this.pedCallBtns) {
      this.pedCallBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
          const road = btn.dataset.road || 'A';
          this.audioEffects.playSignalSwitch();
          await this.api.pressPedestrianButton(road);
          this.showToast(`✋ Pedestrian Walk Demand Registered on Road ${road}`);
        });
      });
    }

    if (this.btnInjectBus) {
      this.btnInjectBus.addEventListener('click', async () => {
        await this.api.triggerIncident('BUS');
        this.showToast('🚌 High-Capacity Transit Bus Injected (3.5x Passenger Delay Equity)');
      });
    }

    if (this.btnInjectSurge) {
      this.btnInjectSurge.addEventListener('click', async () => {
        await this.api.triggerIncident('SURGE_ROAD_B');
        this.showToast('⚡ Instant Congestion Surge Injected on Road B (50 veh/min)');
      });
    }

    // AI Algorithm Architecture Selector
    if (this.selectAiAlgorithm) {
      this.selectAiAlgorithm.addEventListener('change', async (e) => {
        const algo = e.target.value;
        await this.api.setAlgorithm(algo);
        this.updateFormulaDisplay(algo);
        this.showToast(`AI Architecture: ${algo}`);
      });
    }

    // Export CSV
    if (this.btnExportCsv) {
      this.btnExportCsv.addEventListener('click', () => {
        window.location.href = '/api/export/csv';
      });
    }

    // Benchmark Run in Experiments View
    if (this.btnRunBenchmark) {
      this.btnRunBenchmark.addEventListener('click', async () => {
        this.btnRunBenchmark.disabled = true;
        this.btnRunBenchmark.textContent = '⏳ Running Headless Benchmark...';
        this.expResultsContainer.innerHTML = `<div style="color: var(--text-muted); font-size: 13px;">Executing simulation tests across 5 scenarios in backend engine...</div>`;

        try {
          const report = await this.api.runExperiment(120.0);
          this.renderExperimentResults(report.results || []);
        } catch (err) {
          this.expResultsContainer.innerHTML = `<div style="color: var(--color-red);">Benchmark failed: ${err.message}</div>`;
        } finally {
          this.btnRunBenchmark.disabled = false;
          this.btnRunBenchmark.textContent = '⚡ Run Benchmark Suite (120s Simulated Traffic)';
        }
      });
    }

    // Settings Sliders
    const bindSettingRate = (slider, display, rId) => {
      slider.addEventListener('change', async (e) => {
        const val = parseInt(e.target.value, 10);
        display.textContent = `${val} veh/min`;
        this.selectPreset.value = 'CUSTOM';
        await this.api.setRates({ [rId]: val });
      });
      slider.addEventListener('input', (e) => {
        display.textContent = `${e.target.value} veh/min`;
      });
    };
    if (this.settingSliderRateA) bindSettingRate(this.settingSliderRateA, this.settingValRateA, 'A');
    if (this.settingSliderRateB) bindSettingRate(this.settingSliderRateB, this.settingValRateB, 'B');
    if (this.settingSliderRateC) bindSettingRate(this.settingSliderRateC, this.settingValRateC, 'C');
    if (this.settingSliderRateD) bindSettingRate(this.settingSliderRateD, this.settingValRateD, 'D');

    if (this.settingSliderFixedGreen) {
      this.settingSliderFixedGreen.addEventListener('change', async (e) => {
        const val = parseInt(e.target.value, 10);
        this.settingValFixedGreen.textContent = `${val}s`;
        await this.api.setFixedTimings({ A: val, B: val, C: val, D: val });
      });
      this.settingSliderFixedGreen.addEventListener('input', (e) => {
        this.settingValFixedGreen.textContent = `${e.target.value}s`;
      });
    }

    if (this.settingSliderMinGreen) {
      this.settingSliderMinGreen.addEventListener('change', async (e) => {
        const val = parseInt(e.target.value, 10);
        this.settingValMinGreen.textContent = `${val}s`;
        await this.api.setAdaptiveBounds(val, parseInt(this.settingSliderMaxGreen.value, 10));
      });
    }

    if (this.settingSliderMaxGreen) {
      this.settingSliderMaxGreen.addEventListener('change', async (e) => {
        const val = parseInt(e.target.value, 10);
        this.settingValMaxGreen.textContent = `${val}s`;
        await this.api.setAdaptiveBounds(parseInt(this.settingSliderMinGreen.value, 10), val);
      });
    }
  }

  updatePlayPauseBtn() {
    if (this.isPlaying) {
      this.btnPlayPause.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="4" width="4" height="16"></rect>
          <rect x="14" y="4" width="4" height="16"></rect>
        </svg> Pause
      `;
    } else {
      this.btnPlayPause.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="5,3 19,12 5,21"></polygon>
        </svg> Start
      `;
    }
  }

  updateSettingsSliderDisplays(rates) {
    if (rates.A !== undefined && this.settingSliderRateA) {
      this.settingSliderRateA.value = rates.A;
      this.settingValRateA.textContent = `${rates.A} veh/min`;
    }
    if (rates.B !== undefined && this.settingSliderRateB) {
      this.settingSliderRateB.value = rates.B;
      this.settingValRateB.textContent = `${rates.B} veh/min`;
    }
    if (rates.C !== undefined && this.settingSliderRateC) {
      this.settingSliderRateC.value = rates.C;
      this.settingValRateC.textContent = `${rates.C} veh/min`;
    }
    if (rates.D !== undefined && this.settingSliderRateD) {
      this.settingSliderRateD.value = rates.D;
      this.settingValRateD.textContent = `${rates.D} veh/min`;
    }
  }

  /**
   * Consumes state from backend service layer and updates UI
   */
  updateFromBackendState(state) {
    if (!state) return;

    this.isPlaying = state.isPlaying;
    this.updatePlayPauseBtn();

    const heroSim = (this.heroMode === 'AI') ? state.simAdaptive : state.simFixed;

    // 0. Sync Active Situation Mode Button
    if (state.situationMode && this.situationBtns) {
      this.situationBtns.forEach(btn => {
        if (btn.dataset.mode === state.situationMode) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    }

    // 0.1 Sync Directional Pole Sirens HUD Strip
    if (heroSim && heroSim.directionalSirens && this.poleElements) {
      for (const [rId, pData] of Object.entries(heroSim.directionalSirens)) {
        const el = this.poleElements[rId];
        if (!el || !el.card) continue;
        if (pData.active) {
          el.card.classList.add('active');
          el.stat.textContent = `ALERT ${pData.decibels}dB`;
        } else {
          el.card.classList.remove('active');
          el.stat.textContent = 'Standby';
        }
      }
    }

    // 0.2 Sync Floating Accident CAD Live Monitor Card
    const acc = (state.accidentState && state.accidentState.activeAccident) || (heroSim && heroSim.activeAccident);
    if (!acc) {
      this.accidentCardDismissed = false;
    }
    if (acc && !this.accidentCardDismissed && this.accidentCadCard) {
      this.accidentCadCard.classList.remove('hidden');
      const isCrit = acc.classification === 'CRITICAL_EMERGENCY';

      if (isCrit) {
        this.accidentCadCard.classList.remove('minor');
        if (this.cadStatusPulse) this.cadStatusPulse.className = 'cad-pulse-dot red';
        if (this.cadVerdictBanner) {
          this.cadVerdictBanner.className = 'cad-verdict-banner critical';
          if (this.cadVerdictIcon) this.cadVerdictIcon.textContent = '🚨';
          if (this.cadVerdictText) this.cadVerdictText.textContent = 'CRITICAL EMERGENCY DETECTED — AUTO-DISPATCHING 108 CAD CALL';
        }
        if (this.cadHospitalSection) this.cadHospitalSection.style.display = 'flex';
      } else {
        this.accidentCadCard.classList.add('minor');
        if (this.cadStatusPulse) this.cadStatusPulse.className = 'cad-pulse-dot cyan';
        if (this.cadVerdictBanner) {
          this.cadVerdictBanner.className = 'cad-verdict-banner minor';
          if (this.cadVerdictIcon) this.cadVerdictIcon.textContent = '🛡️';
          if (this.cadVerdictText) this.cadVerdictText.textContent = 'MINOR FENDER-BENDER — 108 CALL SUPPRESSED (BANDWIDTH PRESERVED)';
        }
        if (this.cadHospitalSection) this.cadHospitalSection.style.display = 'none';
      }

      if (this.cadIncidentId) this.cadIncidentId.textContent = acc.incidentId || 'CAD-2026-MED-1002';
      if (this.cadReasonText) this.cadReasonText.textContent = acc.triageReason || 'Evaluating telemetry...';
      if (this.cadSensorSpeed) this.cadSensorSpeed.textContent = `${acc.impactSpeedKmh ? acc.impactSpeedKmh.toFixed(1) : 0} km/h`;
      if (this.cadSensorGforce) this.cadSensorGforce.textContent = `${acc.gForce ? acc.gForce.toFixed(1) : 0} G`;
      if (this.cadSensorAirbags) this.cadSensorAirbags.textContent = acc.airbagsDeployed ? 'DEPLOYED' : 'INTACT';
      if (this.cadSensorIntrusion) this.cadSensorIntrusion.textContent = acc.structuralIntrusion || 'None';
      if (this.cadSensorCasualties) this.cadSensorCasualties.textContent = `${acc.estimatedCasualties || 0} Persons`;
      if (this.cadSensorAcoustic) this.cadSensorAcoustic.textContent = isCrit ? '98.4 dB (Crash Spike)' : '72.1 dB (Bumper Scrape)';

      if (acc.hospital && this.cadHospitalName) this.cadHospitalName.textContent = acc.hospital.name || 'City Multi-Specialty Trauma Care';
      if (acc.hospital && this.cadHospitalGps && acc.hospital.gps) {
        this.cadHospitalGps.textContent = `${acc.hospital.gps.lat}° N, ${acc.hospital.gps.lng}° E (${acc.hospital.gps.address})`;
      }
      if (acc.hospital && this.cadHospitalPhone) this.cadHospitalPhone.textContent = `${acc.hospital.phone} (${acc.hospital.dispatchCode})`;
      if (this.cadLiveStatus) {
        const statusLabels = {
          'CONNECTING_HOSPITAL': 'DIALING 108 EMERGENCY...',
          'CAD_PACKET_TRANSMITTED_GPS_LOCKED': 'GPS LOCKED & CAD SENT',
          'AMBULANCE_DISPATCHED_EN_ROUTE': 'ALS AMBULANCE EN ROUTE (ETA: 3.8m)'
        };
        this.cadLiveStatus.textContent = statusLabels[acc.cadStatus] || acc.cadStatus;
      }
      if (this.cadAudioText) this.cadAudioText.textContent = acc.audioTranscript || '';
    } else if (this.accidentCadCard) {
      this.accidentCadCard.classList.add('hidden');
    }

    // 0.2b Sync Floating Crime Scene 112 CAD Live Monitor Card
    const crm = (state.crimeState && state.crimeState.activeCrime) || (heroSim && heroSim.activeCrime);
    if (!crm) {
      this.crimeCardDismissed = false;
    }
    if (crm && !this.crimeCardDismissed && this.crimeCadCard) {
      this.crimeCadCard.classList.remove('hidden');
      const isCrit = crm.classification === 'CRITICAL_ARMED_ASSAULT';

      if (isCrit) {
        this.crimeCadCard.classList.remove('minor');
        if (this.crimeStatusPulse) this.crimeStatusPulse.className = 'cad-pulse-dot blue';
        if (this.crimeVerdictBanner) {
          this.crimeVerdictBanner.className = 'cad-verdict-banner critical';
          if (this.crimeVerdictIcon) this.crimeVerdictIcon.textContent = '🚨';
          if (this.crimeVerdictText) this.crimeVerdictText.textContent = 'ARMED ASSAULT DETECTED — AUTO-DISPATCHING 112 POLICE CAD';
        }
        if (this.crimePoliceSection) this.crimePoliceSection.style.display = 'flex';
      } else {
        this.crimeCadCard.classList.add('minor');
        if (this.crimeStatusPulse) this.crimeStatusPulse.className = 'cad-pulse-dot cyan';
        if (this.crimeVerdictBanner) {
          this.crimeVerdictBanner.className = 'cad-verdict-banner minor';
          if (this.crimeVerdictIcon) this.crimeVerdictIcon.textContent = '⚖️';
          if (this.crimeVerdictText) this.crimeVerdictText.textContent = 'NON-VIOLENT ALTERCATION — 112 CALL SUPPRESSED (BANDWIDTH PRESERVED)';
        }
        if (this.crimePoliceSection) this.crimePoliceSection.style.display = 'none';
      }

      if (this.crimeIncidentId) this.crimeIncidentId.textContent = crm.incidentId || 'CAD-2026-POLICE-2002';
      if (this.crimeReasonText) this.crimeReasonText.textContent = crm.triageReason || 'Evaluating threat telemetry...';
      if (this.crimeSensorWeapon) this.crimeSensorWeapon.textContent = crm.weaponDetected || 'None';
      if (this.crimeSensorBehavior) this.crimeSensorBehavior.textContent = crm.harshBehavior || 'None';
      if (this.crimeSensorScore) this.crimeSensorScore.textContent = `${crm.threatScore || 0} / 100`;
      if (this.crimeSensorAcoustic) this.crimeSensorAcoustic.textContent = crm.acousticSignature || 'Normal';
      if (this.crimeSensorTracking) this.crimeSensorTracking.textContent = `Camera on Road ${crm.roadId || 'B'} (Tracking Lock)`;
      if (this.crimeSensorLatency) this.crimeSensorLatency.textContent = '38 ms (Edge TPU)';

      if (crm.police && this.crimePoliceStation) this.crimePoliceStation.textContent = crm.police.station || 'Central City Police Station';
      if (crm.police && this.crimePoliceGps && crm.police.gps) {
        this.crimePoliceGps.textContent = `${crm.police.gps.lat}° N, ${crm.police.gps.lng}° E (${crm.police.gps.address})`;
      }
      if (crm.police && this.crimePolicePhone) this.crimePolicePhone.textContent = `${crm.police.phone} (${crm.police.dispatchCode})`;
      if (this.crimeLiveStatus) {
        const pStatusLabels = {
          'CONNECTING_POLICE_CONTROL_ROOM': 'TRANSMITTING TO 112 DISPATCH...',
          'CAD_PACKET_TRANSMITTED_GPS_LOCKED': 'GPS LOCKED & 112 PACKET ACKNOWLEDGED',
          'PCR_FLYING_SQUAD_DISPATCHED_EN_ROUTE': 'PCR FLYING SQUAD EN ROUTE (ETA: 2.4m)'
        };
        this.crimeLiveStatus.textContent = pStatusLabels[crm.cadStatus] || crm.cadStatus;
      }
      if (this.crimeAudioText) this.crimeAudioText.textContent = crm.audioTranscript || '';
    } else if (this.crimeCadCard) {
      this.crimeCadCard.classList.add('hidden');
    }

    // 0.2c Sync Smart School Zone CV Monitor Card
    const pedData = (heroSim && heroSim.pedestrians) || (state.simAdaptive && state.simAdaptive.pedestrians);
    const school = pedData && pedData.schoolZone;
    if (!school || !school.active) {
      this.schoolCardDismissed = false;
    }
    if (school && school.active && !this.schoolCardDismissed && this.schoolCvCard) {
      this.schoolCvCard.classList.remove('hidden');
      if (this.schoolVerdictIcon) this.schoolVerdictIcon.textContent = school.scenario === 'SMALL_GROUP' ? '🎒' : '👥';
      if (this.schoolVerdictText) {
        this.schoolVerdictText.textContent = school.scenario === 'SMALL_GROUP' 
          ? 'SMALL GROUP (2 STUDENTS) — IMMEDIATE RED & QUICK WALK' 
          : 'STUDENT PLATOON + TRAILING INFLOW — AGGREGATION & SCRAMBLE';
      }
      if (this.schoolReasonText) this.schoolReasonText.textContent = school.cvDecision || 'Monitoring school crosswalk...';
      if (this.schoolCurbCount) this.schoolCurbCount.textContent = `${school.curbWaiting || 0} Students`;
      if (this.schoolInflowCount) this.schoolInflowCount.textContent = `${school.trailingInflow || 0} Approaching (15m)`;
      if (this.schoolCvConfidence) this.schoolCvConfidence.textContent = `${school.cvConfidence ? school.cvConfidence.toFixed(1) : 97.4}%`;
      if (this.schoolAggregationTimer) {
        this.schoolAggregationTimer.textContent = school.aggregationTimer > 0 
          ? `${school.aggregationTimer.toFixed(1)}s (Holding Green for Inflow)` 
          : '0.0s (Vehicles Stopped at RED)';
      }
      if (this.schoolWalkWindow) this.schoolWalkWindow.textContent = `${school.crossingWindow ? school.crossingWindow.toFixed(1) : 8.0}s`;
    } else if (this.schoolCvCard) {
      this.schoolCvCard.classList.add('hidden');
    }

    // Sync Renderer Situation Mode & Campus Map View State
    if (this.renderer) {
      this.renderer.setSituationMode(state.situationMode);
      if (this.btnVisionSchoolMap) {
        const isSchool = state.situationMode === 'SCHOOL_SMALL_GROUP' || state.situationMode === 'SCHOOL_PLATOON_INFLOW' || this.renderer.forceSchoolMap;
        if (isSchool) {
          this.btnVisionSchoolMap.classList.add('active');
        } else {
          this.btnVisionSchoolMap.classList.remove('active');
        }
      }
    }

    // 0.3 Sync Metropolitan Arterial Corridor Sync Bar
    const corridor = state.multiIntersection;
    if (corridor) {
      if (this.corridorCoordinationBadge) {
        const mode = corridor.metrics ? corridor.metrics.coordinationMode : 'COOPERATIVE_GREEN_WAVE';
        const coh = corridor.metrics ? corridor.metrics.greenWaveCoherencePct : 88.5;
        this.corridorCoordinationBadge.textContent = `${mode.replace(/_/g, ' ')} (${coh}% Coherence)`;
      }
      const nodes = corridor.nodes || [];
      if (nodes[0] && this.node1Signal) {
        this.node1Signal.textContent = `${nodes[0].signalState} ${Math.ceil(nodes[0].phaseRemaining || 0)}s`;
        this.node1Signal.className = `node-sig ${nodes[0].signalState.toLowerCase()}`;
        if (this.node1Platoon) this.node1Platoon.textContent = `${nodes[0].inboundPlatoonVehicles || 8} veh platoon (ETA ${Math.ceil(nodes[0].platoonEtaSec || 0)}s)`;
      }
      if (nodes[1] && this.node2Signal && heroSim) {
        const roadB = heroSim.roads ? heroSim.roads['B'] : null;
        const sig = roadB ? roadB.signalState : 'GREEN';
        const rem = roadB ? Math.ceil(roadB.remainingInPhase) : 15;
        this.node2Signal.textContent = `${sig} ${rem}s`;
        this.node2Signal.className = `node-sig ${sig.toLowerCase()}`;
      }
      if (nodes[2] && this.node3Signal) {
        this.node3Signal.textContent = `${nodes[2].signalState} ${Math.ceil(nodes[2].phaseRemaining || 0)}s`;
        this.node3Signal.className = `node-sig ${nodes[2].signalState.toLowerCase()}`;
        if (this.node3Platoon) this.node3Platoon.textContent = nodes[2].signalState === 'GREEN' ? 'Downstream Preempted' : `${nodes[2].inboundPlatoonVehicles || 4} veh platoon`;
      }
    }

    // 0.4 Sync Pedestrian Crosswalk Controls
    const pedMgr = heroSim ? heroSim.pedestrians : null;
    if (pedMgr) {
      if (this.pedScrambleStatusTag) {
        if (pedMgr.scrambleActive) {
          this.pedScrambleStatusTag.textContent = `SCRAMBLE (${pedMgr.scrambleTimer}s)`;
          this.pedScrambleStatusTag.className = 'ped-status-tag scramble';
        } else {
          this.pedScrambleStatusTag.textContent = 'Vehicle Flow';
          this.pedScrambleStatusTag.className = 'ped-status-tag';
        }
      }
      if (this.pedWaitingCount) this.pedWaitingCount.textContent = `${pedMgr.totalWaiting || 0} peds`;
      if (this.pedCrossingCount) this.pedCrossingCount.textContent = `${pedMgr.totalCrossing || 0} peds`;
      if (this.pedTimerVal) this.pedTimerVal.textContent = `${pedMgr.scrambleTimer || 0}s`;
    }

    // 1. Update Compact Road HUD Badges around the central intersection
    if (heroSim && heroSim.roads) {
      for (const [rId, road] of Object.entries(heroSim.roads)) {
        const hud = this.hudElements[rId];
        if (hud) {
          const sigState = road.signalState || 'RED';
          const remaining = Math.ceil(road.remainingInPhase || 0);
          hud.signal.textContent = `${sigState} ${remaining}s`;
          hud.signal.className = `signal-indicator ${sigState.toLowerCase()}`;
          hud.waitCount.textContent = `${road.waitingVehicles} veh`;
          hud.avgWait.textContent = `${road.avgWaitTime}s`;
        }
      }
    }

    // 2. Update Live Metrics (the 4 hero metrics)
    if (heroSim) {
      if (this.statAvgWait) this.statAvgWait.textContent = `${heroSim.avgWaitTime} s`;
      if (this.statQueueLength) this.statQueueLength.textContent = `${heroSim.currentQueue} cars`;
      if (this.statClearedCount) this.statClearedCount.textContent = `${heroSim.totalPassed}`;
      if (this.statThroughput) this.statThroughput.textContent = `${heroSim.throughput} veh/min`;
    }

    // 3. Update Transparent AI Decision Panel
    const aiCtrl = state.simAdaptive ? state.simAdaptive.controller : null;
    if (aiCtrl) {
      if (this.aiActivePhaseTag) {
        this.aiActivePhaseTag.textContent = `${aiCtrl.phase} (${Math.round(aiCtrl.timeElapsed)}s / ${Math.round(aiCtrl.timeTotal)}s)`;
      }
      if (this.aiSelectedRoad) {
        this.aiSelectedRoad.textContent = `Road ${aiCtrl.activeRoad}`;
      }

      const latest = aiCtrl.latestDecision || {};
      const activeRoadState = (state.simAdaptive.roads && state.simAdaptive.roads[aiCtrl.activeRoad]) || {};
      
      if (this.aiRoadQueue) {
        this.aiRoadQueue.textContent = `${activeRoadState.waitingVehicles || 0} vehicles`;
      }
      if (this.aiRoadWait) {
        this.aiRoadWait.textContent = `${activeRoadState.maxWaitTime || 0.0}s`;
      }
      if (this.aiRoadPriority) {
        const score = (latest.scores && latest.scores[aiCtrl.activeRoad]) || activeRoadState.priorityScore || 0;
        this.aiRoadPriority.textContent = score;
      }
      if (this.aiGreenDuration) {
        this.aiGreenDuration.textContent = `${latest.allocatedGreen || aiCtrl.timeTotal || 15}s`;
      }
      if (this.aiDecisionReason) {
        this.aiDecisionReason.textContent = latest.reason || 'Road selected based on combined queue and waiting-time priority score.';
      }
    }

    // 4. Update Real-Time Comparison Callout (with mathematically accurate non-confusing wording!)
    const fixedWait = state.simFixed ? state.simFixed.avgWaitTime : 0;
    const aiWait = state.simAdaptive ? state.simAdaptive.avgWaitTime : 0;
    const fixedQ = state.simFixed ? state.simFixed.currentQueue : 0;
    const aiQ = state.simAdaptive ? state.simAdaptive.currentQueue : 0;

    if (fixedWait > 0.2) {
      if (aiWait < fixedWait) {
        const pctReduction = Math.round(((fixedWait - aiWait) / fixedWait) * 1000) / 10;
        this.calloutWaitHeadline.textContent = `Waiting Time Reduction: ${pctReduction}%`;
        this.calloutWaitHeadline.className = 'comparison-callout-headline positive';
      } else {
        const pctIncrease = Math.round(((aiWait - fixedWait) / fixedWait) * 1000) / 10;
        this.calloutWaitHeadline.textContent = `Waiting Time Change: +${pctIncrease}%`;
        this.calloutWaitHeadline.className = 'comparison-callout-headline negative';
      }
      this.calloutWaitDetail.textContent = `Adaptive: ${aiWait}s vs Fixed: ${fixedWait}s`;
    } else {
      this.calloutWaitHeadline.textContent = 'Accumulating Traffic Metrics...';
      this.calloutWaitHeadline.className = 'comparison-callout-headline';
      this.calloutWaitDetail.textContent = `Adaptive: ${aiWait}s vs Fixed: ${fixedWait}s`;
    }

    if (fixedQ > 0) {
      if (aiQ < fixedQ) {
        const qReduction = Math.round(((fixedQ - aiQ) / fixedQ) * 1000) / 10;
        this.calloutQueueDetail.textContent = `Queue Reduction: ${qReduction}% (Adaptive: ${aiQ} vs Fixed: ${fixedQ} cars)`;
      } else if (aiQ > fixedQ) {
        const qIncrease = Math.round(((aiQ - fixedQ) / fixedQ) * 1000) / 10;
        this.calloutQueueDetail.textContent = `Queue Change: +${qIncrease}% (Adaptive: ${aiQ} vs Fixed: ${fixedQ} cars)`;
      } else {
        this.calloutQueueDetail.textContent = `Queue Length Identical: ${aiQ} cars`;
      }
    } else {
      this.calloutQueueDetail.textContent = `Current Queues: Adaptive ${aiQ} cars vs Fixed ${fixedQ} cars`;
    }

    // 5. Update Comparison View Table
    const sf = state.simFixed;
    const sa = state.simAdaptive;
    if (sf && sa) {
      if (this.compFixedWait) this.compFixedWait.textContent = `${sf.avgWaitTime} s`;
      if (this.compAiWait) this.compAiWait.textContent = `${sa.avgWaitTime} s`;
      if (this.compDiffWait) {
        if (sf.avgWaitTime > 0.2) {
          if (sa.avgWaitTime < sf.avgWaitTime) {
            const diff = Math.round(((sf.avgWaitTime - sa.avgWaitTime) / sf.avgWaitTime) * 1000) / 10;
            this.compDiffWait.textContent = `-${diff}% delay`;
            this.compDiffWait.className = 'diff-positive';
          } else {
            const diff = Math.round(((sa.avgWaitTime - sf.avgWaitTime) / sf.avgWaitTime) * 1000) / 10;
            this.compDiffWait.textContent = `+${diff}% delay`;
            this.compDiffWait.className = 'diff-negative';
          }
        } else {
          this.compDiffWait.textContent = '0.0%';
        }
      }

      if (this.compFixedQueue) this.compFixedQueue.textContent = `${sf.currentQueue} cars`;
      if (this.compAiQueue) this.compAiQueue.textContent = `${sa.currentQueue} cars`;
      if (this.compDiffQueue) {
        if (sf.currentQueue > 0) {
          const diff = Math.round(((sf.currentQueue - sa.currentQueue) / sf.currentQueue) * 100);
          this.compDiffQueue.textContent = `${diff >= 0 ? '-' : '+'}${Math.abs(diff)}%`;
          this.compDiffQueue.className = diff >= 0 ? 'diff-positive' : 'diff-negative';
        } else {
          this.compDiffQueue.textContent = '0%';
        }
      }

      if (this.compFixedThroughput) this.compFixedThroughput.textContent = `${sf.totalPassed} veh`;
      if (this.compAiThroughput) this.compAiThroughput.textContent = `${sa.totalPassed} veh`;
      if (this.compDiffThroughput) {
        const diff = (sf.totalPassed > 0) ? Math.round(((sa.totalPassed - sf.totalPassed) / sf.totalPassed) * 100) : 0;
        this.compDiffThroughput.textContent = `${diff >= 0 ? '+' : '-'}${Math.abs(diff)}%`;
        this.compDiffThroughput.className = diff >= 0 ? 'diff-positive' : 'diff-negative';
      }

      if (this.compFixedMaxQueue) this.compFixedMaxQueue.textContent = `${sf.peakQueue} cars`;
      if (this.compAiMaxQueue) this.compAiMaxQueue.textContent = `${sa.peakQueue} cars`;
      if (this.compDiffMaxQueue) {
        const diff = (sf.peakQueue > 0) ? Math.round(((sf.peakQueue - sa.peakQueue) / sf.peakQueue) * 100) : 0;
        this.compDiffMaxQueue.textContent = `${diff >= 0 ? '-' : '+'}${Math.abs(diff)}%`;
        this.compDiffMaxQueue.className = diff >= 0 ? 'diff-positive' : 'diff-negative';
      }
    }

    // 6. Update Comparison Charts
    if (this.chartRenderer && sf && sa && sf.history && sa.history) {
      if (this.chartWaitTime) {
        this.chartRenderer.renderDualLineChart(
          this.chartWaitTime,
          sf.history.avgWaitTime,
          sa.history.avgWaitTime,
          { unit: 's', minMax: 25 }
        );
      }
      if (this.chartQueue) {
        this.chartRenderer.renderDualLineChart(
          this.chartQueue,
          sf.history.queueLength,
          sa.history.queueLength,
          { unit: ' cars', minMax: 15 }
        );
      }
    }

    // 7. Update Indian Smart City ESG & Economic Sustainability Card
    const sus = state.comparisonStats || state.sustainability;
    if (sus) {
      const cai = sus.cleanAirRating || 'A+';
      const co2 = sus.co2SavedKg !== undefined ? sus.co2SavedKg : sus.co2_saved_kg || 0;
      const fuel = sus.fuelSavedLiters !== undefined ? sus.fuelSavedLiters : sus.fuel_saved_liters || 0;
      const rupees = sus.rupeesSaved || 0;
      const annualLakhs = sus.annualRupeesSavedLakhs || 0;
      const timeVal = sus.timeValueSavedInr || 0;
      const fuelVal = sus.fuelValueSavedInr || 0;
      const waitRed = sus.waitTimeReductionPct !== undefined ? sus.waitTimeReductionPct : sus.delay_percent_cut || 0;

      if (this.statEsgCai) this.statEsgCai.textContent = `${cai} Rating`;
      if (this.statEsgCo2) this.statEsgCo2.textContent = `${Number(co2).toFixed(2)} kg`;
      if (this.statEsgFuel) this.statEsgFuel.textContent = `${Number(fuel).toFixed(2)} L (₹${Math.round(fuelVal)})`;
      if (this.statEsgSavingsInr) this.statEsgSavingsInr.textContent = `₹${Number(rupees).toFixed(2)}`;
      if (this.statEsgAnnualLakhs) this.statEsgAnnualLakhs.textContent = `₹${Number(annualLakhs).toFixed(2)} L /yr`;
      if (this.statEsgTimeValue) this.statEsgTimeValue.textContent = `₹${Number(timeVal).toFixed(2)}`;
      if (this.statEsgFuelValue) this.statEsgFuelValue.textContent = `₹${Number(fuelVal).toFixed(2)}`;
      if (this.statEsgSavings) this.statEsgSavings.textContent = `$${Number(sus.dollarsSaved || 0).toFixed(2)}`;
      if (this.statEsgDelayCut) this.statEsgDelayCut.textContent = `${Number(waitRed).toFixed(1)}%`;
    }

    // Sync AI Algorithm selector with backend state if changed remotely
    if (state.aiAlgorithm && this.selectAiAlgorithm && document.activeElement !== this.selectAiAlgorithm) {
      if (this.selectAiAlgorithm.value !== state.aiAlgorithm) {
        this.selectAiAlgorithm.value = state.aiAlgorithm;
        this.updateFormulaDisplay(state.aiAlgorithm);
      }
    }

    // Sync Weather state with backend
    if (state.weatherMode && this.btnToggleWeather) {
      if (state.weatherMode === 'RAIN' && !this.btnToggleWeather.classList.contains('rain')) {
        this.btnToggleWeather.textContent = '🌧️ Rain';
        this.btnToggleWeather.classList.add('rain');
        if (this.renderer) this.renderer.setWeatherMode('RAIN');
      } else if (state.weatherMode === 'CLEAR' && this.btnToggleWeather.classList.contains('rain')) {
        this.btnToggleWeather.textContent = '☀️ Clear';
        this.btnToggleWeather.classList.remove('rain');
        if (this.renderer) this.renderer.setWeatherMode('CLEAR');
      }
    }

    // 8. Update Live Vehicle Telemetry Inspector if a vehicle is selected
    if (heroSim && heroSim.vehicles && this.inspectedVehicleId) {
      const liveVeh = heroSim.vehicles.find(v => v.id === this.inspectedVehicleId);
      if (liveVeh) {
        this.updateTelemetryCard(liveVeh);
      }
    }

    // 9. Procedural Audio Cues on AI Signal Transitions
    if (aiCtrl) {
      if (this.prevAiPhase && this.prevAiPhase !== aiCtrl.phase) {
        this.audioEffects.playSignalChange();
      }
      this.prevAiPhase = aiCtrl.phase;
    }
  }

  updateFormulaDisplay(algo) {
    if (!this.aiFormulaDisplay) return;
    if (algo === 'RL_DQN') {
      this.aiFormulaDisplay.textContent = 'Q-Value: Q(s,a) ← Q(s,a) + α[R_t + γ max Q(s\',a\') - Q(s,a)] · Reward: -Var(Queues)';
    } else if (algo === 'V2X_PRIORITY') {
      this.aiFormulaDisplay.textContent = 'Coordination = PlatoonDensity × DSRC_Urgency + EmergencyPreemption ("Green Wave")';
    } else {
      this.aiFormulaDisplay.textContent = 'Priority = (Queue × 1.2) + (Wait × 1.5) + (Transit × 3.5) + DilemmaZoneShield';
    }
  }

  updateTelemetryCard(vehicle) {
    if (!this.telemetryContainer) return;
    if (!vehicle) {
      if (!this.inspectedVehicleId) {
        this.telemetryContainer.innerHTML = `
          <div class="telemetry-empty-hint">
            Hover or click any vehicle on the intersection to inspect real-time kinematic digital twin telemetry.
          </div>
        `;
      }
      return;
    }

    this.inspectedVehicleId = vehicle.id;

    if (this.telemetryBadge) {
      if (vehicle.isEmergency) {
        this.telemetryBadge.textContent = 'EMERGENCY V2X (L4)';
        this.telemetryBadge.style.color = '#fca5a5';
        this.telemetryBadge.style.borderColor = 'rgba(239, 68, 68, 0.5)';
      } else if (vehicle.isTransit) {
        this.telemetryBadge.textContent = 'TSP TRANSIT V2X';
        this.telemetryBadge.style.color = '#93c5fd';
        this.telemetryBadge.style.borderColor = 'rgba(59, 130, 246, 0.5)';
      } else {
        this.telemetryBadge.textContent = 'V2X DSRC 5.9 GHz';
        this.telemetryBadge.style.color = '#38bdf8';
        this.telemetryBadge.style.borderColor = 'rgba(56, 189, 248, 0.3)';
      }
    }

    const idleFuel = (vehicle.waitTime * 0.00022).toFixed(3);
    const idleCo2 = (vehicle.waitTime * 0.00022 * 2.31 * 1000).toFixed(1);
    const speedKmh = Math.round(vehicle.speed * 0.36);
    const accelDisplay = (vehicle.acceleration || 0).toFixed(1);
    const stateStatus = vehicle.hasExited ? 'Cleared' : (vehicle.speed < 2 ? 'Queued / Waiting' : 'Cruising');

    this.telemetryContainer.innerHTML = `
      <div style="margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
        <span style="font-weight: 700; color: #fff; font-size: 13px;">${vehicle.name || vehicle.id}</span>
        <span style="font-size: 11px; padding: 2px 6px; border-radius: 3px; font-weight: 600; background: ${vehicle.speed < 2 ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}; color: ${vehicle.speed < 2 ? '#f87171' : '#34d399'};">${stateStatus}</span>
      </div>
      <div class="telemetry-grid">
        <div class="telemetry-item">
          <div class="telemetry-item-label">Vehicle Type & Approach</div>
          <div class="telemetry-item-val" style="color: #cbd5e1;">${vehicle.type} · Road ${vehicle.roadId}</div>
        </div>
        <div class="telemetry-item">
          <div class="telemetry-item-label">Turn Maneuver</div>
          <div class="telemetry-item-val" style="color: #a855f7;">${vehicle.turn} ➔ Rd ${vehicle.targetRoad || 'Exit'}</div>
        </div>
        <div class="telemetry-item">
          <div class="telemetry-item-label">Current Velocity</div>
          <div class="telemetry-item-val">${vehicle.speed} px/s (${speedKmh} km/h)</div>
        </div>
        <div class="telemetry-item">
          <div class="telemetry-item-label">Acceleration</div>
          <div class="telemetry-item-val">${accelDisplay} px/s²</div>
        </div>
        <div class="telemetry-item">
          <div class="telemetry-item-label">Cumulative Delay</div>
          <div class="telemetry-item-val" style="color: ${vehicle.waitTime > 10 ? '#f87171' : '#34d399'};">${vehicle.waitTime} s</div>
        </div>
        <div class="telemetry-item">
          <div class="telemetry-item-label">Idling Fuel / CO₂</div>
          <div class="telemetry-item-val" style="color: #fbbf24;">${idleFuel} L / ${idleCo2} g</div>
        </div>
      </div>
    `;
  }

  renderExperimentResults(results) {
    if (!this.expResultsContainer) return;

    if (!results || results.length === 0) {
      this.expResultsContainer.innerHTML = `<div style="color: var(--text-dim);">No benchmark results yet.</div>`;
      return;
    }

    const rows = results.map(r => {
      const waitRed = r.impact.waitTimeReductionPct;
      const waitColor = waitRed >= 0 ? 'color: var(--color-green);' : 'color: var(--color-red);';
      const waitLabel = waitRed >= 0 ? `Reduction: ${waitRed}%` : `Increase: +${Math.abs(waitRed)}%`;

      return `
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
          <td style="padding: 10px 14px; font-weight: 600; color: #fff;">${r.name}</td>
          <td style="padding: 10px 14px; font-family: monospace; color: #93c5fd;">${r.fixed.avgWaitTime}s</td>
          <td style="padding: 10px 14px; font-family: monospace; color: #d8b4fe;">${r.adaptive.avgWaitTime}s</td>
          <td style="padding: 10px 14px; font-family: monospace; font-weight: 700; ${waitColor}">${waitLabel}</td>
          <td style="padding: 10px 14px; font-family: monospace; color: #38bdf8;">+${r.impact.throughputGainPct}%</td>
          <td style="padding: 10px 14px; font-family: monospace; color: #94a3b8;">${r.fixed.peakQueue} vs ${r.adaptive.peakQueue} cars</td>
        </tr>
      `;
    }).join('');

    this.expResultsContainer.innerHTML = `
      <div style="margin-top: 14px;">
        <table class="clean-table" style="width: 100%;">
          <thead>
            <tr>
              <th>Traffic Scenario</th>
              <th>Fixed-Time Avg Wait</th>
              <th>AI Adaptive Avg Wait</th>
              <th>Waiting Time Impact</th>
              <th>Throughput Gain</th>
              <th>Peak Queue (Fixed vs AI)</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
  }

  showToast(msg) {
    let toast = document.getElementById('app-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'app-toast';
      toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(15, 23, 42, 0.95);
        color: #f8fafc;
        border: 1px solid var(--border-accent);
        border-radius: 9999px;
        padding: 6px 18px;
        font-size: 12px;
        font-weight: 500;
        z-index: 9999;
        box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        transition: opacity 0.3s;
      `;
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = '1';
    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      toast.style.opacity = '0';
    }, 2400);
  }
}
