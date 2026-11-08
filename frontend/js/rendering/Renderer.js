/**
 * AI Adaptive Traffic Signal Digital Twin - Hero Canvas Intersection Renderer
 * High-visibility 2D rendering with Futuristic AI Perception HUD, Sensor Overlays,
 * Thermal ESG Heatmaps, V2X Platooning Communications, and Interactive Vehicle Inspection.
 */

import { SIM_CONFIG } from '../config.js';
import { Renderer3D } from './Renderer3D.js';
import { ThreeScene } from './ThreeScene.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    this.scale = 1.0;
    this.panX = 0;
    this.panY = 0;

    // 3D Perspective & Isometric Engine
    this.renderer3D = new Renderer3D(this);
    this.camera = this.renderer3D.camera;

    // High-End Photorealistic 3D Three.js WebGL Engine
    this.threeScene = null;
    const threeContainer = document.getElementById('three-container');
    if (threeContainer && window.THREE) {
      try {
        this.threeScene = new ThreeScene(threeContainer, this);
      } catch (err) {
        console.error('Failed to initialize ThreeScene:', err);
      }
    }

    // Perception & Digital Twin Modes
    this.visionMode = 'REALISTIC'; // 'REALISTIC', 'AI_VISION', 'THERMAL_ESG'
    this.weatherMode = 'CLEAR';    // 'CLEAR', 'RAIN'

    // Interactive Hover & Inspection
    this.hoveredVehicle = null;
    this.selectedVehicle = null;
    this.onVehicleSelect = null;
    this.cachedVehicles = [];

    // V2X & Dynamic Pulse Timers
    this.v2xPulsePhase = 0;
    this.sirenTimer = 0;
    this.smokeParticles = [];
    this.rainDrops = [];
    this.initRain();

    // School Scene & Campus Frontage Map View
    this.situationMode = 'NORMAL';
    this.forceSchoolMap = false;
    this.schoolBeaconTimer = 0;

    this.dpr = window.devicePixelRatio || 1;
    this.resize();
    this.bindEvents();
  }

  initRain() {
    this.rainDrops = [];
    for (let i = 0; i < 90; i++) {
      this.rainDrops.push({
        x: (Math.random() - 0.5) * 1100,
        y: (Math.random() - 0.5) * 1100,
        len: 12 + Math.random() * 16,
        speed: 400 + Math.random() * 300,
        opacity: 0.15 + Math.random() * 0.25
      });
    }
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * this.dpr;
    this.canvas.height = rect.height * this.dpr;

    const minDim = Math.min(rect.width, rect.height);
    this.scale = Math.max(0.75, Math.min(1.4, minDim / 620));
    this.panX = rect.width / 2;
    this.panY = rect.height / 2;
    if (this.threeScene) {
      this.threeScene.onWindowResize();
    }
  }

  bindEvents() {
    this.canvas.addEventListener('mousemove', (e) => {
      const world = this.screenToWorld(e.clientX, e.clientY);
      const prevHover = this.hoveredVehicle;
      this.hoveredVehicle = this.findVehicleNear(world.x, world.y);

      if (this.hoveredVehicle !== prevHover) {
        this.canvas.style.cursor = this.hoveredVehicle ? 'crosshair' : 'default';
        if (this.hoveredVehicle && this.onVehicleSelect) {
          this.onVehicleSelect(this.hoveredVehicle);
        }
      }
    });

    this.canvas.addEventListener('click', (e) => {
      const world = this.screenToWorld(e.clientX, e.clientY);
      const clicked = this.findVehicleNear(world.x, world.y);
      this.selectedVehicle = clicked;
      if (this.onVehicleSelect) {
        this.onVehicleSelect(clicked);
      }
    });

    window.addEventListener('resize', () => this.resize());
  }

  screenToWorld(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;
    return {
      x: (screenX - this.panX) / this.scale,
      y: (screenY - this.panY) / this.scale
    };
  }

  findVehicleNear(worldX, worldY, radius = 24) {
    for (const v of this.cachedVehicles) {
      if (v.hasExited) continue;
      const dx = v.x - worldX;
      const dy = v.y - worldY;
      if (Math.sqrt(dx * dx + dy * dy) <= radius) {
        return v;
      }
    }
    return null;
  }

  setVisionMode(mode) {
    this.visionMode = mode;
  }

  setWeatherMode(mode) {
    this.weatherMode = mode;
  }

  setSituationMode(mode) {
    this.situationMode = mode;
  }

  setCameraMode(mode) {
    if (this.camera) this.camera.mode = mode;
    if (this.threeScene) this.threeScene.setCameraMode(mode);
    if (this.renderer3D) this.renderer3D.setCameraMode(mode);

    const container = document.getElementById('three-container');
    if (container) {
      if (mode === '2D_PLAN') {
        container.style.display = 'none';
        this.canvas.style.pointerEvents = 'auto';
      } else {
        container.style.display = 'block';
        this.canvas.style.pointerEvents = 'none';
      }
    }
  }

  toggleOrbit() {
    if (this.threeScene) return this.threeScene.toggleOrbit();
    if (this.renderer3D) return this.renderer3D.toggleOrbit();
  }

  toggleSchoolMap(forceState = null) {
    if (forceState !== null) {
      this.forceSchoolMap = forceState;
    } else {
      this.forceSchoolMap = !this.forceSchoolMap;
    }
    return this.forceSchoolMap;
  }

  isSchoolMode(sim) {
    return Boolean(
      this.forceSchoolMap ||
      (sim && sim.pedestrians && sim.pedestrians.schoolZone && sim.pedestrians.schoolZone.active) ||
      (this.situationMode && this.situationMode.startsWith('SCHOOL'))
    );
  }

  render(sim) {
    if (!sim) return;

    this.cachedVehicles = sim.vehicles || [];
    const ctx = this.ctx;
    const width = this.canvas.width / this.dpr;
    const height = this.canvas.height / this.dpr;
    this.v2xPulsePhase = (this.v2xPulsePhase + 0.035) % (Math.PI * 2);
    this.schoolBeaconTimer = (this.schoolBeaconTimer + 0.06) % (Math.PI * 2);

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    // 3D Perspective Mode: Hardware-Accelerated Three.js WebGL Engine
    if (this.camera && this.camera.mode !== '2D_PLAN') {
      if (this.threeScene) {
        ctx.clearRect(0, 0, width, height);
        this.threeScene.update(sim);
        return;
      }
      this.renderer3D.render(ctx, sim, this.isSchoolMode(sim), width, height);
      return;
    }

    // Dynamic Atmosphere Backdrop
    ctx.fillStyle = this.weatherMode === 'RAIN' ? '#04070d' : '#080c14';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(this.panX, this.panY);
    ctx.scale(this.scale, this.scale);

    const isSchool = this.isSchoolMode(sim);

    // 1. Sidewalks & Surroundings (Campus Frontage in School Mode)
    this.drawSurroundings(ctx, sim, isSchool);

    // 2. Asphalt Roadways
    this.drawRoadways(ctx);

    // 3. Inductive Loop Detection Coils in Asphalt
    this.drawInductiveSensors(ctx, sim);

    // 4. Lane Markings, Double Solid Yellow, Stop Lines & Crosswalks
    this.drawRoadMarkings(ctx, isSchool);

    // 4b. Dedicated School Zone Road Stencils, Zig-zag lines & Flashing Beacons
    if (isSchool) {
      this.drawSchoolRoadFeatures(ctx, sim);
    }

    // 5. Crosswalks & Pedestrians (Walk Signals, Students & Scramble)
    this.drawPedestrians(ctx, sim, isSchool);

    // 6. Central Conflict Safety Area (in AI Vision mode)
    if (this.visionMode === 'AI_VISION') {
      this.drawConflictZone(ctx);
    }

    // 7. Thermal ESG Heatmaps (in Thermal mode)
    if (this.visionMode === 'THERMAL_ESG') {
      this.drawThermalHeatmaps(ctx, this.cachedVehicles);
    }

    // 8. Active Accident Scene & Severity Triage HUD
    this.drawAccidentScene(ctx, sim);

    // 9. Vehicles
    this.drawVehicles(ctx, this.cachedVehicles);

    // 10. AI Vision / LiDAR Perception Layer (Bounding Brackets, Vectors, Tags)
    if (this.visionMode === 'AI_VISION') {
      this.drawPerceptionOverlays(ctx, this.cachedVehicles);
      this.drawV2XCommunications(ctx, sim);
    }

    // 10b. School CV Sensor Array & Frustum Cone
    if (isSchool) {
      this.drawSchoolCvFrustum(ctx, sim);
    }

    // 11. Directional Pole-Mounted Visual/Acoustic Sirens
    this.drawDirectionalPoleSirens(ctx, sim);

    // 12. Interactive Targeting Reticle for Hovered or Selected Vehicle
    if (this.selectedVehicle || this.hoveredVehicle) {
      this.drawTargetingReticle(ctx, this.selectedVehicle || this.hoveredVehicle);
    }

    // 13. 3D Traffic Signal Heads & Countdown Badges
    this.drawTrafficSignals(ctx, sim);

    // 14. Directional Compass & Road Identification
    this.drawRoadLabels(ctx, isSchool);

    // 15. Weather Particles (Rain)
    if (this.weatherMode === 'RAIN') {
      this.drawRain(ctx);
    }

    ctx.restore();

    // 16. Screen-Space Top Canvas HUD for School Campus Map View
    if (isSchool) {
      this.drawSchoolMapHud(ctx, width, height, sim);
    }
  }

  drawSurroundings(ctx, sim, isSchool = false) {
    const span = 520;
    const rw = SIM_CONFIG.ROAD_WIDTH / 2; // 70px
    const cr = 28; // Corner radius

    if (isSchool) {
      this.drawSchoolCampusSurroundings(ctx, span, rw, cr, sim);
      return;
    }

    ctx.fillStyle = '#111827';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 2;

    // 4 Corner Sidewalk Blocks
    // Top-Left (NW)
    ctx.beginPath();
    ctx.moveTo(-span, -rw);
    ctx.lineTo(-rw - cr, -rw);
    ctx.arcTo(-rw, -rw, -rw, -rw - cr, cr);
    ctx.lineTo(-rw, -span);
    ctx.lineTo(-span, -span);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Top-Right (NE)
    ctx.beginPath();
    ctx.moveTo(span, -rw);
    ctx.lineTo(rw + cr, -rw);
    ctx.arcTo(rw, -rw, rw, -rw - cr, cr);
    ctx.lineTo(rw, -span);
    ctx.lineTo(span, -span);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Bottom-Right (SE)
    ctx.beginPath();
    ctx.moveTo(span, rw);
    ctx.lineTo(rw + cr, rw);
    ctx.arcTo(rw, rw, rw, rw + cr, cr);
    ctx.lineTo(rw, span);
    ctx.lineTo(span, span);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Bottom-Left (SW)
    ctx.beginPath();
    ctx.moveTo(-span, rw);
    ctx.lineTo(-rw - cr, rw);
    ctx.arcTo(-rw, rw, -rw, rw + cr, cr);
    ctx.lineTo(-rw, span);
    ctx.lineTo(-span, span);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  drawSchoolCampusSurroundings(ctx, span, rw, cr, sim) {
    // 1. Draw South-East & South-West standard urban corners
    ctx.fillStyle = '#111827';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 2;

    // Bottom-Right (SE)
    ctx.beginPath();
    ctx.moveTo(span, rw);
    ctx.lineTo(rw + cr, rw);
    ctx.arcTo(rw, rw, rw, rw + cr, cr);
    ctx.lineTo(rw, span);
    ctx.lineTo(span, span);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Bottom-Left (SW)
    ctx.beginPath();
    ctx.moveTo(-span, rw);
    ctx.lineTo(-rw - cr, rw);
    ctx.arcTo(-rw, rw, -rw, rw + cr, cr);
    ctx.lineTo(-rw, span);
    ctx.lineTo(-span, span);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 2. North-East (NE) Quad: College / School Sports Ground & Transit Pavilion
    ctx.save();
    // Base lawn
    ctx.fillStyle = '#0b1d14';
    ctx.beginPath();
    ctx.moveTo(span, -rw);
    ctx.lineTo(rw + cr, -rw);
    ctx.arcTo(rw, -rw, rw, -rw - cr, cr);
    ctx.lineTo(rw, -span);
    ctx.lineTo(span, -span);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Athletic Running Track (Oval)
    ctx.fillStyle = '#7f1d1d';
    ctx.beginPath();
    ctx.ellipse(280, -280, 150, 95, -0.15, 0, Math.PI * 2);
    ctx.fill();

    // Track Infield Turf
    ctx.fillStyle = '#14532d';
    ctx.beginPath();
    ctx.ellipse(280, -280, 110, 62, -0.15, 0, Math.PI * 2);
    ctx.fill();

    // White Track Lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.ellipse(280, -280, 130, 78, -0.15, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Track Banner
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '700 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('COLLEGE / SCHOOL ATHLETIC & SPORTS COMPLEX', 280, -280);

    // Student Transit Pavilion / Bus Shelter on East Sidewalk
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(rw + 6, -145, 52, 70);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(rw + 6, -145, 52, 70);

    // Glass Canopy Roof
    ctx.fillStyle = 'rgba(14, 165, 233, 0.35)';
    ctx.fillRect(rw + 4, -148, 56, 14);
    ctx.fillStyle = '#38bdf8';
    ctx.font = '700 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🚏 BUS STOP', rw + 32, -138);

    // Waiting Bench
    ctx.fillStyle = '#475569';
    ctx.fillRect(rw + 14, -118, 36, 6);
    ctx.fillRect(rw + 18, -100, 28, 6);

    // Directional Sign
    ctx.fillStyle = '#94a3b8';
    ctx.font = '700 8px sans-serif';
    ctx.fillText('➔ CITY MULTI-SPECIALTY TRAUMA & HEALTH SCIENCES', 200, -78);
    ctx.restore();

    // 3. North-West (NW) Quad: COLLEGE / SCHOOL MAIN CAMPUS
    ctx.save();
    // Base campus ground & manicured lawn
    ctx.fillStyle = '#0a2318';
    ctx.beginPath();
    ctx.moveTo(-span, -rw);
    ctx.lineTo(-rw - cr, -rw);
    ctx.arcTo(-rw, -rw, -rw, -rw - cr, cr);
    ctx.lineTo(-rw, -span);
    ctx.lineTo(-span, -span);
    ctx.closePath();
    ctx.fill();

    // Campus Paved Walkway Plaza
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-220, -140, 142, 65);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.strokeRect(-220, -140, 142, 65);

    // Campus Boundary Fence along Road A and Road D
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-rw - 6, -span);
    ctx.lineTo(-rw - 6, -140);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-span, -rw - 6);
    ctx.lineTo(-220, -rw - 6);
    ctx.stroke();

    // Fence Posts with Globe Lighting
    for (let py = -span; py <= -150; py += 55) {
      ctx.fillStyle = '#334155';
      ctx.fillRect(-rw - 10, py - 4, 8, 8);
      ctx.fillStyle = '#fef08a';
      ctx.beginPath(); ctx.arc(-rw - 6, py, 3, 0, Math.PI * 2); ctx.fill();
    }
    for (let px = -span; px <= -230; px += 55) {
      ctx.fillStyle = '#334155';
      ctx.fillRect(px - 4, -rw - 10, 8, 8);
      ctx.fillStyle = '#fef08a';
      ctx.beginPath(); ctx.arc(px, -rw - 6, 3, 0, Math.PI * 2); ctx.fill();
    }

    // MAIN ACADEMIC BUILDING (College / School Campus)
    const bldX = -490;
    const bldY = -480;
    const bldW = 345;
    const bldH = 320;

    // Building Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(bldX + 10, bldY + 10, bldW, bldH);

    // Building Main Structure
    ctx.fillStyle = '#1e1e2f';
    ctx.fillRect(bldX, bldY, bldW, bldH);
    ctx.strokeStyle = '#831843';
    ctx.lineWidth = 3;
    ctx.strokeRect(bldX, bldY, bldW, bldH);

    // Terracotta / Heritage Brick Wings
    ctx.fillStyle = '#4c0519';
    ctx.fillRect(bldX + 12, bldY + 14, bldW - 24, 60);
    ctx.fillRect(bldX + 12, bldY + 84, 110, bldH - 96);
    ctx.fillRect(bldX + bldW - 122, bldY + 84, 110, bldH - 96);

    // Classroom Windows Grid (Illuminated)
    const winCols = 7;
    const winRows = 4;
    for (let r = 0; r < winRows; r++) {
      for (let c = 0; c < winCols; c++) {
        const wx = bldX + 28 + c * 43;
        const wy = bldY + 22 + r * 13;
        ctx.fillStyle = (r + c) % 2 === 0 ? 'rgba(56, 189, 248, 0.45)' : 'rgba(253, 224, 71, 0.45)';
        ctx.fillRect(wx, wy, 20, 8);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(wx, wy, 20, 8);
      }
    }

    // Central Academic Colonnade / Portico & Clock Tower
    const portX = bldX + 130;
    const portY = bldY + 80;
    const portW = 85;
    const portH = 110;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(portX, portY, portW, portH);
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(portX, portY, portW, portH);

    // White Classical Pillars
    for (let p = 0; p < 4; p++) {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(portX + 8 + p * 20, portY + 28, 9, portH - 34);
    }

    // Clock Tower Spire & Dial
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(portX + 22, portY - 32, 40, 32);
    ctx.strokeStyle = '#facc15';
    ctx.strokeRect(portX + 22, portY - 32, 40, 32);

    // Clock Dial
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(portX + 42, portY - 16, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(portX + 42, portY - 16);
    ctx.lineTo(portX + 42, portY - 22); // 12 o'clock minute hand
    ctx.moveTo(portX + 42, portY - 16);
    ctx.lineTo(portX + 37, portY - 14); // ~8:45 AM hour hand
    ctx.stroke();

    // Clock Spire
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.moveTo(portX + 42, portY - 48);
    ctx.lineTo(portX + 32, portY - 32);
    ctx.lineTo(portX + 52, portY - 32);
    ctx.closePath();
    ctx.fill();

    // GRAND BUILDING FACADE SIGNBOARD
    ctx.fillStyle = '#020617';
    ctx.fillRect(bldX + 20, bldY + bldH - 42, bldW - 40, 32);
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 1.8;
    ctx.strokeRect(bldX + 20, bldY + bldH - 42, bldW - 40, 32);

    ctx.fillStyle = '#facc15';
    ctx.font = '700 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🏫 COLLEGE / SCHOOL CAMPUS — ACADEMIC BLOCK', bldX + bldW / 2, bldY + bldH - 26);

    ctx.fillStyle = '#38bdf8';
    ctx.font = '700 9px monospace';
    ctx.fillText('MAIN CAMPUS FRONTAGE · MAIN ARTERIAL ROAD · INSTITUTIONAL ZONE', bldX + bldW / 2, bldY + bldH - 14);

    // GRAND CAMPUS ENTRANCE GATE 1
    const gateX1 = -180;
    const gateX2 = -88;
    const gateY = -125;

    // Entrance Gate Base Pillars (Dark Granite & Gold)
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 1.5;
    ctx.fillRect(gateX1 - 10, gateY - 6, 16, 42);
    ctx.strokeRect(gateX1 - 10, gateY - 6, 16, 42);

    ctx.fillRect(gateX2 - 6, gateY - 6, 16, 42);
    ctx.strokeRect(gateX2 - 6, gateY - 6, 16, 42);

    // Glowing Globe Lamps on Pillars
    ctx.fillStyle = '#fef08a';
    ctx.beginPath(); ctx.arc(gateX1 - 2, gateY - 10, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(gateX2 + 2, gateY - 10, 5, 0, Math.PI * 2); ctx.fill();

    // Grand Overhead Archway Beam
    ctx.fillStyle = '#1e1b4b';
    ctx.fillRect(gateX1 - 10, gateY - 24, (gateX2 - gateX1) + 20, 18);
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 1.8;
    ctx.strokeRect(gateX1 - 10, gateY - 24, (gateX2 - gateX1) + 20, 18);

    ctx.fillStyle = '#fef08a';
    ctx.font = '700 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('★ COLLEGE / SCHOOL — MAIN ENTRANCE GATE ★', (gateX1 + gateX2) / 2, gateY - 12);

    // Security Gatehouse Cabin
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(gateX2 - 42, gateY - 2, 28, 22);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1;
    ctx.strokeRect(gateX2 - 42, gateY - 2, 28, 22);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.6)';
    ctx.fillRect(gateX2 - 38, gateY + 2, 12, 10);
    ctx.fillStyle = '#38bdf8';
    ctx.font = '700 6px sans-serif';
    ctx.fillText('SECURITY', gateX2 - 28, gateY + 18);

    // Automated Boom Barrier
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(gateX1 + 6, gateY + 20);
    ctx.lineTo(gateX2 - 44, gateY + 20);
    ctx.stroke();

    // DEDICATED SCHOOL BUS BAY & PARKED SCHOOL BUSES
    // Bus Bay Asphalt Pad
    ctx.fillStyle = '#182030';
    ctx.fillRect(-138, -345, 54, 180);
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(-138, -345, 54, 180);
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(250, 204, 21, 0.4)';
    ctx.font = '700 8px monospace';
    ctx.save();
    ctx.translate(-130, -255);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('SCHOOL BUS BAY ONLY', 0, 0);
    ctx.restore();

    // 1. Bus 1: COLLEGE / SCHOOL BUS (Parked)
    this.drawParkedSchoolBus(ctx, -110, -220, 'COLLEGE / SCHOOL BUS', 'TN 38 BJ 4421', 58, 24);

    // 2. Bus 2: COLLEGE / SCHOOL SHUTTLE (Parked)
    this.drawParkedSchoolBus(ctx, -110, -295, 'COLLEGE / SCHOOL SHUTTLE', 'TN 38 BJ 8802', 54, 24);

    // Landscaping Trees with Shadows
    const trees = [
      { x: -160, y: -190, r: 16 },
      { x: -185, y: -230, r: 18 },
      { x: -165, y: -285, r: 16 },
      { x: -210, y: -170, r: 15 },
      { x: -195, y: -110, r: 14 }
    ];

    for (const tr of trees) {
      // Tree drop shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.arc(tr.x + 3, tr.y + 3, tr.r, 0, Math.PI * 2);
      ctx.fill();

      // Deep green base foliage
      ctx.fillStyle = '#14532d';
      ctx.beginPath();
      ctx.arc(tr.x, tr.y, tr.r, 0, Math.PI * 2);
      ctx.fill();

      // Vibrant top foliage highlight
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(tr.x - 2, tr.y - 2, tr.r * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  drawParkedSchoolBus(ctx, x, y, busName, regNo, length = 56, width = 24) {
    ctx.save();
    ctx.translate(x, y);

    // Soft Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(-width / 2 + 2, -length / 2 + 3, width, length);

    // Bus Yellow Body
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(-width / 2, -length / 2, width, length);
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(-width / 2, -length / 2, width, length);

    // Black Contrast Belt along sides
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-width / 2, -length / 2 + 10, width, 5);
    ctx.fillRect(-width / 2, length / 2 - 15, width, 5);

    // White Roof Hatch
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-width / 2 + 4, -length / 2 + 18, width - 8, length - 36);

    // Front Windshield (Facing South toward gate)
    ctx.fillStyle = 'rgba(56, 189, 248, 0.7)';
    ctx.fillRect(-width / 2 + 2, length / 2 - 8, width - 4, 6);

    // Rear Window
    ctx.fillStyle = 'rgba(56, 189, 248, 0.5)';
    ctx.fillRect(-width / 2 + 2, -length / 2 + 2, width - 4, 4);

    // Side Windows
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    for (let wy = -length / 2 + 10; wy <= length / 2 - 18; wy += 8) {
      ctx.fillRect(-width / 2 + 1, wy, 2, 5);
      ctx.fillRect(width / 2 - 3, wy, 2, 5);
    }

    // Amber Strobe Clearance Lights
    const flash = Math.sin(this.schoolBeaconTimer * 5) > 0;
    ctx.fillStyle = flash ? '#facc15' : '#78350f';
    ctx.fillRect(-width / 2, -length / 2, 3, 3);
    ctx.fillRect(width / 2 - 3, -length / 2, 3, 3);
    ctx.fillRect(-width / 2, length / 2 - 3, 3, 3);
    ctx.fillRect(width / 2 - 3, length / 2 - 3, 3, 3);

    // Bus Lettering (Vertical along roof)
    ctx.fillStyle = '#0f172a';
    ctx.font = '700 7px sans-serif';
    ctx.save();
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText(busName, 0, 2);
    ctx.restore();

    ctx.restore();
  }

  drawSchoolRoadFeatures(ctx, sim) {
    const rw = SIM_CONFIG.ROAD_WIDTH / 2; // 70px

    // 1. Yellow Zig-Zag Safety Markings on Road A shoulders (School Zone Restriction)
    ctx.save();
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2.2;

    // Left shoulder zig-zag
    ctx.beginPath();
    let leftZig = true;
    for (let y = -85; y >= -320; y -= 16) {
      const x = leftZig ? -rw + 1 : -rw + 9;
      if (y === -85) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      leftZig = !leftZig;
    }
    ctx.stroke();

    // Right shoulder zig-zag
    ctx.beginPath();
    let rightZig = true;
    for (let y = -85; y >= -320; y -= 16) {
      const x = rightZig ? rw - 1 : rw - 9;
      if (y === -85) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      rightZig = !rightZig;
    }
    ctx.stroke();
    ctx.restore();

    // 2. Bold Asphalt Road Stencils on Road A
    ctx.save();
    ctx.fillStyle = '#facc15';
    ctx.font = '800 12px "JetBrains Mono", sans-serif';
    ctx.textAlign = 'center';

    // Incoming Lane (West half of Road A, centered at x = -35)
    ctx.fillText('SLOW', -35, -280);
    ctx.fillText('SCHOOL ZONE', -35, -245);
    ctx.fillText('25 KM/H', -35, -210);

    // Outgoing Lane (East half, centered at x = 35)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.fillText('SCHOOL ZONE', 35, -250);
    ctx.fillText('25 KM/H', 35, -220);
    ctx.restore();

    // 3. Overhead Cantilever Warning Gantry with Alternating Amber Beacons
    ctx.save();
    const gantryY = -175;

    // Steel Gantry Crossbeam across Road A
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(-rw - 8, gantryY);
    ctx.lineTo(rw + 8, gantryY);
    ctx.stroke();

    // Support Masts
    ctx.fillStyle = '#334155';
    ctx.fillRect(-rw - 10, gantryY - 4, 4, 8);
    ctx.fillRect(rw + 6, gantryY - 4, 4, 8);

    // Center Warning Diamond Sign
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.moveTo(0, gantryY - 14);
    ctx.lineTo(14, gantryY);
    ctx.lineTo(0, gantryY + 14);
    ctx.lineTo(-14, gantryY);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.font = '700 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🚸', 0, gantryY + 3);

    // Alternating Amber Beacons
    const beaconFlash = Math.sin(this.schoolBeaconTimer * 6) > 0;

    // Left Beacon (x = -32)
    this.drawSignalLens(ctx, -32, gantryY, '#f59e0b', beaconFlash);

    // Right Beacon (x = 32)
    this.drawSignalLens(ctx, 32, gantryY, '#f59e0b', !beaconFlash);

    ctx.restore();
  }

  drawSchoolCvFrustum(ctx, sim) {
    const camX = -78;
    const camY = -78;

    ctx.save();

    // 1. PTZ Camera Mast at Gate
    ctx.fillStyle = '#334155';
    ctx.beginPath(); ctx.arc(camX, camY, 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#06b6d4'; ctx.lineWidth = 1.5; ctx.stroke();

    // Camera Lens pointing towards crosswalk
    ctx.fillStyle = '#06b6d4';
    ctx.beginPath(); ctx.arc(camX + 3, camY + 3, 2.5, 0, Math.PI * 2); ctx.fill();

    // 2. Translucent Detection Frustum Beam
    const pulse = 0.5 + Math.sin(this.v2xPulsePhase * 2) * 0.2;
    const grad = ctx.createRadialGradient(camX, camY, 6, camX, camY, 95);
    grad.addColorStop(0, `rgba(234, 179, 8, ${0.35 * pulse})`);
    grad.addColorStop(0.7, `rgba(6, 182, 212, ${0.15 * pulse})`);
    grad.addColorStop(1, 'transparent');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(camX, camY);
    ctx.lineTo(camX + 65, camY - 20);
    ctx.lineTo(camX + 70, camY + 40);
    ctx.lineTo(camX - 35, camY + 40);
    ctx.closePath();
    ctx.fill();

    // Camera Tag
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(camX - 70, camY - 25, 65, 15, 3);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#facc15';
    ctx.font = '700 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CAM-04 (CV)', camX - 38, camY - 14);

    // 3. Highlight Waiting Students with CV Bounding Brackets
    const pedMgr = sim.pedestrians;
    if (pedMgr && pedMgr.pedestrians) {
      for (const p of pedMgr.pedestrians) {
        if (p.roadId === 'A' && p.state !== 'CLEARED') {
          const bx = p.x;
          const by = p.y;
          const bSize = 9;

          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          // Top-left
          ctx.moveTo(bx - bSize, by - bSize + 3); ctx.lineTo(bx - bSize, by - bSize); ctx.lineTo(bx - bSize + 3, by - bSize);
          // Top-right
          ctx.moveTo(bx + bSize - 3, by - bSize); ctx.lineTo(bx + bSize, by - bSize); ctx.lineTo(bx + bSize, by - bSize + 3);
          // Bottom-left
          ctx.moveTo(bx - bSize, by + bSize - 3); ctx.lineTo(bx - bSize, by + bSize); ctx.lineTo(bx - bSize + 3, by + bSize);
          // Bottom-right
          ctx.moveTo(bx + bSize - 3, by + bSize); ctx.lineTo(bx + bSize, by + bSize); ctx.lineTo(bx + bSize, by + bSize - 3);
          ctx.stroke();
        }
      }
    }

    // 4. Inflow Countdown / Walk Window Banner
    const school = pedMgr && pedMgr.schoolZone;
    if (school && school.active) {
      if (school.aggregationTimer > 0) {
        // Holding Green for trailing students
        ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(-100, -115, 200, 22, 5);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#facc15';
        ctx.font = '700 9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`⏱️ CV HOLD: ${school.aggregationTimer.toFixed(1)}s (AGGREGATING 6 INFLOW)`, 0, -100);
      } else if (school.crossingWindow > 0) {
        ctx.fillStyle = 'rgba(6, 78, 59, 0.95)';
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(-95, -115, 190, 22, 5);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#34d399';
        ctx.font = '700 9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`🚶 STUDENT WALK WINDOW: ${school.crossingWindow.toFixed(1)}s`, 0, -100);
      }
    }

    ctx.restore();
  }

  drawSchoolMapHud(ctx, width, height, sim) {
    ctx.save();
    const bannerW = Math.min(width - 32, 620);
    const bannerH = 32;
    const bannerX = (width - bannerW) / 2;
    const bannerY = 48;

    // Glass backdrop
    ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
    ctx.strokeStyle = 'rgba(234, 179, 8, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(bannerX, bannerY, bannerW, bannerH, 6);
    ctx.fill();
    ctx.stroke();

    // Gold icon
    ctx.fillStyle = '#facc15';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('🏫', bannerX + 10, bannerY + 21);

    // Title
    ctx.fillStyle = '#facc15';
    ctx.font = '700 11px sans-serif';
    ctx.fillText('CAMPUS FRONTAGE MAP: COLLEGE / SCHOOL (MAIN ARTERIAL RD)', bannerX + 30, bannerY + 20);

    // Right status badges
    const school = sim.pedestrians && sim.pedestrians.schoolZone;
    const conf = school && school.cvConfidence ? school.cvConfidence.toFixed(1) : '98.2';
    
    ctx.fillStyle = '#38bdf8';
    ctx.font = '700 10px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`🚸 25 KM/H · CV CAM-04: ${conf}%`, bannerX + bannerW - 12, bannerY + 20);

    ctx.restore();
  }

  drawRoadways(ctx) {
    const rw = SIM_CONFIG.ROAD_WIDTH;
    const halfRw = rw / 2;
    const span = 540;

    // Dark Asphalt with subtle wet sheen in rain
    ctx.fillStyle = this.weatherMode === 'RAIN' ? '#141c2c' : '#1e2638';

    // Vertical Road (North - South)
    ctx.fillRect(-halfRw, -span, rw, span * 2);
    // Horizontal Road (East - West)
    ctx.fillRect(-span, -halfRw, span * 2, rw);

    // Road Curbs
    ctx.strokeStyle = this.weatherMode === 'RAIN' ? '#475569' : '#374151';
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.moveTo(-halfRw, -span); ctx.lineTo(-halfRw, span);
    ctx.moveTo(halfRw, -span);  ctx.lineTo(halfRw, span);
    ctx.moveTo(-span, -halfRw); ctx.lineTo(span, -halfRw);
    ctx.moveTo(-span, halfRw);  ctx.lineTo(span, halfRw);
    ctx.stroke();
  }

  drawInductiveSensors(ctx, sim) {
    // Sensor loops placed 130px from center on incoming lanes
    const sensorDist = SIM_CONFIG.SENSOR_LOOP_OFFSET || 130;
    const loopLen = 34;
    const loopWid = 24;

    const sensorLocations = [
      // Road A (North incoming): x=-52.5 (lane 0), x=-17.5 (lane 1), y=-sensorDist
      { road: 'A', lane: 0, x: -52.5, y: -sensorDist, rot: 0 },
      { road: 'A', lane: 1, x: -17.5, y: -sensorDist, rot: 0 },
      // Road B (East incoming): y=-52.5 (lane 0), y=-17.5 (lane 1), x=sensorDist
      { road: 'B', lane: 0, x: sensorDist, y: -52.5, rot: Math.PI / 2 },
      { road: 'B', lane: 1, x: sensorDist, y: -17.5, rot: Math.PI / 2 },
      // Road C (South incoming): x=52.5 (lane 0), x=17.5 (lane 1), y=sensorDist
      { road: 'C', lane: 0, x: 52.5, y: sensorDist, rot: 0 },
      { road: 'C', lane: 1, x: 17.5, y: sensorDist, rot: 0 },
      // Road D (West incoming): y=52.5 (lane 0), y=17.5 (lane 1), x=-sensorDist
      { road: 'D', lane: 0, x: -sensorDist, y: 52.5, rot: Math.PI / 2 },
      { road: 'D', lane: 1, x: -sensorDist, y: 17.5, rot: Math.PI / 2 }
    ];

    for (const s of sensorLocations) {
      const roadObj = sim.roads ? sim.roads[s.road] : null;
      // Check if any vehicle is currently over this sensor
      let isOccupied = false;
      for (const v of this.cachedVehicles) {
        if (v.roadId === s.road && v.laneIndex === s.lane && Math.abs(v.x - s.x) < 22 && Math.abs(v.y - s.y) < 22) {
          isOccupied = true;
          break;
        }
      }

      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot);

      if (isOccupied) {
        // Glowing active sensor loop
        ctx.fillStyle = 'rgba(6, 182, 212, 0.22)';
        ctx.fillRect(-loopWid / 2, -loopLen / 2, loopWid, loopLen);

        ctx.strokeStyle = '#06b6d4';
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 10;
        ctx.lineWidth = 2;
        ctx.strokeRect(-loopWid / 2, -loopLen / 2, loopWid, loopLen);
        ctx.shadowBlur = 0;
      } else {
        // Subtle copper sensor coil embedded in asphalt
        ctx.strokeStyle = 'rgba(217, 119, 6, 0.28)';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(-loopWid / 2, -loopLen / 2, loopWid, loopLen);
      }

      ctx.restore();
    }
  }

  drawRoadMarkings(ctx, isSchool = false) {
    const halfRw = SIM_CONFIG.ROAD_WIDTH / 2;
    const stopOffset = SIM_CONFIG.STOP_LINE_OFFSET;
    const span = 500;

    // 1. Centerlines (Double Solid Yellow)
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    this.drawDoubleLine(ctx, 0, -span, 0, -stopOffset - 25);
    this.drawDoubleLine(ctx, 0, stopOffset + 25, 0, span);
    this.drawDoubleLine(ctx, -span, 0, -stopOffset - 25, 0);
    this.drawDoubleLine(ctx, stopOffset + 25, 0, span, 0);

    // 2. Dashed White Lane Dividers
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 2;
    ctx.setLineDash([12, 16]);

    ctx.beginPath(); ctx.moveTo(35, -span); ctx.lineTo(35, -stopOffset - 20); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-35, -span); ctx.lineTo(-35, -stopOffset - 20); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(35, stopOffset + 20); ctx.lineTo(35, span); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-35, stopOffset + 20); ctx.lineTo(-35, span); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(stopOffset + 20, 35); ctx.lineTo(span, 35); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(stopOffset + 20, -35); ctx.lineTo(span, -35); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-span, 35); ctx.lineTo(-stopOffset - 20, 35); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-span, -35); ctx.lineTo(-stopOffset - 20, -35); ctx.stroke();

    ctx.setLineDash([]);

    // 3. Zebra Crosswalks (North crosswalk highlighted in School Mode)
    this.drawCrosswalk(ctx, 'NORTH', -stopOffset - 12, isSchool);
    this.drawCrosswalk(ctx, 'SOUTH', stopOffset + 12);
    this.drawCrosswalk(ctx, 'WEST', -stopOffset - 12);
    this.drawCrosswalk(ctx, 'EAST', stopOffset + 12);

    // 4. Solid White Stop Lines (Across Inbound Lanes Only in RHT)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 5;

    // Road A (North incoming): on West side x in [-halfRw, 0] at y = -stopOffset
    ctx.beginPath(); ctx.moveTo(-halfRw, -stopOffset); ctx.lineTo(0, -stopOffset); ctx.stroke();
    // Road C (South incoming): on East side x in [0, halfRw] at y = stopOffset
    ctx.beginPath(); ctx.moveTo(0, stopOffset); ctx.lineTo(halfRw, stopOffset); ctx.stroke();
    // Road B (East incoming): on North side y in [-halfRw, 0] at x = stopOffset
    ctx.beginPath(); ctx.moveTo(stopOffset, -halfRw); ctx.lineTo(stopOffset, 0); ctx.stroke();
    // Road D (West incoming): on South side y in [0, halfRw] at x = -stopOffset
    ctx.beginPath(); ctx.moveTo(-stopOffset, 0); ctx.lineTo(-stopOffset, halfRw); ctx.stroke();
  }

  drawDoubleLine(ctx, x1, y1, x2, y2) {
    const isVertical = x1 === x2;
    const gap = 3;
    ctx.beginPath();
    if (isVertical) {
      ctx.moveTo(x1 - gap, y1); ctx.lineTo(x2 - gap, y2);
      ctx.moveTo(x1 + gap, y1); ctx.lineTo(x2 + gap, y2);
    } else {
      ctx.moveTo(x1, y1 - gap); ctx.lineTo(x2, y2 - gap);
      ctx.moveTo(x1, y1 + gap); ctx.lineTo(x2, y2 + gap);
    }
    ctx.stroke();
  }

  drawCrosswalk(ctx, direction, offset, isSchoolCrosswalk = false) {
    ctx.fillStyle = isSchoolCrosswalk ? 'rgba(250, 204, 21, 0.85)' : 'rgba(255, 255, 255, 0.4)';
    const rw = SIM_CONFIG.ROAD_WIDTH;
    const halfRw = rw / 2;
    const stripeWidth = 6;
    const stripeLen = 18;

    if (direction === 'NORTH' || direction === 'SOUTH') {
      for (let x = -halfRw + 4; x <= halfRw - 8; x += 12) {
        ctx.fillRect(x, offset - (stripeLen / 2), stripeWidth, stripeLen);
      }
    } else {
      for (let y = -halfRw + 4; y <= halfRw - 8; y += 12) {
        ctx.fillRect(offset - (stripeLen / 2), y, stripeLen, stripeWidth);
      }
    }
  }

  drawConflictZone(ctx) {
    const halfRw = SIM_CONFIG.ROAD_WIDTH / 2;
    // Central Conflict Safety Area
    ctx.save();
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.35)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(-halfRw, -halfRw, halfRw * 2, halfRw * 2);
    ctx.setLineDash([]);

    // Corner targeting brackets
    const bLen = 12;
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2;

    // NW
    ctx.beginPath(); ctx.moveTo(-halfRw, -halfRw + bLen); ctx.lineTo(-halfRw, -halfRw); ctx.lineTo(-halfRw + bLen, -halfRw); ctx.stroke();
    // NE
    ctx.beginPath(); ctx.moveTo(halfRw - bLen, -halfRw); ctx.lineTo(halfRw, -halfRw); ctx.lineTo(halfRw, -halfRw + bLen); ctx.stroke();
    // SE
    ctx.beginPath(); ctx.moveTo(halfRw, halfRw - bLen); ctx.lineTo(halfRw, halfRw); ctx.lineTo(halfRw - bLen, halfRw); ctx.stroke();
    // SW
    ctx.beginPath(); ctx.moveTo(-halfRw + bLen, halfRw); ctx.lineTo(-halfRw, halfRw); ctx.lineTo(-halfRw, halfRw - bLen); ctx.stroke();

    ctx.fillStyle = 'rgba(6, 182, 212, 0.5)';
    ctx.font = '700 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CONFLICT SAFETY ZONE', 0, -halfRw + 14);

    ctx.restore();
  }

  drawThermalHeatmaps(ctx, vehicles) {
    ctx.save();
    for (const v of vehicles) {
      if (v.hasExited) continue;
      const isStopped = v.speed < 5.0;

      if (isStopped) {
        // Red / Amber Idle Thermal Emission Aura (Fuel Wasting Hotspot)
        const pulse = Math.sin(Date.now() / 250) * 4;
        const rad = Math.max(16, (v.waitTime || 5) * 1.8 + pulse);
        const grad = ctx.createRadialGradient(v.x, v.y, 4, v.x, v.y, Math.min(rad, 55));
        grad.addColorStop(0, 'rgba(239, 68, 68, 0.65)');
        grad.addColorStop(0.5, 'rgba(249, 115, 22, 0.35)');
        grad.addColorStop(1, 'transparent');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(v.x, v.y, Math.min(rad, 55), 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Moving: Cool green aerodynamic low-carbon slipstream
        const grad = ctx.createRadialGradient(v.x, v.y, 2, v.x, v.y, 25);
        grad.addColorStop(0, 'rgba(16, 185, 129, 0.35)');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(v.x, v.y, 25, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  drawVehicles(ctx, vehicles) {
    for (const v of vehicles) {
      if (v.hasExited) continue;

      const maneuver = v.intendedManeuver || v.maneuver || 'STRAIGHT';
      const len = v.length || 32;
      const wid = v.width || 16;
      const halfL = len / 2;
      const halfW = wid / 2;

      ctx.save();
      ctx.translate(v.x, v.y);
      ctx.rotate(v.angle);

      // Vehicle Shadow (soft dark offset)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.roundRect(-halfL + 2, -halfW + 2, len, wid, 4);
      ctx.fill();

      // Vehicle Body
      ctx.fillStyle = v.color || '#38bdf8';
      ctx.beginPath();
      ctx.roundRect(-halfL, -halfW, len, wid, 4);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Cabin Glass & Roof
      ctx.fillStyle = '#0f172a';
      const frontGlassX = len * 0.16;
      const rearGlassX = -len * 0.28;
      const glassMargin = 2.5;

      // Front Windshield
      ctx.fillRect(frontGlassX - 2, -halfW + glassMargin, 4.5, wid - (glassMargin * 2));
      // Rear Glass
      ctx.fillRect(rearGlassX - 2, -halfW + glassMargin + 0.5, 3.5, wid - (glassMargin * 2) - 1);
      // Roof between windshields
      ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
      ctx.fillRect(rearGlassX + 1.5, -halfW + glassMargin + 0.5, frontGlassX - rearGlassX - 3.5, wid - (glassMargin * 2) - 1);

      // Headlight Beams (casting forward in +X)
      ctx.fillStyle = 'rgba(254, 240, 138, 0.16)';
      ctx.beginPath();
      ctx.moveTo(halfL, -halfW + 2);
      ctx.lineTo(halfL + 40, -halfW - 12);
      ctx.lineTo(halfL + 40, -halfW + 10);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(halfL, halfW - 2);
      ctx.lineTo(halfL + 40, halfW - 10);
      ctx.lineTo(halfL + 40, halfW + 12);
      ctx.closePath();
      ctx.fill();

      // Headlight LEDs (at front bumper facing +X)
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(halfL - 2, -halfW + 1.5, 2, 2.5);
      ctx.fillRect(halfL - 2, halfW - 4, 2, 2.5);

      // Brake / Taillights (at rear bumper facing -X)
      if (v.brakeLightsOn) {
        ctx.fillStyle = '#ff2222';
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 8;
        ctx.fillRect(-halfL, -halfW + 1, 2.5, 3.5);
        ctx.fillRect(-halfL, halfW - 4.5, 2.5, 3.5);
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = '#7f1d1d';
        ctx.fillRect(-halfL, -halfW + 1.5, 2, 2.5);
        ctx.fillRect(-halfL, halfW - 4, 2, 2.5);
      }

      // Turn Signals
      if (v.turnSignalOn) {
        ctx.fillStyle = '#f59e0b';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 6;
        if (maneuver === 'RIGHT') {
          ctx.fillRect(halfL - 2, halfW - 2.5, 2.5, 2.5);
          ctx.fillRect(-halfL, halfW - 2.5, 2.5, 2.5);
        } else if (maneuver === 'LEFT') {
          ctx.fillRect(halfL - 2, -halfW, 2.5, 2.5);
          ctx.fillRect(-halfL, -halfW, 2.5, 2.5);
        }
        ctx.shadowBlur = 0;
      }

      // Emergency Siren
      if (v.isEmergency) {
        const sirenFlash = (Math.floor(Date.now() / 120) % 2 === 0);
        ctx.fillStyle = sirenFlash ? '#ef4444' : '#3b82f6';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      ctx.restore();
    }
  }

  drawPerceptionOverlays(ctx, vehicles) {
    ctx.save();
    for (const v of vehicles) {
      if (v.hasExited) continue;
      const len = v.length || 32;
      const wid = v.width || 16;
      const halfL = len / 2 + 4;
      const halfW = wid / 2 + 4;
      const bColor = v.isEmergency ? '#ef4444' : (v.type === 'BUS' ? '#f59e0b' : '#00f5ff');

      ctx.save();
      ctx.translate(v.x, v.y);

      // Velocity Vector Arrow projecting in travel heading
      const vecLen = Math.max(12, (v.speed || 40) * 0.3);
      ctx.save();
      ctx.rotate(v.angle);
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(halfL - 4, 0);
      ctx.lineTo(halfL + vecLen, 0);
      ctx.stroke();
      // Arrowhead
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.moveTo(halfL + vecLen, 0);
      ctx.lineTo(halfL + vecLen - 4, -3);
      ctx.lineTo(halfL + vecLen - 4, 3);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Bounding brackets
      ctx.rotate(v.angle);
      ctx.strokeStyle = bColor;
      ctx.lineWidth = 1.2;
      const bCorner = 5;

      // 4 Corner Brackets
      ctx.beginPath();
      ctx.moveTo(-halfL, -halfW + bCorner); ctx.lineTo(-halfL, -halfW); ctx.lineTo(-halfL + bCorner, -halfW);
      ctx.moveTo(halfL - bCorner, -halfW); ctx.lineTo(halfL, -halfW); ctx.lineTo(halfL, -halfW + bCorner);
      ctx.moveTo(halfL, halfW - bCorner); ctx.lineTo(halfL, halfW); ctx.lineTo(halfL - bCorner, halfW);
      ctx.moveTo(-halfL + bCorner, halfW); ctx.lineTo(-halfL, halfW); ctx.lineTo(-halfL, halfW - bCorner);
      ctx.stroke();

      // Classification & Speed Tag
      ctx.rotate(-v.angle); // keep text horizontal
      ctx.fillStyle = 'rgba(10, 15, 26, 0.85)';
      ctx.fillRect(-28, -halfW - 17, 56, 11);
      ctx.strokeStyle = bColor;
      ctx.lineWidth = 0.8;
      ctx.strokeRect(-28, -halfW - 17, 56, 11);

      ctx.fillStyle = bColor;
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      const spdKmh = Math.round((v.speed || 0) * 0.4);
      ctx.fillText(`${v.id} · ${spdKmh}km/h`, 0, -halfW - 9);

      ctx.restore();
    }
    ctx.restore();
  }

  drawV2XCommunications(ctx, sim) {
    // Pulse radio communication waves from traffic light masts
    const stopOffset = SIM_CONFIG.STOP_LINE_OFFSET;
    const halfRw = SIM_CONFIG.ROAD_WIDTH / 2;
    const masts = [
      { x: -halfRw - 16, y: -stopOffset },
      { x: stopOffset, y: -halfRw - 16 },
      { x: halfRw + 16, y: stopOffset },
      { x: -stopOffset, y: halfRw + 16 }
    ];

    ctx.save();
    for (const m of masts) {
      const radius = 20 + ((this.v2xPulsePhase * 25) % 75);
      const alpha = Math.max(0, 0.4 - (radius / 180));

      ctx.strokeStyle = `rgba(6, 182, 212, ${alpha})`;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.arc(m.x, m.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();
  }

  drawTargetingReticle(ctx, v) {
    if (!v || v.hasExited) return;

    ctx.save();
    ctx.translate(v.x, v.y);

    const time = Date.now() / 200;
    const r = 26;

    // Rotating Outer Reticle Rings
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, r, time, time + Math.PI * 0.7);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, r, time + Math.PI, time + Math.PI * 1.7);
    ctx.stroke();

    // Crosshairs
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-r - 6, 0); ctx.lineTo(-r + 2, 0);
    ctx.moveTo(r - 2, 0);  ctx.lineTo(r + 6, 0);
    ctx.moveTo(0, -r - 6); ctx.lineTo(0, -r + 2);
    ctx.moveTo(0, r - 2);  ctx.lineTo(0, r + 6);
    ctx.stroke();

    // Floating Target HUD Tag
    ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(28, -26, 110, 52, 4);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#a855f7';
    ctx.fillText(`TARGET: ${v.id}`, 34, -14);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '8px monospace';
    const spd = Math.round((v.speed || 0) * 0.4);
    ctx.fillText(`SPD: ${spd} km/h`, 34, -3);
    ctx.fillText(`WAIT: ${v.waitTime || 0}s`, 34, 8);
    ctx.fillText(`ROUTE: ${v.maneuver || 'THRU'}`, 34, 19);

    ctx.restore();
  }

  drawTrafficSignals(ctx, sim) {
    const halfRw = SIM_CONFIG.ROAD_WIDTH / 2;
    const stopOffset = SIM_CONFIG.STOP_LINE_OFFSET;

    const signalPosts = [
      { roadId: 'A', x: -halfRw - 16, y: -stopOffset, angle: 0 },
      { roadId: 'B', x: stopOffset,   y: -halfRw - 16, angle: 0 },
      { roadId: 'C', x: halfRw + 16,  y: stopOffset,   angle: 0 },
      { roadId: 'D', x: -stopOffset,  y: halfRw + 16,  angle: 0 }
    ];

    for (const post of signalPosts) {
      const road = sim.roads ? sim.roads[post.roadId] : null;
      if (!road) continue;

      ctx.save();
      ctx.translate(post.x, post.y);
      ctx.rotate(post.angle);

      // Signal Housing
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(-9, -22, 18, 44, 4);
      ctx.fill();
      ctx.stroke();

      const state = road.signalState;
      const isRed = state === 'RED' || state === 'ALL_RED';
      const isYellow = state === 'YELLOW';
      const isGreen = state === 'GREEN';

      this.drawSignalLens(ctx, 0, -13, isRed ? '#ef4444' : '#450a0a', isRed);
      this.drawSignalLens(ctx, 0, 0, isYellow ? '#f59e0b' : '#451a03', isYellow);
      this.drawSignalLens(ctx, 0, 13, isGreen ? '#10b981' : '#022c22', isGreen);

      // Countdown Timer Badge
      const countdown = Math.ceil(road.remainingInPhase || 0);
      ctx.save();
      ctx.rotate(-post.angle);

      const badgeY = -34;
      ctx.fillStyle = 'rgba(10, 15, 26, 0.9)';
      ctx.strokeStyle = isGreen ? '#10b981' : (isYellow ? '#f59e0b' : '#ef4444');
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(-14, badgeY - 8, 28, 16, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isGreen ? '#34d399' : (isYellow ? '#fbbf24' : '#f87171');
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${countdown}s`, 0, badgeY);

      ctx.restore();
      ctx.restore();
    }
  }

  drawSignalLens(ctx, x, y, color, isActive) {
    const r = 5;
    ctx.save();
    if (isActive) {
      const grad = ctx.createRadialGradient(x, y, 1, x, y, 16);
      grad.addColorStop(0, color);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, 16, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
    }

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.restore();
  }

  drawRoadLabels(ctx, isSchool = false) {
    const labels = isSchool ? [
      { text: 'MAIN ARTERIAL RD · COLLEGE / SCHOOL FRONT', x: 35,  y: -230, rot: -Math.PI / 2 },
      { text: 'COLLEGE / SCHOOL ACCESS ROAD · SOUTH', x: -35, y: 230,  rot: Math.PI / 2 },
      { text: 'MAIN ARTERIAL RD · EASTBOUND', x: 230, y: 35,   rot: 0 },
      { text: 'MAIN ARTERIAL RD · WESTBOUND', x: -230, y: -35, rot: Math.PI }
    ] : [
      { text: 'ROAD A · NORTH', x: 35,  y: -230, rot: -Math.PI / 2 },
      { text: 'ROAD C · SOUTH', x: -35, y: 230,  rot: Math.PI / 2 },
      { text: 'ROAD B · EAST',  x: 230, y: 35,   rot: 0 },
      { text: 'ROAD D · WEST',  x: -230, y: -35, rot: Math.PI }
    ];

    ctx.save();
    for (const item of labels) {
      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.rotate(item.rot);
      ctx.font = '700 11px sans-serif';
      ctx.fillStyle = isSchool ? 'rgba(250, 204, 21, 0.75)' : 'rgba(255, 255, 255, 0.35)';
      ctx.textAlign = 'center';
      ctx.fillText(item.text, 0, 0);
      ctx.restore();
    }
    ctx.restore();
  }

  drawRain(ctx) {
    ctx.save();
    ctx.strokeStyle = 'rgba(147, 197, 253, 0.28)';
    ctx.lineWidth = 1.2;
    const angle = 0.25; // diagonal rain
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    for (const drop of this.rainDrops) {
      drop.y += drop.speed * 0.016;
      drop.x += drop.speed * 0.016 * 0.25;

      if (drop.y > 550) {
        drop.y = -550;
        drop.x = (Math.random() - 0.5) * 1100;
      }

      ctx.beginPath();
      ctx.moveTo(drop.x, drop.y);
      ctx.lineTo(drop.x + drop.len * sinA, drop.y + drop.len * cosA);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawDirectionalPoleSirens(ctx, sim) {
    if (!sim || !sim.directionalSirens) return;

    this.sirenTimer += 0.04;
    const poles = [
      { id: 'A', name: 'NORTH POLE', x: -85, y: -90, aimAngle: -Math.PI / 2 },
      { id: 'B', name: 'EAST POLE',  x: 90,  y: -85, aimAngle: 0 },
      { id: 'C', name: 'SOUTH POLE', x: 85,  y: 90,  aimAngle: Math.PI / 2 },
      { id: 'D', name: 'WEST POLE',  x: -90, y: 85,  aimAngle: Math.PI }
    ];

    for (const p of poles) {
      const data = sim.directionalSirens[p.id] || {};
      const isActive = data.active;
      const isFire = data.type === 'FIRE_ENGINE';
      const isPolice = data.type === 'POLICE';
      const isCrash = data.type === 'ACCIDENT';

      ctx.save();
      ctx.translate(p.x, p.y);

      // 1. Pole Mast Base
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Pole Core
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();

      if (isActive) {
        // High-Intensity Emergency Strobe
        const flashRate = Math.sin(this.sirenTimer * 14);
        const isBlue = flashRate > 0;
        let beaconColor = isBlue ? '#38bdf8' : '#ef4444';
        if (isFire) {
          beaconColor = isBlue ? '#f59e0b' : '#ef4444';
        } else if (isPolice) {
          beaconColor = isBlue ? '#3b82f6' : '#ef4444';
        }

        // Radial Strobe Flash Flare
        ctx.save();
        ctx.shadowColor = beaconColor;
        ctx.shadowBlur = 24 + Math.abs(flashRate) * 12;
        ctx.fillStyle = beaconColor;
        ctx.beginPath();
        ctx.arc(0, 0, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Directional Acoustic Sound Waves expanding towards approach road
        ctx.save();
        ctx.rotate(p.aimAngle);
        for (let i = 1; i <= 3; i++) {
          const waveRadius = 14 + ((this.sirenTimer * 45 + i * 22) % 65);
          const waveAlpha = Math.max(0, 1.0 - (waveRadius / 65));
          ctx.strokeStyle = isFire 
            ? `rgba(245, 158, 11, ${waveAlpha * 0.85})` 
            : (isPolice ? `rgba(59, 130, 246, ${waveAlpha * 0.85})` : `rgba(56, 189, 248, ${waveAlpha * 0.85})`);
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(0, 0, waveRadius, -Math.PI / 3.5, Math.PI / 3.5);
          ctx.stroke();
        }
        ctx.restore();

        // Acoustic Decibel HUD Pill
        ctx.save();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
        ctx.strokeStyle = beaconColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(-46, -26, 92, 16, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = beaconColor;
        ctx.font = '700 9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        let label = '🚨 SIREN: 115 dB';
        if (isPolice) label = '🚓 POLICE: 110 dB';
        else if (isCrash) label = '💥 CRASH: 115 dB';
        else if (isFire) label = '🚒 FIRE: 115 dB';
        ctx.fillText(label, 0, -15);
        ctx.restore();
      } else {
        // Idle utility beacon indicator
        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  drawAccidentScene(ctx, sim) {
    const acc = sim.activeAccident;
    if (!acc) {
      this.smokeParticles = [];
      return;
    }

    const roadId = acc.roadId || 'C';
    let x = 0, y = 0, rot = 0;
    if (roadId === 'A') { x = -35; y = -190; rot = Math.PI / 2; }
    else if (roadId === 'B') { x = 190; y = -35; rot = Math.PI; }
    else if (roadId === 'C') { x = 35; y = 190; rot = -Math.PI / 2; }
    else { x = -190; y = 35; rot = 0; }

    const isCritical = acc.classification === 'CRITICAL_EMERGENCY';
    const accentColor = isCritical ? '#ef4444' : '#f59e0b';

    ctx.save();
    ctx.translate(x, y);

    // Hazard Boundary Zone
    const pulse = 0.5 + Math.sin(this.v2xPulsePhase * 2) * 0.3;
    ctx.fillStyle = isCritical ? `rgba(239, 68, 68, ${0.14 * pulse})` : `rgba(245, 158, 11, ${0.14 * pulse})`;
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 1.8;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(-50, -35, 100, 70);
    ctx.fillRect(-50, -35, 100, 70);
    ctx.setLineDash([]);

    // 2 Collided Vehicles (at an angle with hazard lights)
    // Vehicle 1
    ctx.save();
    ctx.translate(-14, 0);
    ctx.rotate(rot + 0.28);
    ctx.fillStyle = '#64748b';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.fillRect(-14, -8, 28, 16);
    ctx.strokeRect(-14, -8, 28, 16);
    // Hazard flashers
    if (Math.sin(this.v2xPulsePhase * 6) > 0) {
      ctx.fillStyle = '#f59e0b';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 6;
      ctx.fillRect(-14, -8, 4, 3);
      ctx.fillRect(-14, 5, 4, 3);
      ctx.fillRect(10, -8, 4, 3);
      ctx.fillRect(10, 5, 4, 3);
      ctx.shadowBlur = 0;
    }
    ctx.restore();

    // Vehicle 2
    ctx.save();
    ctx.translate(14, -4);
    ctx.rotate(rot - 0.38);
    ctx.fillStyle = '#0284c7';
    ctx.strokeStyle = '#0369a1';
    ctx.lineWidth = 1.5;
    ctx.fillRect(-14, -8, 28, 16);
    ctx.strokeRect(-14, -8, 28, 16);
    if (Math.sin(this.v2xPulsePhase * 6) > 0) {
      ctx.fillStyle = '#f59e0b';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 6;
      ctx.fillRect(-14, -8, 4, 3);
      ctx.fillRect(-14, 5, 4, 3);
      ctx.fillRect(10, -8, 4, 3);
      ctx.fillRect(10, 5, 4, 3);
      ctx.shadowBlur = 0;
    }
    ctx.restore();

    // Critical Crash: Smoke Particle Emitters
    if (isCritical) {
      if (Math.random() < 0.4) {
        this.smokeParticles.push({
          rx: (Math.random() - 0.5) * 16,
          ry: (Math.random() - 0.5) * 16,
          vx: (Math.random() - 0.5) * 6,
          vy: -14 - Math.random() * 14,
          radius: 4 + Math.random() * 4,
          life: 1.0
        });
      }

      for (let i = this.smokeParticles.length - 1; i >= 0; i--) {
        const sp = this.smokeParticles[i];
        sp.rx += sp.vx * 0.03;
        sp.ry += sp.vy * 0.03;
        sp.radius += 0.15;
        sp.life -= 0.025;

        if (sp.life <= 0) {
          this.smokeParticles.splice(i, 1);
          continue;
        }

        ctx.fillStyle = `rgba(148, 163, 184, ${sp.life * 0.45})`;
        ctx.beginPath();
        ctx.arc(sp.rx, sp.ry, sp.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // AI Computer Vision Bounding HUD Tag
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(-110, -58, 220, 20, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = accentColor;
    ctx.font = '700 9px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    if (isCritical) {
      ctx.fillText(`🚨 CRITICAL ${acc.gForce}G | AIRBAG ON | 108 CAD SENT`, 0, -44);
    } else {
      ctx.fillText(`🛡️ MINOR ${acc.gForce}G | 0 CASUALTY | 108 SUPPRESSED`, 0, -44);
    }
    ctx.restore();

    ctx.restore();
  }

  drawPedestrians(ctx, sim, isSchool = false) {
    const pedMgr = sim.pedestrians;
    if (!pedMgr) return;

    const isScramble = pedMgr.scrambleActive;
    const rw = SIM_CONFIG.ROAD_WIDTH / 2;
    const offset = 75;

    // Crosswalk zebra stripes
    const crosswalks = [
      { road: 'A', x1: -rw, y1: -offset, x2: rw, y2: -offset },
      { road: 'B', x1: offset, y1: -rw, x2: offset, y2: rw },
      { road: 'C', x1: -rw, y1: offset, x2: rw, y2: offset },
      { road: 'D', x1: -offset, y1: -rw, x2: -offset, y2: rw }
    ];

    for (const cw of crosswalks) {
      ctx.save();
      if (isScramble) {
        // Bright Neon Green pedestrian scramble corridor glow
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.5)';
        ctx.lineWidth = 22;
        ctx.beginPath();
        ctx.moveTo(cw.x1, cw.y1);
        ctx.lineTo(cw.x2, cw.y2);
        ctx.stroke();
      }

      // Zebra Stripes (North crosswalk highlighted in School Mode)
      const isNorthSchool = isSchool && cw.road === 'A';
      ctx.strokeStyle = isNorthSchool ? '#facc15' : (isScramble ? '#34d399' : 'rgba(255, 255, 255, 0.65)');
      ctx.lineWidth = isNorthSchool ? 4.5 : 3.5;
      ctx.setLineDash([7, 6]);
      ctx.beginPath();
      ctx.moveTo(cw.x1, cw.y1);
      ctx.lineTo(cw.x2, cw.y2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // Scramble Diagonal Crossings (Barnes Dance)
    if (isScramble) {
      ctx.save();
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.35)';
      ctx.lineWidth = 4;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(-rw, -rw); ctx.lineTo(rw, rw);
      ctx.moveTo(rw, -rw);  ctx.lineTo(-rw, rw);
      ctx.stroke();
      ctx.setLineDash([]);

      // Center Scramble Badge
      ctx.fillStyle = 'rgba(6, 78, 59, 0.9)';
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(-80, -14, 160, 28, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#34d399';
      ctx.font = '700 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`🚶 BARNES DANCE (${pedMgr.scrambleTimer}s)`, 0, 4);
      ctx.restore();
    }

    // Draw Individual Pedestrians / Students
    const pedestrians = pedMgr.pedestrians || [];
    for (const p of pedestrians) {
      if (p.state === 'CLEARED') continue;

      ctx.save();
      ctx.translate(p.x, p.y);

      const isWalking = p.state === 'CROSSING';
      const legOffset = isWalking ? Math.sin(p.walkPhase || 0) * 3 : 0;
      const isStudent = isSchool && p.roadId === 'A';

      // Legs / Steps
      ctx.strokeStyle = isStudent ? '#1e3a8a' : '#1e293b';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-2, 0); ctx.lineTo(-2 + legOffset, 5);
      ctx.moveTo(2, 0);  ctx.lineTo(2 - legOffset, 5);
      ctx.stroke();

      // Torso / Student Uniform
      ctx.fillStyle = isStudent ? '#bfdbfe' : (isWalking ? '#10b981' : '#38bdf8');
      ctx.beginPath();
      ctx.roundRect(-3, -4, 6, 6, 2);
      ctx.fill();

      // Student Backpack (🎒)
      if (isStudent) {
        ctx.fillStyle = '#ea580c';
        ctx.beginPath();
        ctx.roundRect(-5, -5, 3.5, 6, 1.2);
        ctx.fill();
        ctx.strokeStyle = '#c2410c';
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }

      // Head
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(0, -6, 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }
}
