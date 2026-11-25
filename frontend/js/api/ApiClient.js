/**
 * AI Adaptive Traffic Signal Digital Twin - Frontend API Service Layer
 * Clean interface communicating with the Python backend simulation engine over REST APIs.
 */

export class ApiClient {
  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
    this.isOnline = true;
  }

  async request(endpoint, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout || 300);

    try {
      const res = await fetch(`${this.baseUrl}${endpoint}`, {
        signal: options.signal || controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {})
        },
        ...options
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      this.isOnline = true;
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        return await res.json();
      }
      return await res.text();
    } catch (err) {
      clearTimeout(timeoutId);
      this.isOnline = false;
      throw err;
    }
  }

  /**
   * Retrieves full state snapshot of both twin simulations from backend
   */
  async getState() {
    return await this.request('/api/state');
  }

  /**
   * Sends playback control actions (play, pause, step, reset, speed, viewMode)
   */
  async sendControl(action, extra = {}) {
    return await this.request('/api/control', {
      method: 'POST',
      body: JSON.stringify({ action, ...extra })
    });
  }

  /**
   * Updates traffic generation preset
   */
  async setPreset(presetKey) {
    return await this.request('/api/traffic/preset', {
      method: 'POST',
      body: JSON.stringify({ preset: presetKey })
    });
  }

  /**
   * Updates inbound arrival rates per road
   */
  async setRates(rates) {
    return await this.request('/api/traffic/rates', {
      method: 'POST',
      body: JSON.stringify({ rates })
    });
  }

  /**
   * Configures baseline fixed-time controller green durations
   */
  async setFixedTimings(greenDurations) {
    return await this.request('/api/signals/fixed', {
      method: 'POST',
      body: JSON.stringify({ greenDurations })
    });
  }

  /**
   * Configures AI adaptive controller minimum/maximum green bounds
   */
  async setAdaptiveBounds(minGreen, maxGreen) {
    return await this.request('/api/signals/adaptive', {
      method: 'POST',
      body: JSON.stringify({ minGreen, maxGreen })
    });
  }

  /**
   * Triggers manual vehicle injection into simulation stream
   */
  async spawnVehicle(roadId, type = 'SEDAN', isEmergency = false) {
    return await this.request('/api/vehicles/spawn', {
      method: 'POST',
      body: JSON.stringify({ roadId, type, isEmergency })
    });
  }

  /**
   * Triggers backend automated batch experiment evaluation
   */
  async runExperiment(durationSec = 120.0) {
    return await this.request('/api/experiment/run', {
      method: 'POST',
      body: JSON.stringify({ durationSec })
    });
  }

  /**
   * Retrieves latest experiment evaluation report
   */
  async getExperimentReport() {
    return await this.request('/api/experiment/report');
  }

  /**
   * Sets AI Signal Optimization algorithm (WEBSTER, RL_DQN, V2X_PRIORITY)
   */
  async setAlgorithm(algorithm) {
    return await this.request('/api/signals/algorithm', {
      method: 'POST',
      body: JSON.stringify({ algorithm })
    });
  }

  /**
   * Sets environmental weather condition (CLEAR, RAIN)
   */
  async setWeather(weather) {
    return await this.request('/api/environment/weather', {
      method: 'POST',
      body: JSON.stringify({ weather })
    });
  }

  /**
   * Triggers real-time incident or priority stress event (AMBULANCE, BUS, SURGE_ROAD_B)
   */
  async triggerIncident(type, extra = {}) {
    return await this.request('/api/incident/trigger', {
      method: 'POST',
      body: JSON.stringify({ type, ...extra })
    });
  }

  /**
   * Sets situation mode for jury demonstration
   */
  async setSituationMode(mode) {
    return await this.request('/api/situation/mode', {
      method: 'POST',
      body: JSON.stringify({ mode })
    });
  }

  /**
   * Triggers collision with sub-second AI triage evaluation
   */
  async triggerAccident(severity = 'CRITICAL', roadId = 'C') {
    return await this.request('/api/accident/trigger', {
      method: 'POST',
      body: JSON.stringify({ severity, roadId })
    });
  }

  /**
   * Clears active accident
   */
  async clearAccident() {
    return await this.request('/api/accident/clear', {
      method: 'POST'
    });
  }

  /**
   * Triggers pedestrian crosswalk demand call on specified road
   */
  async pressPedestrianButton(roadId = 'A') {
    return await this.request('/api/pedestrian/button', {
      method: 'POST',
      body: JSON.stringify({ roadId })
    });
  }

  /**
   * Triggers pedestrian crowd surge & Barnes Dance scramble phase
   */
  async triggerPedestrianSurge() {
    return await this.request('/api/pedestrian/surge', {
      method: 'POST'
    });
  }

  /**
   * Sets arterial corridor coordination mode
   */
  async setCorridorMode(mode) {
    return await this.request('/api/corridor/mode', {
      method: 'POST',
      body: JSON.stringify({ mode })
    });
  }

  /**
   * Triggers crime scene with sub-second AI public safety triage (Police 112 CAD)
   */
  async triggerCrime(threatType = 'CRITICAL', roadId = 'B') {
    return await this.request('/api/crime/trigger', {
      method: 'POST',
      body: JSON.stringify({ threatType, roadId })
    });
  }

  /**
   * Clears active crime incident
   */
  async clearCrime() {
    return await this.request('/api/crime/clear', {
      method: 'POST'
    });
  }

  /**
   * Triggers Smart School Zone dynamic student crossing scenario
   */
  async triggerSchoolZone(scenario = 'SMALL_GROUP') {
    return await this.request('/api/school/trigger', {
      method: 'POST',
      body: JSON.stringify({ scenario })
    });
  }

  /**
   * Retrieves Bagalur Cross live real-time traffic and weather telemetry
   */
  async getRealtimeStatus() {
    return await this.request('/api/realtime/bagalur-cross');
  }

  /**
   * Configures real-time sync mode, toggle state, or TomTom API key
   */
  async setRealtimeConfig(config = {}) {
    return await this.request('/api/realtime/config', {
      method: 'POST',
      body: JSON.stringify(config)
    });
  }

  /**
   * Pushes edge camera / CV detection count to real-time ingestion gateway
   */
  async sendCameraCount(road = 'A', count = 1, fps = 30.0) {
    return await this.request('/api/realtime/vehicle-count', {
      method: 'POST',
      body: JSON.stringify({ road, count, fps })
    });
  }
}

