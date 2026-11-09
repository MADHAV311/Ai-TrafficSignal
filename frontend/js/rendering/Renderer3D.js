/**
 * AI Adaptive Traffic Signal Digital Twin - High-End 3D Realistic Renderer
 * Features:
 * - 3D Perspective & Isometric Projection with Interactive 360° Orbit & Tilt
 * - 3D Extruded Vehicles: Metallic Chassis, Elevated Cabins, Wheels, Volumetric Headlights & Taillights
 * - 3D High-Rise Cityscape: University Campus, Clock Tower, Hospital Emergency Bay, Metro Viaduct
 * - 3D Cantilever Traffic Signal Gantries with Hooded LED Optics & Ground Light Wash
 * - 3D Directional Corner Pole Sirens (Poles A-D) with Rotating Strobes & Acoustic Shockwaves
 * - 3D Pedestrians & Radiant Barnes Dance Crosswalks
 */

import { SIM_CONFIG } from '../config.js';

export class Renderer3D {
  constructor(parentRenderer) {
    this.parent = parentRenderer;
    this.canvas = parentRenderer.canvas;

    // 3D Perspective Camera System
    this.camera = {
      mode: '3D_PERSPECTIVE', // '3D_PERSPECTIVE', '3D_ORBIT', '3D_STREET', '2D_PLAN'
      yaw: -0.52,             // approx -30 degrees initial rotation
      pitch: 0.98,            // approx 56 degrees tilt from vertical
      zoom: 1.05,
      targetYaw: -0.52,
      targetPitch: 0.98,
      targetZoom: 1.05,
      isOrbiting: false,
      orbitSpeed: 0.003,
      isDragging: false,
      dragStartX: 0,
      dragStartY: 0,
      hasDragged: false,
      cameraDist: 850
    };

    // Animation Timers
    this.metroTrainX = -380;
    this.strobeAngle = 0;
    this.sirenShockwaves = [];
    this.smokePuffs = [];

    this.bindMouseControls();
  }

  setCameraMode(mode) {
    this.camera.mode = mode;
    this.camera.isOrbiting = false;

    if (mode === '3D_PERSPECTIVE') {
      this.camera.targetYaw = -0.52;
      this.camera.targetPitch = 0.98;
      this.camera.targetZoom = 1.05;
    } else if (mode === '3D_ORBIT') {
      this.camera.isOrbiting = true;
      this.camera.targetPitch = 0.98;
      this.camera.targetZoom = 1.05;
    } else if (mode === '3D_STREET') {
      this.camera.targetYaw = -0.32;
      this.camera.targetPitch = 0.44; // low-angle eye-level street view
      this.camera.targetZoom = 1.45;
    } else if (mode === '2D_PLAN') {
      this.camera.targetYaw = 0;
      this.camera.targetPitch = 1.57; // 90 deg top-down
      this.camera.targetZoom = 1.0;
    }
  }

  toggleOrbit() {
    this.camera.isOrbiting = !this.camera.isOrbiting;
    if (this.camera.isOrbiting) {
      this.camera.mode = '3D_ORBIT';
    } else {
      this.camera.mode = '3D_PERSPECTIVE';
    }
    return this.camera.isOrbiting;
  }

  bindMouseControls() {
    const canvas = this.canvas;
    let isDown = false;
    let startX = 0, startY = 0;
    let startYaw = 0, startPitch = 0;

    canvas.addEventListener('mousedown', (e) => {
      if (this.camera.mode === '2D_PLAN') return;
      isDown = true;
      this.camera.isDragging = true;
      this.camera.hasDragged = false;
      startX = e.clientX;
      startY = e.clientY;
      startYaw = this.camera.targetYaw;
      startPitch = this.camera.targetPitch;
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        this.camera.hasDragged = true;
      }

      this.camera.targetYaw = startYaw + dx * 0.006;
      this.camera.targetPitch = Math.max(0.35, Math.min(1.50, startPitch + dy * 0.005));
      this.camera.isOrbiting = false;
    });

    window.addEventListener('mouseup', () => {
      if (!isDown) return;
      isDown = false;
      this.camera.isDragging = false;
    });

    canvas.addEventListener('wheel', (e) => {
      if (this.camera.mode === '2D_PLAN') return;
      e.preventDefault();
      const zoomDelta = e.deltaY * -0.001;
      this.camera.targetZoom = Math.max(0.5, Math.min(2.5, this.camera.targetZoom + zoomDelta));
    }, { passive: false });

    // Touch controls for mobile / tablet
    let touchStartX = 0, touchStartY = 0;
    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        startYaw = this.camera.targetYaw;
        startPitch = this.camera.targetPitch;
      }
    });

    canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1) {
        const dx = e.touches[0].clientX - touchStartX;
        const dy = e.touches[0].clientY - touchStartY;
        this.camera.targetYaw = startYaw + dx * 0.008;
        this.camera.targetPitch = Math.max(0.35, Math.min(1.50, startPitch + dy * 0.007));
        this.camera.isOrbiting = false;
      }
    });
  }

  // 3D Perspective Projection
  project(x, y, z = 0) {
    if (this.camera.mode === '2D_PLAN') {
      return {
        x: this.parent.panX + x * this.parent.scale,
        y: this.parent.panY + y * this.parent.scale,
        depth: 0,
        scale: this.parent.scale,
        persp: 1.0
      };
    }

    // 1. Rotate around Z axis by camera yaw
    const cosY = Math.cos(this.camera.yaw);
    const sinY = Math.sin(this.camera.yaw);
    const x1 = x * cosY - y * sinY;
    const y1 = x * sinY + y * cosY;

    // 2. Tilt by camera pitch
    const sinP = Math.sin(this.camera.pitch);
    const cosP = Math.cos(this.camera.pitch);
    const y2 = y1 * sinP - z * cosP;
    const z2 = y1 * cosP + z * sinP;

    // 3. Perspective foreshortening
    const depth = this.camera.cameraDist + z2;
    const persp = Math.max(0.22, Math.min(2.4, this.camera.cameraDist / Math.max(120, depth)));

    return {
      x: this.parent.panX + x1 * persp * this.parent.scale * this.camera.zoom,
      y: this.parent.panY + y2 * persp * this.parent.scale * this.camera.zoom,
      depth: y1, // depth for painter's algorithm sorting
      scale: persp * this.parent.scale * this.camera.zoom,
      persp: persp
    };
  }

  findVehicleAtScreen(clientX, clientY, vehicles) {
    const rect = this.canvas.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;

    let closest = null;
    let minDist = 34;

    for (const v of vehicles) {
      if (v.hasExited) continue;
      const sp = this.project(v.x, v.y, 8);
      const dx = sp.x - sx;
      const dy = sp.y - sy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) {
        minDist = dist;
        closest = v;
      }
    }
    return closest;
  }

  adjustColor(color, factor) {
    if (!color) return '#38bdf8';
    if (color.startsWith('#')) {
      let c = color.slice(1);
      if (c.length === 3) c = c.split('').map(x => x + x).join('');
      const num = parseInt(c, 16);
      let r = Math.min(255, Math.max(0, Math.floor((num >> 16) * factor)));
      let g = Math.min(255, Math.max(0, Math.floor(((num >> 8) & 0x00FF) * factor)));
      let b = Math.min(255, Math.max(0, Math.floor((num & 0x0000FF) * factor)));
      return `rgb(${r},${g},${b})`;
    }
    return color;
  }

  // Draw 3D Extruded Box with Directional Shading
  draw3DBox(ctx, cx, cy, cz, len, wid, height, angle = 0, colors = {}) {
    const halfL = len / 2;
    const halfW = wid / 2;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    const localCorners = [
      { x: -halfL, y: -halfW }, // 0: rear left
      { x:  halfL, y: -halfW }, // 1: front left
      { x:  halfL, y:  halfW }, // 2: front right
      { x: -halfL, y:  halfW }, // 3: rear right
    ];

    const bot = [];
    const top = [];
    for (let i = 0; i < 4; i++) {
      const wx = cx + (localCorners[i].x * cosA - localCorners[i].y * sinA);
      const wy = cy + (localCorners[i].x * sinA + localCorners[i].y * cosA);
      bot.push(this.project(wx, wy, cz));
      top.push(this.project(wx, wy, cz + height));
    }

    // Ground Shadow
    if (colors.shadow !== false) {
      ctx.fillStyle = colors.shadow || 'rgba(0, 0, 0, 0.40)';
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const shX = cx + (localCorners[i].x * cosA - localCorners[i].y * sinA) + 4;
        const shY = cy + (localCorners[i].x * sinA + localCorners[i].y * cosA) + 4;
        const sp = this.project(shX, shY, 0);
        if (i === 0) ctx.moveTo(sp.x, sp.y);
        else ctx.lineTo(sp.x, sp.y);
      }
      ctx.closePath();
      ctx.fill();
    }

    // Side Walls with Directional Sun Shading
    const sides = [
      { idx: [0, 1], normal: { x: 0, y: -1 } },
      { idx: [1, 2], normal: { x: 1, y: 0 } },
      { idx: [2, 3], normal: { x: 0, y: 1 } },
      { idx: [3, 0], normal: { x: -1, y: 0 } }
    ];

    for (const side of sides) {
      const i0 = side.idx[0];
      const i1 = side.idx[1];
      const b0 = bot[i0], b1 = bot[i1], t1 = top[i1], t0 = top[i0];

      // Back-face culling
      const cross = (b1.x - b0.x) * (t0.y - b0.y) - (b1.y - b0.y) * (t0.x - b0.x);
      if (cross > 0) continue;

      const wxNormal = side.normal.x * cosA - side.normal.y * sinA;
      const wyNormal = side.normal.x * sinA + side.normal.y * cosA;
      const dot = -(wxNormal * -0.5 + wyNormal * -0.8);
      const shadeFactor = Math.max(0.42, Math.min(1.0, 0.72 + dot * 0.28));

      ctx.fillStyle = colors.side || this.adjustColor(colors.body || '#38bdf8', shadeFactor * 0.88);
      ctx.beginPath();
      ctx.moveTo(b0.x, b0.y);
      ctx.lineTo(b1.x, b1.y);
      ctx.lineTo(t1.x, t1.y);
      ctx.lineTo(t0.x, t0.y);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = colors.edge || 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Top Roof Face
    ctx.fillStyle = colors.roof || colors.body || '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(top[0].x, top[0].y);
    ctx.lineTo(top[1].x, top[1].y);
    ctx.lineTo(top[2].x, top[2].y);
    ctx.lineTo(top[3].x, top[3].y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = colors.edge || 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();

    return { bot, top };
  }

  // Master 3D Render Loop
  render(ctx, sim, isSchool, width, height) {
    // 1. Update Camera Animations
    if (this.camera.isOrbiting) {
      this.camera.yaw += this.camera.orbitSpeed;
      this.camera.targetYaw = this.camera.yaw;
    } else {
      this.camera.yaw += (this.camera.targetYaw - this.camera.yaw) * 0.12;
    }
    this.camera.pitch += (this.camera.targetPitch - this.camera.pitch) * 0.12;
    this.camera.zoom += (this.camera.targetZoom - this.camera.zoom) * 0.12;
    this.strobeAngle = (this.strobeAngle + 0.14) % (Math.PI * 2);

    // 2. Dynamic City Sky Backdrop
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
    if (this.parent.weatherMode === 'RAIN') {
      skyGrad.addColorStop(0, '#02050b');
      skyGrad.addColorStop(1, '#090d16');
    } else {
      skyGrad.addColorStop(0, '#060a12');
      skyGrad.addColorStop(0.6, '#0b1120');
      skyGrad.addColorStop(1, '#111827');
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height);

    // 3. Ground Plane & 3D Asphalt Roads
    this.draw3DGroundAndRoads(ctx, sim, isSchool);

    // 4. 3D Architectural Cityscape (Campus, Skyscrapers, Hospital, Metro)
    this.draw3DCityscape(ctx, sim, isSchool);

    // 5. 3D Inductive Loop Detection Grooves
    this.draw3DInductiveSensors(ctx, sim);

    // 6. 3D Crosswalks & Pedestrians
    this.draw3DPedestrians(ctx, sim, isSchool);

    // 7. 3D Vehicles (Sorted Back-to-Front by Depth)
    this.draw3DVehicles(ctx, sim.vehicles || []);

    // 8. 3D Cantilever Signal Gantries & Overhead LED Heads
    this.draw3DTrafficSignals(ctx, sim);

    // 9. 3D Directional Corner Pole Sirens (Poles A–D)
    this.draw3DPoleSirens(ctx, sim);

    // 10. 3D Accident Scene & Collision Particle Smoke
    this.draw3DAccidentScene(ctx, sim);

    // 11. Atmospheric Rain (if Rain Mode)
    if (this.parent.weatherMode === 'RAIN') {
      this.draw3DRain(ctx, width, height);
    }

    // 12. Floating Presentation HUD Badge
    this.draw3DPresentationBadge(ctx, width, height);
  }

  // 3. Ground Plane & 3D Asphalt Roads
  draw3DGroundAndRoads(ctx, sim, isSchool) {
    const rw = SIM_CONFIG.ROAD_WIDTH / 2; // 70px
    const span = 560;

    // Grass / Ground Base
    const groundPts = [
      this.project(-span, -span, 0),
      this.project( span, -span, 0),
      this.project( span,  span, 0),
      this.project(-span,  span, 0)
    ];
    ctx.fillStyle = '#0a101d';
    ctx.beginPath();
    ctx.moveTo(groundPts[0].x, groundPts[0].y);
    ctx.lineTo(groundPts[1].x, groundPts[1].y);
    ctx.lineTo(groundPts[2].x, groundPts[2].y);
    ctx.lineTo(groundPts[3].x, groundPts[3].y);
    ctx.closePath();
    ctx.fill();

    // 3D Beveled Sidewalk Curbs (Height: 4px)
    const curbs = [
      { x1: -span, y1: -rw, x2: -rw, y2: -rw },
      { x1:  rw,   y1: -rw, x2:  span, y2: -rw },
      { x1: -span, y1:  rw, x2: -rw, y2:  rw },
      { x1:  rw,   y1:  rw, x2:  span, y2:  rw },
      { x1: -rw,   y1: -span, x2: -rw, y2: -rw },
      { x1:  rw,   y1: -span, x2:  rw, y2: -rw },
      { x1: -rw,   y1:  rw,   x2: -rw, y2:  span },
      { x1:  rw,   y1:  rw,   x2:  rw, y2:  span }
    ];
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2.5;
    for (const c of curbs) {
      const p1 = this.project(c.x1, c.y1, 3);
      const p2 = this.project(c.x2, c.y2, 3);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    // East-West Asphalt Road
    const ewRoad = [
      this.project(-span, -rw, 0),
      this.project( span, -rw, 0),
      this.project( span,  rw, 0),
      this.project(-span,  rw, 0)
    ];
    ctx.fillStyle = '#171e2e'; // dark asphalt
    ctx.beginPath();
    ctx.moveTo(ewRoad[0].x, ewRoad[0].y);
    ctx.lineTo(ewRoad[1].x, ewRoad[1].y);
    ctx.lineTo(ewRoad[2].x, ewRoad[2].y);
    ctx.lineTo(ewRoad[3].x, ewRoad[3].y);
    ctx.closePath();
    ctx.fill();

    // North-South Asphalt Road
    const nsRoad = [
      this.project(-rw, -span, 0),
      this.project( rw, -span, 0),
      this.project( rw,  span, 0),
      this.project(-rw,  span, 0)
    ];
    ctx.fillStyle = '#171e2e';
    ctx.beginPath();
    ctx.moveTo(nsRoad[0].x, nsRoad[0].y);
    ctx.lineTo(nsRoad[1].x, nsRoad[1].y);
    ctx.lineTo(nsRoad[2].x, nsRoad[2].y);
    ctx.lineTo(nsRoad[3].x, nsRoad[3].y);
    ctx.closePath();
    ctx.fill();

    // Central Intersection Plateau
    const centerBox = [
      this.project(-rw, -rw, 0),
      this.project( rw, -rw, 0),
      this.project( rw,  rw, 0),
      this.project(-rw,  rw, 0)
    ];
    ctx.fillStyle = '#1a2234';
    ctx.beginPath();
    ctx.moveTo(centerBox[0].x, centerBox[0].y);
    ctx.lineTo(centerBox[1].x, centerBox[1].y);
    ctx.lineTo(centerBox[2].x, centerBox[2].y);
    ctx.lineTo(centerBox[3].x, centerBox[3].y);
    ctx.closePath();
    ctx.fill();

    // Double Solid Yellow Centerlines
    this.draw3DDoubleYellow(ctx, -span, 0, -rw - 30, 0);
    this.draw3DDoubleYellow(ctx,  rw + 30, 0,  span, 0);
    this.draw3DDoubleYellow(ctx, 0, -span, 0, -rw - 30);
    this.draw3DDoubleYellow(ctx, 0,  rw + 30, 0,  span);

    // Stoplines (Solid White)
    this.draw3DStopline(ctx, -rw, -rw - 2, 0, -rw - 2);   // North approach
    this.draw3DStopline(ctx,  rw + 2, -rw,  rw + 2, 0);   // East approach
    this.draw3DStopline(ctx, 0,  rw + 2,  rw,  rw + 2);   // South approach
    this.draw3DStopline(ctx, -rw - 2, 0, -rw - 2,  rw);   // West approach
  }

  draw3DDoubleYellow(ctx, x1, y1, x2, y2) {
    const isHoriz = Math.abs(y1 - y2) < 2;
    const off = 2.2;
    const p1a = this.project(x1, isHoriz ? y1 - off : y1, 0.5);
    const p2a = this.project(x2, isHoriz ? y2 - off : y2, 0.5);
    const p1b = this.project(x1, isHoriz ? y1 + off : y1, 0.5);
    const p2b = this.project(x2, isHoriz ? y2 + off : y2, 0.5);

    ctx.strokeStyle = '#f59e0b'; // amber yellow
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p1a.x, p1a.y);
    ctx.lineTo(p2a.x, p2a.y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(p1b.x, p1b.y);
    ctx.lineTo(p2b.x, p2b.y);
    ctx.stroke();
  }

  draw3DStopline(ctx, x1, y1, x2, y2) {
    const p1 = this.project(x1, y1, 0.6);
    const p2 = this.project(x2, y2, 0.6);
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }

  // 4. 3D Architectural Cityscape
  draw3DCityscape(ctx, sim, isSchool) {
    // A. NORTH-WEST QUADRANT: University / Metro Campus
    this.draw3DBox(ctx, -240, -220, 0, 160, 100, 75, 0, {
      body: '#831843', // deep brick red
      roof: '#9d174d',
      side: '#500724',
      edge: 'rgba(255, 255, 255, 0.2)'
    });
    // Campus Clock Tower
    this.draw3DBox(ctx, -145, -165, 0, 42, 42, 135, 0, {
      body: '#334155',
      roof: '#475569',
      side: '#1e293b'
    });
    // Clock Face
    const clockCenter = this.project(-145, -165, 115);
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(clockCenter.x, clockCenter.y, 7 * clockCenter.persp, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Campus Courtyard Trees
    this.draw3DTree(ctx, -210, -135, 32);
    this.draw3DTree(ctx, -260, -145, 38);
    this.draw3DTree(ctx, -140, -240, 30);

    // B. NORTH-EAST QUADRANT: Smart City Financial Tower
    // Tier 1 Base
    this.draw3DBox(ctx, 220, -220, 0, 150, 130, 110, 0, {
      body: '#0369a1',
      roof: '#0284c7',
      side: '#075985'
    });
    // Tier 2 Middle
    this.draw3DBox(ctx, 220, -220, 110, 115, 95, 70, 0, {
      body: '#0284c7',
      roof: '#38bdf8',
      side: '#0369a1'
    });
    // Tier 3 Rooftop Helipad
    this.draw3DBox(ctx, 220, -220, 180, 75, 65, 30, 0, {
      body: '#0f172a',
      roof: '#1e293b',
      side: '#0284c7'
    });
    // Glowing 'H' Helipad Marking
    const heliCenter = this.project(220, -220, 211);
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2.5 * heliCenter.persp;
    ctx.beginPath();
    ctx.arc(heliCenter.x, heliCenter.y, 14 * heliCenter.persp, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#facc15';
    ctx.font = `bold ${Math.floor(14 * heliCenter.persp)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('H', heliCenter.x, heliCenter.y);

    // C. SOUTH-EAST QUADRANT: City Multi-Specialty Trauma Care & Emergency Center
    this.draw3DBox(ctx, 220, 220, 0, 170, 125, 80, 0, {
      body: '#f1f5f9',
      roof: '#e2e8f0',
      side: '#cbd5e1'
    });
    // Red Medical Cross on Hospital Roof
    const crossCenter = this.project(220, 220, 81);
    ctx.fillStyle = '#ef4444';
    const cw = 18 * crossCenter.persp;
    const ch = 6 * crossCenter.persp;
    ctx.fillRect(crossCenter.x - ch / 2, crossCenter.y - cw / 2, ch, cw);
    ctx.fillRect(crossCenter.x - cw / 2, crossCenter.y - ch / 2, cw, ch);

    // Ambulance Emergency Drop-Off Canopy
    this.draw3DBox(ctx, 135, 145, 0, 60, 45, 26, 0, {
      body: '#334155',
      roof: '#0284c7',
      side: '#1e293b'
    });

    // D. SOUTH-WEST QUADRANT: Metro Tech Park & Smart City Edge Hub
    this.draw3DBox(ctx, -220, 220, 0, 150, 130, 70, 0, {
      body: '#1e293b',
      roof: '#334155',
      side: '#0f172a'
    });
    // 5G RSU Communications Mast
    this.draw3DBox(ctx, -135, 145, 0, 6, 6, 95, 0, {
      body: '#94a3b8',
      roof: '#e2e8f0'
    });
    const mastTop = this.project(-135, 145, 96);
    ctx.fillStyle = (Math.sin(this.strobeAngle * 2) > 0) ? '#38bdf8' : '#0369a1';
    ctx.beginPath();
    ctx.arc(mastTop.x, mastTop.y, 4.5 * mastTop.persp, 0, Math.PI * 2);
    ctx.fill();

    // E. ELEVATED 3D SMART CITY METRO VIADUCT
    this.draw3DMetroViaduct(ctx);
  }

  draw3DTree(ctx, tx, ty, height) {
    // Tree Trunk
    this.draw3DBox(ctx, tx, ty, 0, 8, 8, height * 0.45, 0, {
      body: '#78350f',
      roof: '#92400e',
      shadow: false
    });
    // Tree Foliage Dome
    const fCenter = this.project(tx, ty, height);
    const r = (height * 0.42) * fCenter.persp;
    const grad = ctx.createRadialGradient(fCenter.x - r * 0.3, fCenter.y - r * 0.3, r * 0.2, fCenter.x, fCenter.y, r);
    grad.addColorStop(0, '#22c55e');
    grad.addColorStop(1, '#15803d');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(fCenter.x, fCenter.y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Elevated 3D Smart City Metro Viaduct & Moving Train
  draw3DMetroViaduct(ctx) {
    const viaductY = -105;
    const deckHeight = 44;
    const span = 560;

    // Concrete Support Pillars
    const pillarsX = [-360, -200, 0, 200, 360];
    for (const px of pillarsX) {
      if (Math.abs(px) < 60) continue; // clear intersection road
      this.draw3DBox(ctx, px, viaductY, 0, 14, 14, deckHeight, 0, {
        body: '#64748b',
        roof: '#94a3b8',
        side: '#475569'
      });
    }

    // Concrete Track Deck
    this.draw3DBox(ctx, 0, viaductY, deckHeight, span * 2, 24, 6, 0, {
      body: '#475569',
      roof: '#334155',
      side: '#1e293b'
    });

    // Sleek Metro Train Gliding Across
    this.metroTrainX += 1.8;
    if (this.metroTrainX > span + 100) this.metroTrainX = -span - 120;

    this.draw3DBox(ctx, this.metroTrainX, viaductY, deckHeight + 6, 95, 18, 16, 0, {
      body: '#e2e8f0',
      roof: '#0284c7', // cyan metro livery
      side: '#cbd5e1'
    });

    // Illuminated Passenger Windows
    for (let w = -32; w <= 32; w += 16) {
      const winPt = this.project(this.metroTrainX + w, viaductY - 8, deckHeight + 14);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(winPt.x - 4 * winPt.persp, winPt.y - 2.5 * winPt.persp, 8 * winPt.persp, 5 * winPt.persp);
    }
  }

  // 5. 3D Inductive Loop Sensors in Asphalt
  draw3DInductiveSensors(ctx, sim) {
    const sensors = [
      { x: -35, y: -90, w: 28, l: 32 }, // North
      { x:  90, y: -35, w: 32, l: 28 }, // East
      { x:  35, y:  90, w: 28, l: 32 }, // South
      { x: -90, y:  35, w: 32, l: 28 }  // West
    ];

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
    ctx.lineWidth = 1.5;
    for (const s of sensors) {
      const p1 = this.project(s.x - s.w / 2, s.y - s.l / 2, 0.5);
      const p2 = this.project(s.x + s.w / 2, s.y - s.l / 2, 0.5);
      const p3 = this.project(s.x + s.w / 2, s.y + s.l / 2, 0.5);
      const p4 = this.project(s.x - s.w / 2, s.y + s.l / 2, 0.5);

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineTo(p3.x, p3.y);
      ctx.lineTo(p4.x, p4.y);
      ctx.closePath();
      ctx.stroke();
    }
  }

  // 6. 3D Pedestrians & Crosswalks
  draw3DPedestrians(ctx, sim, isSchool) {
    const rw = SIM_CONFIG.ROAD_WIDTH / 2;
    const isScramble = Boolean(sim.pedestrians && sim.pedestrians.isScrambleActive);

    // Crosswalk Zebra Stripes
    const crosswalks = [
      { axis: 'H', x: 0, y: -rw - 14 }, // North
      { axis: 'V', x: rw + 14, y: 0 },  // East
      { axis: 'H', x: 0, y: rw + 14 },  // South
      { axis: 'V', x: -rw - 14, y: 0 }  // West
    ];

    for (const cw of crosswalks) {
      const isH = cw.axis === 'H';
      for (let offset = -rw + 8; offset < rw - 8; offset += 14) {
        const x1 = isH ? offset : cw.x - 7;
        const y1 = isH ? cw.y - 7 : offset;
        const x2 = isH ? offset + 8 : cw.x + 7;
        const y2 = isH ? cw.y + 7 : offset + 8;

        const p1 = this.project(x1, y1, 0.6);
        const p2 = this.project(x2, y1, 0.6);
        const p3 = this.project(x2, y2, 0.6);
        const p4 = this.project(x1, y2, 0.6);

        ctx.fillStyle = isScramble ? 'rgba(34, 197, 94, 0.85)' : 'rgba(248, 250, 252, 0.75)';
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.lineTo(p4.x, p4.y);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Diagonal Scramble Crosswalks if Barnes Dance Active
    if (isScramble) {
      this.draw3DScrambleDiagonals(ctx, rw);
    }

    // 3D Pedestrian Figures
    const peds = (sim.pedestrians && sim.pedestrians.crossing) || [];
    for (const p of peds) {
      this.draw3DSinglePedestrian(ctx, p.x, p.y, p.color || '#38bdf8');
    }
  }

  draw3DScrambleDiagonals(ctx, rw) {
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.65)';
    ctx.lineWidth = 3;
    const d1a = this.project(-rw, -rw, 0.8);
    const d1b = this.project( rw,  rw, 0.8);
    ctx.beginPath();
    ctx.moveTo(d1a.x, d1a.y);
    ctx.lineTo(d1b.x, d1b.y);
    ctx.stroke();

    const d2a = this.project( rw, -rw, 0.8);
    const d2b = this.project(-rw,  rw, 0.8);
    ctx.beginPath();
    ctx.moveTo(d2a.x, d2a.y);
    ctx.lineTo(d2b.x, d2b.y);
    ctx.stroke();
  }

  draw3DSinglePedestrian(ctx, px, py, color) {
    // Ground Shadow
    const gPt = this.project(px, py, 0);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.arc(gPt.x + 1, gPt.y + 1, 3.5 * gPt.persp, 0, Math.PI * 2);
    ctx.fill();

    // 3D Torso
    const tPt = this.project(px, py, 7);
    ctx.fillStyle = color;
    ctx.fillRect(tPt.x - 2.5 * tPt.persp, tPt.y - 4 * tPt.persp, 5 * tPt.persp, 8 * tPt.persp);

    // 3D Head
    const hPt = this.project(px, py, 14);
    ctx.fillStyle = '#fde047'; // skin / hat tone
    ctx.beginPath();
    ctx.arc(hPt.x, hPt.y, 2.8 * hPt.persp, 0, Math.PI * 2);
    ctx.fill();
  }

  // 7. 3D Vehicles (Sorted Back-to-Front by Camera Depth)
  draw3DVehicles(ctx, vehicles) {
    // Calculate projected depth for each vehicle and sort back-to-front
    const sorted = vehicles
      .filter(v => !v.hasExited)
      .map(v => {
        const proj = this.project(v.x, v.y, 0);
        return { vehicle: v, depth: proj.depth };
      })
      .sort((a, b) => a.depth - b.depth);

    for (const item of sorted) {
      this.draw3DSingleVehicle(ctx, item.vehicle);
    }
  }

  draw3DSingleVehicle(ctx, v) {
    const len = v.length || 32;
    const wid = v.width || 16;
    const chassisH = (v.type === 'BUS' ? 12 : v.type === 'FIRE_ENGINE' ? 14 : v.type === 'AMBULANCE' ? 12 : 7);
    const cabinH = (v.type === 'BUS' ? 14 : v.type === 'FIRE_ENGINE' ? 12 : v.type === 'AMBULANCE' ? 12 : 8);
    const bodyColor = v.color || (v.type === 'AMBULANCE' ? '#ffffff' : v.type === 'FIRE_ENGINE' ? '#dc2626' : v.type === 'BUS' ? '#0284c7' : '#38bdf8');

    // 1. Lower Chassis 3D Box (z: 1 -> chassisH)
    this.draw3DBox(ctx, v.x, v.y, 1.5, len, wid, chassisH, v.angle, {
      body: bodyColor,
      roof: this.adjustColor(bodyColor, 1.15)
    });

    // 2. 4 Extruded Rubber Tires
    this.draw3DWheels(ctx, v, len, wid, chassisH);

    // 3. Cabin / Glasshouse
    if (v.type === 'BUS') {
      // Long Bus Passenger Cabin
      this.draw3DBox(ctx, v.x, v.y, chassisH, len * 0.92, wid * 0.92, cabinH, v.angle, {
        body: '#0f172a',
        roof: '#0369a1',
        side: 'rgba(15, 23, 42, 0.88)'
      });
    } else if (v.type === 'AMBULANCE') {
      // 108 Ambulance: High-cube medical box
      this.draw3DBox(ctx, v.x, v.y, chassisH, len * 0.88, wid * 0.94, cabinH, v.angle, {
        body: '#ffffff',
        roof: '#f8fafc',
        side: '#e2e8f0'
      });
      this.draw3DAmbulanceBeacons(ctx, v, chassisH + cabinH);
    } else if (v.type === 'FIRE_ENGINE') {
      // Fire Rescue Truck
      this.draw3DBox(ctx, v.x, v.y, chassisH, len * 0.90, wid * 0.92, cabinH, v.angle, {
        body: '#b91c1c',
        roof: '#991b1b'
      });
      this.draw3DFireBeacons(ctx, v, chassisH + cabinH);
    } else if (v.type === 'AUTO_RICKSHAW') {
      // Auto-Rickshaw Canvas Canopy
      this.draw3DBox(ctx, v.x, v.y, chassisH, len * 0.82, wid * 0.94, cabinH, v.angle, {
        body: '#15803d',
        roof: '#eab308' // Yellow top
      });
    } else {
      // Passenger Car / Sedan / SUV Cabin
      const cabinLen = len * 0.58;
      const cabinWid = wid * 0.84;
      const cosA = Math.cos(v.angle);
      const sinA = Math.sin(v.angle);
      const cabX = v.x - (len * 0.08) * cosA;
      const cabY = v.y - (len * 0.08) * sinA;
      this.draw3DBox(ctx, cabX, cabY, chassisH, cabinLen, cabinWid, cabinH, v.angle, {
        body: '#0f172a',
        roof: this.adjustColor(bodyColor, 1.25),
        side: 'rgba(30, 41, 59, 0.92)'
      });
    }

    // 4. Volumetric 3D Headlight Beams
    this.draw3DHeadlights(ctx, v, len, wid);

    // 5. Glowing 3D Taillights & Brake Lights
    this.draw3DTaillights(ctx, v, len, wid);
  }

  draw3DWheels(ctx, v, len, wid, chassisH) {
    const cosA = Math.cos(v.angle);
    const sinA = Math.sin(v.angle);
    const wX = len * 0.28;
    const wY = wid * 0.52;

    const wheelOffsets = [
      { x:  wX, y: -wY },
      { x:  wX, y:  wY },
      { x: -wX, y: -wY },
      { x: -wX, y:  wY }
    ];

    ctx.fillStyle = '#0f172a'; // black rubber
    for (const o of wheelOffsets) {
      const wx = v.x + (o.x * cosA - o.y * sinA);
      const wy = v.y + (o.x * sinA + o.y * cosA);
      const sp = this.project(wx, wy, chassisH * 0.4);
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, 2.5 * sp.persp, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  draw3DHeadlights(ctx, v, len, wid) {
    const cosA = Math.cos(v.angle);
    const sinA = Math.sin(v.angle);
    const frontX = v.x + (len * 0.52) * cosA;
    const frontY = v.y + (len * 0.52) * sinA;

    const beamLen = 55;
    const beamSpread = 22;
    const tipX = frontX + beamLen * cosA;
    const tipY = frontY + beamLen * sinA;

    const b0 = this.project(frontX, frontY, 4);
    const b1 = this.project(tipX - beamSpread * sinA, tipY + beamSpread * cosA, 0.5);
    const b2 = this.project(tipX + beamSpread * sinA, tipY - beamSpread * cosA, 0.5);

    // Volumetric Beam Wash
    const beamGrad = ctx.createRadialGradient(b0.x, b0.y, 2, (b1.x + b2.x) / 2, (b1.y + b2.y) / 2, 45);
    beamGrad.addColorStop(0, 'rgba(254, 240, 138, 0.35)');
    beamGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(b0.x, b0.y);
    ctx.lineTo(b1.x, b1.y);
    ctx.lineTo(b2.x, b2.y);
    ctx.closePath();
    ctx.fill();

    // LED Bulbs
    const l1 = this.project(frontX - (wid * 0.35) * sinA, frontY + (wid * 0.35) * cosA, 5);
    const l2 = this.project(frontX + (wid * 0.35) * sinA, frontY - (wid * 0.35) * cosA, 5);
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(l1.x, l1.y, 2 * l1.persp, 0, Math.PI * 2);
    ctx.arc(l2.x, l2.y, 2 * l2.persp, 0, Math.PI * 2);
    ctx.fill();
  }

  draw3DTaillights(ctx, v, len, wid) {
    const cosA = Math.cos(v.angle);
    const sinA = Math.sin(v.angle);
    const rearX = v.x - (len * 0.52) * cosA;
    const rearY = v.y - (len * 0.52) * sinA;

    const t1 = this.project(rearX - (wid * 0.35) * sinA, rearY + (wid * 0.35) * cosA, 5);
    const t2 = this.project(rearX + (wid * 0.35) * sinA, rearY - (wid * 0.35) * cosA, 5);

    const isBraking = Boolean(v.brakeLightsOn || v.speed < 2);
    ctx.fillStyle = isBraking ? '#ef4444' : '#991b1b';
    ctx.beginPath();
    ctx.arc(t1.x, t1.y, (isBraking ? 3 : 2) * t1.persp, 0, Math.PI * 2);
    ctx.arc(t2.x, t2.y, (isBraking ? 3 : 2) * t2.persp, 0, Math.PI * 2);
    ctx.fill();
  }

  draw3DAmbulanceBeacons(ctx, v, roofZ) {
    const pCenter = this.project(v.x, v.y, roofZ + 3);
    const isRed = Math.sin(this.strobeAngle * 3) > 0;

    // Glowing Lightbar
    ctx.fillStyle = isRed ? '#ef4444' : '#3b82f6';
    ctx.beginPath();
    ctx.arc(pCenter.x, pCenter.y, 5 * pCenter.persp, 0, Math.PI * 2);
    ctx.fill();

    // Volumetric Flare Aura
    const aura = ctx.createRadialGradient(pCenter.x, pCenter.y, 1, pCenter.x, pCenter.y, 22 * pCenter.persp);
    aura.addColorStop(0, isRed ? 'rgba(239, 68, 68, 0.6)' : 'rgba(59, 130, 246, 0.6)');
    aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(pCenter.x, pCenter.y, 22 * pCenter.persp, 0, Math.PI * 2);
    ctx.fill();
  }

  draw3DFireBeacons(ctx, v, roofZ) {
    const pCenter = this.project(v.x, v.y, roofZ + 3);
    ctx.fillStyle = (Math.sin(this.strobeAngle * 4) > 0) ? '#f87171' : '#b91c1c';
    ctx.beginPath();
    ctx.arc(pCenter.x, pCenter.y, 4.5 * pCenter.persp, 0, Math.PI * 2);
    ctx.fill();
  }

  // 8. 3D Cantilever Signal Gantries & Overhead LED Heads
  draw3DTrafficSignals(ctx, sim) {
    const signals = [
      { approach: 'NORTH', pole: { x: -75, y: -90 }, armTo: { x: -20, y: -75 }, state: sim.signals && sim.signals.NORTH },
      { approach: 'EAST',  pole: { x:  90, y: -75 }, armTo: { x:  75, y: -20 }, state: sim.signals && sim.signals.EAST },
      { approach: 'SOUTH', pole: { x:  75, y:  90 }, armTo: { x:  20, y:  75 }, state: sim.signals && sim.signals.SOUTH },
      { approach: 'WEST',  pole: { x: -90, y:  75 }, armTo: { x: -75, y:  20 }, state: sim.signals && sim.signals.WEST }
    ];

    for (const sig of signals) {
      const gantryZ = 52;

      // Vertical Steel Mast
      this.draw3DBox(ctx, sig.pole.x, sig.pole.y, 0, 6, 6, gantryZ, 0, {
        body: '#64748b',
        roof: '#94a3b8',
        side: '#475569',
        shadow: false
      });

      // Horizontal Truss Arm
      const pPole = this.project(sig.pole.x, sig.pole.y, gantryZ);
      const pHead = this.project(sig.armTo.x, sig.armTo.y, gantryZ);
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 3.5 * pPole.persp;
      ctx.beginPath();
      ctx.moveTo(pPole.x, pPole.y);
      ctx.lineTo(pHead.x, pHead.y);
      ctx.stroke();

      // Hanging 3D Signal Head
      this.draw3DBox(ctx, sig.armTo.x, sig.armTo.y, gantryZ - 18, 12, 10, 24, 0, {
        body: '#0f172a',
        roof: '#1e293b',
        side: '#020617',
        shadow: false
      });

      // Active LED Lens with Blooming Glow
      const curState = (sig.state && sig.state.state) || 'RED';
      const lensZ = gantryZ - (curState === 'RED' ? 8 : curState === 'YELLOW' ? 14 : 20);
      const pLens = this.project(sig.armTo.x, sig.armTo.y, lensZ);

      const colorMap = {
        'RED': '#ef4444',
        'YELLOW': '#f59e0b',
        'GREEN': '#10b981'
      };
      const activeColor = colorMap[curState] || '#ef4444';

      // LED Core
      ctx.fillStyle = activeColor;
      ctx.beginPath();
      ctx.arc(pLens.x, pLens.y, 4.5 * pLens.persp, 0, Math.PI * 2);
      ctx.fill();

      // Radiant Bloom
      const bloom = ctx.createRadialGradient(pLens.x, pLens.y, 2, pLens.x, pLens.y, 16 * pLens.persp);
      bloom.addColorStop(0, activeColor);
      bloom.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = bloom;
      ctx.beginPath();
      ctx.arc(pLens.x, pLens.y, 16 * pLens.persp, 0, Math.PI * 2);
      ctx.fill();

      // Digital 3D Countdown Badge
      if (sig.state && sig.state.remaining) {
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.floor(10 * pLens.persp)}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(`${sig.state.remaining}s`, pHead.x, pHead.y - 12 * pLens.persp);
      }
    }
  }

  // 9. 3D Directional Corner Pole Sirens (Poles A–D)
  draw3DPoleSirens(ctx, sim) {
    const poles = [
      { id: 'A', name: 'Pole A (N)', x: -80, y: -80, approach: 'NORTH' },
      { id: 'B', name: 'Pole B (E)', x:  80, y: -80, approach: 'EAST' },
      { id: 'C', name: 'Pole C (S)', x:  80, y:  80, approach: 'SOUTH' },
      { id: 'D', name: 'Pole D (W)', x: -80, y:  80, approach: 'WEST' }
    ];

    const activePole = sim.sirenPole || (sim.ambulance && sim.ambulance.approach ? (sim.ambulance.approach === 'NORTH' ? 'A' : sim.ambulance.approach === 'EAST' ? 'B' : sim.ambulance.approach === 'SOUTH' ? 'C' : 'D') : null);

    for (const p of poles) {
      const mastHeight = 72;
      const isActive = activePole === p.id;

      // 3D Galvanized Steel Mast
      this.draw3DBox(ctx, p.x, p.y, 0, 7, 7, mastHeight, 0, {
        body: isActive ? '#f59e0b' : '#94a3b8',
        roof: '#e2e8f0',
        side: '#64748b',
        shadow: false
      });

      // 4-Horn Megaphone Array on Top
      const topPt = this.project(p.x, p.y, mastHeight);
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.arc(topPt.x, topPt.y, 5 * topPt.persp, 0, Math.PI * 2);
      ctx.fill();

      // Rotating Strobe Beacon
      const strobePt = this.project(p.x, p.y, mastHeight + 8);
      ctx.fillStyle = isActive ? '#ef4444' : '#64748b';
      ctx.beginPath();
      ctx.arc(strobePt.x, strobePt.y, (isActive ? 5 : 3) * strobePt.persp, 0, Math.PI * 2);
      ctx.fill();

      // Expanding 3D Acoustic Shockwaves if Active!
      if (isActive) {
        const ringTime = (Date.now() / 350) % 3;
        for (let r = 1; r <= 3; r++) {
          const ringRad = ((ringTime + r) * 22) % 65;
          const alpha = Math.max(0, 1 - ringRad / 65);
          ctx.strokeStyle = `rgba(239, 68, 68, ${alpha})`;
          ctx.lineWidth = 2 * topPt.persp;
          ctx.beginPath();
          ctx.arc(topPt.x, topPt.y, ringRad * topPt.persp, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Sweeping Strobe Beam Light Cone
        ctx.fillStyle = 'rgba(239, 68, 68, 0.22)';
        ctx.beginPath();
        ctx.moveTo(strobePt.x, strobePt.y);
        ctx.arc(strobePt.x, strobePt.y, 80 * strobePt.persp, this.strobeAngle, this.strobeAngle + 0.6);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  // 10. 3D Accident Scene & Collision Particles
  draw3DAccidentScene(ctx, sim) {
    if (!sim.accident || !sim.accident.active) return;

    const acc = sim.accident;
    const ax = acc.x || 0;
    const ay = acc.y || 45;

    // Glowing Red Perimeter Lockdown Zone on Asphalt
    const pGround = this.project(ax, ay, 0.8);
    const rad = (acc.severity === 'CRITICAL' ? 45 : 28) * pGround.persp;
    const grad = ctx.createRadialGradient(pGround.x, pGround.y, 2, pGround.x, pGround.y, rad);
    grad.addColorStop(0, 'rgba(239, 68, 68, 0.55)');
    grad.addColorStop(1, 'rgba(239, 68, 68, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(pGround.x, pGround.y, rad, 0, Math.PI * 2);
    ctx.fill();

    // Rising Smoke Particles for 6.8G Critical Crash
    if (acc.severity === 'CRITICAL') {
      if (Math.random() < 0.4) {
        this.smokePuffs.push({
          x: ax + (Math.random() - 0.5) * 12,
          y: ay + (Math.random() - 0.5) * 12,
          z: 5,
          radius: 3 + Math.random() * 4,
          life: 1.0
        });
      }

      for (let i = this.smokePuffs.length - 1; i >= 0; i--) {
        const p = this.smokePuffs[i];
        p.z += 0.8;
        p.radius += 0.35;
        p.life -= 0.025;

        if (p.life <= 0) {
          this.smokePuffs.splice(i, 1);
          continue;
        }

        const sp = this.project(p.x, p.y, p.z);
        ctx.fillStyle = `rgba(148, 163, 184, ${p.life * 0.45})`;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, p.radius * sp.persp, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // 11. Atmospheric Rain in 3D
  draw3DRain(ctx, width, height) {
    ctx.strokeStyle = 'rgba(203, 213, 225, 0.28)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 75; i++) {
      const rx = (Math.random() * width);
      const ry = (Math.random() * height);
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - 4, ry + 16);
    }
    ctx.stroke();
  }

  // 12. Floating Presentation HUD Badge
  draw3DPresentationBadge(ctx, width, height) {
    const badgeW = 285;
    const badgeH = 46;
    const bx = 16;
    const by = height - badgeH - 16;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(bx, by, badgeW, badgeH, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('📐 3D DIGITAL TWIN • PERSPECTIVE ENGINE', bx + 12, by + 18);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px system-ui, sans-serif';
    ctx.fillText('🖱️ Drag to Orbit 360° • Scroll to Zoom • 60 FPS', bx + 12, by + 34);
  }
}
