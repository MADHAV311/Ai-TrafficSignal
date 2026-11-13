/**
 * AI Adaptive Traffic Signal Digital Twin - High-Performance 3D Three.js WebGL Engine
 * Features:
 * - Buttery-Smooth 60 FPS Vehicle Kinematics with Forward Dead-Reckoning & Soft Error Blending
 * - Prominent 3D Roadside Traffic Signal Masts & Cantilever Gantries with Real-Time Phase LEDs
 * - Glowing Stop-Line Surface Light Bars (Red / Yellow / Green) for Instant Status Recognition
 * - Floating 3D Digital Countdown Billboard Sprites showing Live Phase Seconds
 * - Optimized PCF Shadows, Reused Geometry Pools, and Capped Pixel Ratio for Zero Lag
 * - 360° Mouse OrbitControls, Smooth Camera Transitions (3D View, Drone Orbit, Street Level, 2D Plan)
 */

const THREE = window.THREE;

export class ThreeScene {
  constructor(container, parentRenderer) {
    this.container = container;
    this.parent = parentRenderer;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.clock = new THREE.Clock();

    // Entity caches & Pools
    this.vehicleMeshes = new Map(); // id -> THREE.Group
    this.signalPosts = {};          // 'A', 'B', 'C', 'D' -> { redLens, yellowLens, greenLens, stopLine, sprite, canvas, ctx, texture }
    this.gantryLenses = {};         // 'A', 'B', 'C', 'D' -> { red, yellow, green, light }
    this.sirenPoles = {};           // 'A', 'B', 'C', 'D' -> { group, beacon, strobeLight, active }
    this.metroTrain = null;
    this.metroX = -450;

    // Camera modes
    this.cameraMode = '3D_PERSPECTIVE'; // '3D_PERSPECTIVE', '3D_ORBIT', '3D_STREET', '2D_PLAN'
    this.isOrbiting = false;
    this.strobeAngle = 0;

    // Raycaster for vehicle clicking
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.hoveredVehicleId = null;

    // Shared Geometry Pool (prevents garbage collection lag)
    this.geoPool = {
      busChassis: new THREE.BoxGeometry(54, 10, 17),
      wheel: new THREE.CylinderGeometry(3.5, 3.5, 2.5, 12).rotateX(Math.PI / 2),
      headlight: new THREE.BoxGeometry(1.6, 2.2, 2.8),
      taillight: new THREE.BoxGeometry(1.6, 2.2, 2.8),
      signalLens: new THREE.SphereGeometry(3.6, 16, 16),
      visor: new THREE.CylinderGeometry(4.2, 4.2, 3.2, 12, 1, true, 0, Math.PI).rotateX(Math.PI / 2)
    };

    // Shared Materials
    this.matPool = {
      wheel: new THREE.MeshLambertMaterial({ color: 0x111827 }),
      glass: new THREE.MeshStandardMaterial({ color: 0x0a1424, metalness: 0.9, roughness: 0.1 }),
      headlight: new THREE.MeshBasicMaterial({ color: 0xfffad2 }),
      taillight: new THREE.MeshBasicMaterial({ color: 0xef4444 }),
      signalDark: new THREE.MeshBasicMaterial({ color: 0x1e2433 }),
      steel: new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.4, metalness: 0.7 }),
      housing: new THREE.MeshStandardMaterial({ color: 0x0a0f1d, roughness: 0.8 }),
      yellowBorder: new THREE.MeshBasicMaterial({ color: 0xfacc15 })
    };

    this.init();
  }

  init() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    // 1. Scene & Atmosphere
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a101d);
    this.scene.fog = new THREE.FogExp2(0x0a101d, 0.0008);

    // 2. Perspective Camera
    this.camera = new THREE.PerspectiveCamera(45, width / height, 5, 3500);
    this.camera.position.set(0, 460, 500);

    // 3. WebGL Renderer (Optimized for High Framerate & Responsiveness)
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true
    });
    this.renderer.setSize(width, height);
    // Cap pixel ratio at 1.5 to prevent 4K screen GPU fillrate lag
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap; // Much faster than PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.container.appendChild(this.renderer.domElement);

    // 4. OrbitControls
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.03;
    this.controls.minDistance = 60;
    this.controls.maxDistance = 1400;
    this.controls.target.set(0, 0, 0);

    // 5. Lighting Setup
    this.initLighting();

    // 6. Ground & Road Markings
    this.initGroundAndRoads();

    // 7. 3D Architectural Cityscape
    this.initCityArchitecture();

    // 8. 3D Roadside Signal Posts & Stop Lines (High Visibility)
    this.initRoadsideSignals();

    // 9. 3D Cantilever Signal Gantries
    this.initSignalGantries();

    // 10. 3D Directional Corner Pole Sirens
    this.initPoleSirens();

    // 11. Event Listeners
    window.addEventListener('resize', () => this.onWindowResize());
    this.renderer.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.renderer.domElement.addEventListener('click', (e) => this.onClick(e));
  }

  initLighting() {
    // Ambient City Light
    const ambientLight = new THREE.AmbientLight(0x38bdf8, 0.7);
    this.scene.add(ambientLight);

    // Hemisphere Light
    const hemiLight = new THREE.HemisphereLight(0x60a5fa, 0x0f172a, 0.75);
    this.scene.add(hemiLight);

    // Directional Sunlight (1024x1024 shadow map for fast rendering)
    const sunLight = new THREE.DirectionalLight(0xffedd5, 1.7);
    sunLight.position.set(-280, 550, -200);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 100;
    sunLight.shadow.camera.far = 1300;
    const d = 420;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0005;
    this.scene.add(sunLight);
  }

  // ========================================================
  // REALISTIC ROAD INFRASTRUCTURE & STREETSCAPE ENGINE
  // ========================================================

  // Creates procedural aggregate asphalt texture with tire-wear tracks & bituminous grain
  createAsphaltTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // 1. Dark asphalt base
    ctx.fillStyle = '#171e28';
    ctx.fillRect(0, 0, 512, 512);

    // 2. High-density aggregate gravel grit (bitumen stippling)
    const imgData = ctx.getImageData(0, 0, 512, 512);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const noise = (Math.random() - 0.5) * 36;
      d[i] = Math.max(16, Math.min(48, d[i] + noise));
      d[i + 1] = Math.max(20, Math.min(54, d[i + 1] + noise));
      d[i + 2] = Math.max(26, Math.min(65, d[i + 2] + noise));
    }
    ctx.putImageData(imgData, 0, 0);

    // 3. Longitudinal rubberized tire-wear paths along travel lanes
    for (const lx of [64, 192, 320, 448]) {
      const grad = ctx.createLinearGradient(lx - 42, 0, lx + 42, 0);
      grad.addColorStop(0, 'rgba(10, 14, 22, 0)');
      grad.addColorStop(0.5, 'rgba(10, 14, 22, 0.45)');
      grad.addColorStop(1, 'rgba(10, 14, 22, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(lx - 42, 0, 84, 512);
    }

    // 4. Subtle asphalt longitudinal paver rolling seams
    ctx.fillStyle = 'rgba(10, 14, 22, 0.5)';
    ctx.fillRect(254, 0, 4, 512);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  // Creates procedural sidewalk paving flagstone texture with grid joints
  createSidewalkTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#475569';
    ctx.fillRect(0, 0, 512, 512);

    const imgData = ctx.getImageData(0, 0, 512, 512);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() - 0.5) * 22;
      d[i] = Math.max(45, Math.min(115, d[i] + n));
      d[i + 1] = Math.max(55, Math.min(128, d[i + 1] + n));
      d[i + 2] = Math.max(70, Math.min(148, d[i + 2] + n));
    }
    ctx.putImageData(imgData, 0, 0);

    // Flagstone joint grid
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 3;
    for (let x = 0; x <= 512; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 512);
      ctx.stroke();
    }
    for (let y = 0; y <= 512; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  // Creates directional turn arrow decal textures
  createArrowTexture(type) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 128, 256);

    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const cx = 64;
    if (type === 'straight') {
      ctx.beginPath();
      ctx.moveTo(cx, 32);
      ctx.lineTo(cx - 38, 88);
      ctx.lineTo(cx - 15, 88);
      ctx.lineTo(cx - 15, 224);
      ctx.lineTo(cx + 15, 224);
      ctx.lineTo(cx + 15, 88);
      ctx.lineTo(cx + 38, 88);
      ctx.closePath();
      ctx.fill();
    } else if (type === 'left') {
      ctx.beginPath();
      ctx.moveTo(cx + 20, 220);
      ctx.lineTo(cx + 20, 140);
      ctx.quadraticCurveTo(cx + 20, 80, cx - 24, 80);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx - 48, 80);
      ctx.lineTo(cx - 16, 50);
      ctx.lineTo(cx - 16, 68);
      ctx.lineTo(cx + 10, 68);
      ctx.lineTo(cx + 10, 92);
      ctx.lineTo(cx - 16, 92);
      ctx.lineTo(cx - 16, 110);
      ctx.closePath();
      ctx.fill();
    } else if (type === 'straight_left') {
      // Straight Arrow component
      ctx.beginPath();
      ctx.moveTo(cx + 12, 34);
      ctx.lineTo(cx - 12, 76);
      ctx.lineTo(cx + 4, 76);
      ctx.lineTo(cx + 4, 224);
      ctx.lineTo(cx + 20, 224);
      ctx.lineTo(cx + 20, 76);
      ctx.lineTo(cx + 36, 76);
      ctx.closePath();
      ctx.fill();

      // Branching Left Turn component
      ctx.beginPath();
      ctx.moveTo(cx + 12, 150);
      ctx.quadraticCurveTo(cx + 12, 100, cx - 28, 100);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx - 48, 100);
      ctx.lineTo(cx - 24, 78);
      ctx.lineTo(cx - 24, 92);
      ctx.lineTo(cx + 4, 92);
      ctx.lineTo(cx + 4, 108);
      ctx.lineTo(cx - 24, 108);
      ctx.lineTo(cx - 24, 122);
      ctx.closePath();
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }

  // Cast-Iron Utility Manhole Texture
  createManholeTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(64, 64, 60, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(64, 64, 54, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    for (let r = 16; r < 50; r += 10) {
      ctx.beginPath();
      ctx.arc(64, 64, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    return new THREE.CanvasTexture(canvas);
  }

  // Cast-Iron Storm Drain Grate Texture
  createDrainGrateTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 128, 128);

    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, 120, 120);

    ctx.fillStyle = '#334155';
    for (let y = 14; y < 114; y += 14) {
      ctx.fillRect(12, y, 104, 6);
    }
    return new THREE.CanvasTexture(canvas);
  }

  initGroundAndRoads() {
    const rw = 70; // Half road width (Total width 140)
    const span = 600;

    // 1. Surrounding Earth & Urban Foundation Base
    const groundGeo = new THREE.PlaneGeometry(span * 2, span * 2);
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x070c14 });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;
    this.scene.add(groundMesh);

    // 2. High-Fidelity Textured Asphalt Roads (East-West & North-South)
    const asphaltTex = this.createAsphaltTexture();
    const asphaltMatEW = new THREE.MeshLambertMaterial({ map: asphaltTex.clone() });
    asphaltMatEW.map.repeat.set(span / 25, rw / 18);
    asphaltMatEW.map.needsUpdate = true;

    const ewGeo = new THREE.PlaneGeometry(span * 2, rw * 2);
    const ewMesh = new THREE.Mesh(ewGeo, asphaltMatEW);
    ewMesh.rotation.x = -Math.PI / 2;
    ewMesh.position.y = 0.2;
    ewMesh.receiveShadow = true;
    this.scene.add(ewMesh);

    const asphaltMatNS = new THREE.MeshLambertMaterial({ map: asphaltTex.clone() });
    asphaltMatNS.map.repeat.set(rw / 18, span / 25);
    asphaltMatNS.map.needsUpdate = true;

    const nsGeo = new THREE.PlaneGeometry(rw * 2, span * 2);
    const nsMesh = new THREE.Mesh(nsGeo, asphaltMatNS);
    nsMesh.rotation.x = -Math.PI / 2;
    nsMesh.position.y = 0.22;
    nsMesh.receiveShadow = true;
    this.scene.add(nsMesh);

    // Central Intersection Conflict Box (With cross-directional wear)
    const intBoxMat = new THREE.MeshLambertMaterial({ map: asphaltTex.clone() });
    intBoxMat.map.repeat.set(4, 4);
    intBoxMat.map.needsUpdate = true;
    const intBox = new THREE.Mesh(new THREE.PlaneGeometry(rw * 2, rw * 2), intBoxMat);
    intBox.rotation.x = -Math.PI / 2;
    intBox.position.set(0, 0.24, 0);
    intBox.receiveShadow = true;
    this.scene.add(intBox);

    // 3. Multi-Lane Road Markings (Double Yellows, Dashed Dividers, Edge Fog Lines, Arrows)
    this.createRoadMarkings(rw, span);

    // 4. Zebra Crosswalk Stripes (Barnes Dance Scramble Compliant)
    this.crosswalkGroup = new THREE.Group();
    this.scene.add(this.crosswalkGroup);
    const whiteMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
    this.initCrosswalks(rw, whiteMat);

    // 5. 3D Raised Concrete Curbs & Paved Sidewalk Plazas
    this.createCurbsAndSidewalks(rw, span);

    // 6. Raised Central Medians (Traffic Islands with Hazard Bullnoses & Cats-Eyes)
    this.createCentralMedians(rw);

    // 7. Street Drainage Grates & Utility Manholes
    this.createDrainageAndManholes(rw);

    // 8. Stainless Steel Pedestrian Safety Barricades
    this.createPedestrianRailings(rw);
  }

  createRoadLine(x, y, z, w, l, mat, isHoriz) {
    const geo = new THREE.PlaneGeometry(w, l);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, y, z);
    this.scene.add(mesh);
    return mesh;
  }

  // Full Multi-Lane Markings: Double Yellows, Dashed Lane Dividers, Outer Fog Lines, and Stenciled Arrows
  createRoadMarkings(rw, span) {
    const yellowMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const whiteMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
    const stopOffset = 74;

    // A. Double-Solid Yellow Centerlines (Two parallel lines separated by dark asphalt gap)
    const stripeW = 0.9;
    const gap = 0.8;
    const yOff = (stripeW + gap) / 2;

    for (const s of [-yOff, yOff]) {
      // North approach
      this.createRoadLine(s, 0.38, -span / 2 - stopOffset / 2, stripeW, span - stopOffset, yellowMat, false);
      // South approach
      this.createRoadLine(s, 0.38,  span / 2 + stopOffset / 2, stripeW, span - stopOffset, yellowMat, false);
      // East approach
      this.createRoadLine( span / 2 + stopOffset / 2, 0.38, s, span - stopOffset, stripeW, yellowMat, true);
      // West approach
      this.createRoadLine(-span / 2 - stopOffset / 2, 0.38, s, span - stopOffset, stripeW, yellowMat, true);
    }

    // B. Dashed White Lane Dividers (Separating Lane 0 and Lane 1 in both directions at +/- 35 units)
    const dashL = 10;
    const dashGap = 10;
    const dashW = 1.2;

    // North & South Roads (Dashes along Z axis at X = -35 and X = +35)
    for (let z = -span + 10; z <= -stopOffset - 10; z += dashL + dashGap) {
      this.createRoadLine(-35, 0.36, z, dashW, dashL, whiteMat, false);
      this.createRoadLine( 35, 0.36, z, dashW, dashL, whiteMat, false);
    }
    for (let z = stopOffset + 10; z <= span - 10; z += dashL + dashGap) {
      this.createRoadLine(-35, 0.36, z, dashW, dashL, whiteMat, false);
      this.createRoadLine( 35, 0.36, z, dashW, dashL, whiteMat, false);
    }

    // East & West Roads (Dashes along X axis at Z = -35 and Z = +35)
    for (let x = -span + 10; x <= -stopOffset - 10; x += dashL + dashGap) {
      this.createRoadLine(x, 0.36, -35, dashL, dashW, whiteMat, true);
      this.createRoadLine(x, 0.36,  35, dashL, dashW, whiteMat, true);
    }
    for (let x = stopOffset + 10; x <= span - 10; x += dashL + dashGap) {
      this.createRoadLine(x, 0.36, -35, dashL, dashW, whiteMat, true);
      this.createRoadLine(x, 0.36,  35, dashL, dashW, whiteMat, true);
    }

    // C. Solid White Shoulder / Fog Lines (Along both outer curbs at +/- 67.5)
    const fogW = 1.2;
    this.createRoadLine(-67.5, 0.36, -span / 2 - stopOffset / 2, fogW, span - stopOffset, whiteMat, false);
    this.createRoadLine( 67.5, 0.36, -span / 2 - stopOffset / 2, fogW, span - stopOffset, whiteMat, false);
    this.createRoadLine(-67.5, 0.36,  span / 2 + stopOffset / 2, fogW, span - stopOffset, whiteMat, false);
    this.createRoadLine( 67.5, 0.36,  span / 2 + stopOffset / 2, fogW, span - stopOffset, whiteMat, false);

    this.createRoadLine(-span / 2 - stopOffset / 2, 0.36, -67.5, span - stopOffset, fogW, whiteMat, true);
    this.createRoadLine(-span / 2 - stopOffset / 2, 0.36,  67.5, span - stopOffset, fogW, whiteMat, true);
    this.createRoadLine( span / 2 + stopOffset / 2, 0.36, -67.5, span - stopOffset, fogW, whiteMat, true);
    this.createRoadLine( span / 2 + stopOffset / 2, 0.36,  67.5, span - stopOffset, fogW, whiteMat, true);

    // D. Reflective Amber Cats-Eyes / Road Studs along Centerline
    const studGeo = new THREE.BoxGeometry(0.8, 0.35, 1.4);
    const studMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    for (let z = -span + 20; z <= -stopOffset - 10; z += 24) {
      const stud = new THREE.Mesh(studGeo, studMat);
      stud.position.set(0, 0.42, z);
      this.scene.add(stud);
    }
    for (let z = stopOffset + 10; z <= span - 20; z += 24) {
      const stud = new THREE.Mesh(studGeo, studMat);
      stud.position.set(0, 0.42, z);
      this.scene.add(stud);
    }
    const studGeoH = new THREE.BoxGeometry(1.4, 0.35, 0.8);
    for (let x = -span + 20; x <= -stopOffset - 10; x += 24) {
      const stud = new THREE.Mesh(studGeoH, studMat);
      stud.position.set(x, 0.42, 0);
      this.scene.add(stud);
    }
    for (let x = stopOffset + 10; x <= span - 20; x += 24) {
      const stud = new THREE.Mesh(studGeoH, studMat);
      stud.position.set(x, 0.42, 0);
      this.scene.add(stud);
    }

    // E. Directional Approach Stencils / Painted Turn Arrows
    const strTex = this.createArrowTexture('straight');
    const turnTex = this.createArrowTexture('straight_left');
    const arrowMatStr = new THREE.MeshBasicMaterial({ map: strTex, transparent: true });
    const arrowMatTurn = new THREE.MeshBasicMaterial({ map: turnTex, transparent: true });

    const addArrow = (x, z, rotY, isTurn) => {
      const arrowMesh = new THREE.Mesh(new THREE.PlaneGeometry(10, 20), isTurn ? arrowMatTurn : arrowMatStr);
      arrowMesh.rotation.x = -Math.PI / 2;
      arrowMesh.rotation.z = rotY;
      arrowMesh.position.set(x, 0.37, z);
      this.scene.add(arrowMesh);
    };

    // Approach Arrows for All 4 Inbound Corridors
    for (const dist of [125, 205]) {
      // Road A (North Inbound flows South towards center, X < 0)
      addArrow(-17.5, -dist, Math.PI, true);  // Inner Lane: Straight + Left
      addArrow(-52.5, -dist, Math.PI, false); // Outer Lane: Straight

      // Road C (South Inbound flows North towards center, X > 0)
      addArrow(17.5, dist, 0, true);
      addArrow(52.5, dist, 0, false);

      // Road B (East Inbound flows West towards center, Z < 0)
      addArrow(dist, -17.5, Math.PI / 2, true);
      addArrow(dist, -52.5, Math.PI / 2, false);

      // Road D (West Inbound flows East towards center, Z > 0)
      addArrow(-dist, 17.5, -Math.PI / 2, true);
      addArrow(-dist, 52.5, -Math.PI / 2, false);
    }
  }

  // 3D Raised Concrete Curbs with Chamfered Fillet Corners & Paved Pedestrian Sidewalks
  createCurbsAndSidewalks(rw, span) {
    const curbMat = new THREE.MeshLambertMaterial({ color: 0x94a3b8 });
    const hazardCurbMat = new THREE.MeshBasicMaterial({ color: 0xeab308 });
    const darkCurbMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    const sidewalkTex = this.createSidewalkTexture();

    // 1. Four Massive Quadrant Sidewalk Slabs (Paved Concrete Pedestrian Plaza)
    const swWidth = 260;
    const swDepth = 260;
    const swH = 1.0;
    const swY = swH / 2 + 0.1;

    const quadConfigs = [
      { name: 'NE', x:  rw + swWidth / 2, z: -rw - swDepth / 2 },
      { name: 'NW', x: -rw - swWidth / 2, z: -rw - swDepth / 2 },
      { name: 'SE', x:  rw + swWidth / 2, z:  rw + swDepth / 2 },
      { name: 'SW', x: -rw - swWidth / 2, z:  rw + swDepth / 2 }
    ];

    for (const q of quadConfigs) {
      const swMat = new THREE.MeshLambertMaterial({ map: sidewalkTex.clone() });
      swMat.map.repeat.set(swWidth / 24, swDepth / 24);
      swMat.map.needsUpdate = true;

      const swMesh = new THREE.Mesh(new THREE.BoxGeometry(swWidth, swH, swDepth), swMat);
      swMesh.position.set(q.x, swY, q.z);
      swMesh.receiveShadow = true;
      this.scene.add(swMesh);

      // Yellow Tactile Paving Strip (Blind / Accessibility Blister Studs) at crosswalk ramps
      const tactileMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
      const t1 = new THREE.Mesh(new THREE.BoxGeometry(24, 0.2, 4.0), tactileMat);
      t1.position.set(q.x > 0 ? rw + 14 : -rw - 14, swH + 0.12, q.z > 0 ? rw + 2.5 : -rw - 2.5);
      this.scene.add(t1);

      const t2 = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.2, 24), tactileMat);
      t2.position.set(q.x > 0 ? rw + 2.5 : -rw - 2.5, swH + 0.12, q.z > 0 ? rw + 14 : -rw - 14);
      this.scene.add(t2);
    }

    // 2. Linear Concrete Curbs along the Street Edges (X = +/- 70, Z = +/- 70)
    const curbH = 1.8;
    const curbW = 2.4;
    const curbY = curbH / 2;
    const curbL = span - rw;

    // Linear Straight Curbs (North, South, East, West approaches)
    for (const sideX of [-rw - curbW / 2, rw + curbW / 2]) {
      // North approach curbs
      const cN = new THREE.Mesh(new THREE.BoxGeometry(curbW, curbH, curbL), curbMat);
      cN.position.set(sideX, curbY, -span / 2 - rw / 2);
      this.scene.add(cN);

      // South approach curbs
      const cS = new THREE.Mesh(new THREE.BoxGeometry(curbW, curbH, curbL), curbMat);
      cS.position.set(sideX, curbY, span / 2 + rw / 2);
      this.scene.add(cS);
    }

    for (const sideZ of [-rw - curbW / 2, rw + curbW / 2]) {
      // East approach curbs
      const cE = new THREE.Mesh(new THREE.BoxGeometry(curbL, curbH, curbW), curbMat);
      cE.position.set(span / 2 + rw / 2, curbY, sideZ);
      this.scene.add(cE);

      // West approach curbs
      const cW = new THREE.Mesh(new THREE.BoxGeometry(curbL, curbH, curbW), curbMat);
      cW.position.set(-span / 2 - rw / 2, curbY, sideZ);
      this.scene.add(cW);
    }

    // 3. Alternating Yellow & Black Reflective Hazard Curb Stones near Crosswalk Ramps
    for (const cx of [-rw - 1.2, rw + 1.2]) {
      for (const cz of [-rw - 20, rw + 20]) {
        for (let seg = 0; seg < 4; seg++) {
          const hzCurb = new THREE.Mesh(
            new THREE.BoxGeometry(curbW * 1.05, curbH * 1.02, 5.0),
            seg % 2 === 0 ? hazardCurbMat : darkCurbMat
          );
          hzCurb.position.set(cx, curbY, cz > 0 ? cz + seg * 5.0 : cz - seg * 5.0);
          this.scene.add(hzCurb);
        }
      }
    }
  }

  // Raised Central Medians (Traffic Islands with Rounded Hazard Bullnoses & Cats-Eyes)
  createCentralMedians(rw) {
    const medW = 4.2;
    const medH = 1.6;
    const medL = 140;
    const medY = medH / 2 + 0.15;
    const medOffset = 105;

    const medConcreteMat = new THREE.MeshLambertMaterial({ color: 0x94a3b8 });
    const medGrassMat = new THREE.MeshLambertMaterial({ color: 0x15803d });
    const hazardMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const darkMat = new THREE.MeshLambertMaterial({ color: 0x0f172a });

    const medians = [
      { axis: 'Z', x: 0, z: -medOffset - medL / 2, rotY: 0 },         // North Road Median
      { axis: 'Z', x: 0, z:  medOffset + medL / 2, rotY: Math.PI },   // South Road Median
      { axis: 'X', x:  medOffset + medL / 2, z: 0, rotY: -Math.PI / 2 }, // East Road Median
      { axis: 'X', x: -medOffset - medL / 2, z: 0, rotY:  Math.PI / 2 }  // West Road Median
    ];

    for (const m of medians) {
      const medGroup = new THREE.Group();
      medGroup.position.set(m.x, 0, m.z);
      medGroup.rotation.y = m.rotY;

      // Concrete Curb Enclosure
      const cBox = new THREE.Mesh(new THREE.BoxGeometry(medW, medH, medL), medConcreteMat);
      cBox.position.y = medY;
      medGroup.add(cBox);

      // Grass / Greenery Top Infill
      const grass = new THREE.Mesh(new THREE.BoxGeometry(medW - 1.2, 0.4, medL - 2.0), medGrassMat);
      grass.position.y = medH + 0.1;
      medGroup.add(grass);

      // Low Urban Median Hedges
      for (let hz = -medL / 2 + 16; hz <= medL / 2 - 16; hz += 22) {
        const shrub = new THREE.Mesh(new THREE.SphereGeometry(1.6, 6, 6), medGrassMat);
        shrub.position.set(0, medH + 1.2, hz);
        shrub.scale.set(1.1, 0.75, 1.4);
        medGroup.add(shrub);
      }

      // Rounded Bullnose Tip Facing Intersection with Hazard Chevrons
      const noseTip = new THREE.Mesh(new THREE.CylinderGeometry(medW / 2, medW / 2, medH, 12, 1, false, 0, Math.PI), medConcreteMat);
      noseTip.rotation.y = Math.PI / 2;
      noseTip.position.set(0, medY, medL / 2);
      medGroup.add(noseTip);

      // Alternating Yellow/Black Chevron on Bullnose
      const chevron = new THREE.Mesh(new THREE.BoxGeometry(medW * 1.05, medH * 0.7, 1.2), hazardMat);
      chevron.position.set(0, medY, medL / 2 + 0.4);
      medGroup.add(chevron);

      const chevStripe = new THREE.Mesh(new THREE.BoxGeometry(1.4, medH * 0.72, 1.3), darkMat);
      chevStripe.position.set(0, medY, medL / 2 + 0.45);
      medGroup.add(chevStripe);

      // Illuminated High-Visibility Median Bollard
      const bollard = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 7.5, 8), new THREE.MeshLambertMaterial({ color: 0xf8fafc }));
      bollard.position.set(0, medH + 3.75, medL / 2 - 4);
      medGroup.add(bollard);

      const band1 = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 1.0, 8), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
      band1.position.set(0, medH + 6.0, medL / 2 - 4);
      medGroup.add(band1);

      this.scene.add(medGroup);
    }
  }

  // Street Drainage Grates & Utility Manhole Covers
  createDrainageAndManholes(rw) {
    const drainTex = this.createDrainGrateTexture();
    const manholeTex = this.createManholeTexture();

    const drainMat = new THREE.MeshLambertMaterial({ map: drainTex });
    const manholeMat = new THREE.MeshLambertMaterial({ map: manholeTex });

    // Drainage Catch Basins along curbs
    const drainPositions = [
      [-64, 0.26, -95], [ 64, 0.26, -95], [-64, 0.26, 95], [ 64, 0.26, 95],
      [-95, 0.26, -64], [-95, 0.26,  64], [ 95, 0.26, -64], [ 95, 0.26, 64],
      [-64, 0.26, -185], [ 64, 0.26, -185], [-64, 0.26, 185], [ 64, 0.26, 185],
      [-185, 0.26, -64], [-185, 0.26,  64], [ 185, 0.26, -64], [ 185, 0.26, 64]
    ];

    for (const p of drainPositions) {
      const drain = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 6.5), drainMat);
      drain.rotation.x = -Math.PI / 2;
      drain.position.set(p[0], p[1], p[2]);
      this.scene.add(drain);
    }

    // Circular Utility Manholes embedded in travel lanes
    const manholePositions = [
      [-17.5, 0.26, -150], [17.5, 0.26, 150],
      [150, 0.26, -17.5], [-150, 0.26, 17.5],
      [-52.5, 0.26, -260], [52.5, 0.26, 260],
      [260, 0.26, -52.5], [-260, 0.26, 52.5]
    ];

    for (const p of manholePositions) {
      const mh = new THREE.Mesh(new THREE.CircleGeometry(3.2, 16), manholeMat);
      mh.rotation.x = -Math.PI / 2;
      mh.position.set(p[0], p[1], p[2]);
      this.scene.add(mh);
    }
  }

  // Stainless Steel Pedestrian Safety Barricades along Sidewalk Curbs
  createPedestrianRailings(rw) {
    const railMat = new THREE.MeshStandardMaterial({ color: 0xcfd8dc, metalness: 0.85, roughness: 0.2 });

    const cornerConfigs = [
      { x:  rw + 4, z: -rw - 30, axis: 'Z', rotY: 0 },
      { x: -rw - 4, z: -rw - 30, axis: 'Z', rotY: 0 },
      { x:  rw + 4, z:  rw + 30, axis: 'Z', rotY: 0 },
      { x: -rw - 4, z:  rw + 30, axis: 'Z', rotY: 0 },
      { x:  rw + 30, z: -rw - 4, axis: 'X', rotY: Math.PI / 2 },
      { x: -rw - 30, z: -rw - 4, axis: 'X', rotY: Math.PI / 2 },
      { x:  rw + 30, z:  rw + 4, axis: 'X', rotY: Math.PI / 2 },
      { x: -rw - 30, z:  rw + 4, axis: 'X', rotY: Math.PI / 2 }
    ];

    for (const c of cornerConfigs) {
      const group = new THREE.Group();
      group.position.set(c.x, 1.0, c.z);
      group.rotation.y = c.rotY;

      // Top Rail
      const topRail = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 34, 8), railMat);
      topRail.rotation.x = Math.PI / 2;
      topRail.position.set(0, 5.2, 0);
      group.add(topRail);

      // Mid Rail
      const midRail = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 34, 8), railMat);
      midRail.rotation.x = Math.PI / 2;
      midRail.position.set(0, 2.8, 0);
      group.add(midRail);

      // Upright Stanchions
      for (const sz of [-15, 0, 15]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 5.4, 8), railMat);
        post.position.set(0, 2.7, sz);
        group.add(post);
      }

      this.scene.add(group);
    }
  }

  initCrosswalks(rw, whiteMat) {
    const stripesPerCrosswalk = 7;
    const stripeW = 7;
    const stripeL = 22;

    const cwConfigs = [
      { axis: 'Z', posZ: -rw - 16, startX: -rw + 10, stepX: (rw * 2 - 20) / (stripesPerCrosswalk - 1) },
      { axis: 'Z', posZ:  rw + 16, startX: -rw + 10, stepX: (rw * 2 - 20) / (stripesPerCrosswalk - 1) },
      { axis: 'X', posX: -rw - 16, startZ: -rw + 10, stepZ: (rw * 2 - 20) / (stripesPerCrosswalk - 1) },
      { axis: 'X', posX:  rw + 16, startZ: -rw + 10, stepZ: (rw * 2 - 20) / (stripesPerCrosswalk - 1) }
    ];

    for (const cw of cwConfigs) {
      for (let i = 0; i < stripesPerCrosswalk; i++) {
        let x, z, w, l;
        if (cw.axis === 'Z') {
          x = cw.startX + i * cw.stepX;
          z = cw.posZ;
          w = stripeW;
          l = stripeL;
        } else {
          x = cw.posX;
          z = cw.startZ + i * cw.stepZ;
          w = stripeL;
          l = stripeW;
        }
        const geo = new THREE.PlaneGeometry(w, l);
        const mesh = new THREE.Mesh(geo, whiteMat.clone());
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(x, 0.35, z);
        this.crosswalkGroup.add(mesh);
      }
    }
  }

  // Creates a High-Visibility Dual-Faced 3D Traffic Signal Lantern Head with Target Backplate & Visors
  createSignalHead(facingAngle = 0) {
    const headGroup = new THREE.Group();

    // 1. High-Contrast Yellow Backing Target Plate (Target Board)
    const border = new THREE.Mesh(new THREE.BoxGeometry(14, 34, 0.4), this.matPool.yellowBorder);
    border.position.set(0, 0, 0);
    headGroup.add(border);

    // 2. Heavy-Duty Housing Box
    const housing = new THREE.Mesh(new THREE.BoxGeometry(10, 28, 7), this.matPool.housing);
    housing.position.set(0, 0, 0);
    headGroup.add(housing);

    // 3. Shared High-Luminosity LED Lens Materials
    const redMat = new THREE.MeshBasicMaterial({ color: 0xff2222 });
    const yellowMat = new THREE.MeshBasicMaterial({ color: 0x1e2433 });
    const greenMat = new THREE.MeshBasicMaterial({ color: 0x162420 });

    // 4. Front Lenses (Facing towards +Z in local coordinates)
    const fRed = new THREE.Mesh(this.geoPool.signalLens, redMat);
    fRed.position.set(0, 8.5, 3.8);
    headGroup.add(fRed);

    const fYel = new THREE.Mesh(this.geoPool.signalLens, yellowMat);
    fYel.position.set(0, 0, 3.8);
    headGroup.add(fYel);

    const fGrn = new THREE.Mesh(this.geoPool.signalLens, greenMat);
    fGrn.position.set(0, -8.5, 3.8);
    headGroup.add(fGrn);

    // Front Visor Hoods
    const fVRed = new THREE.Mesh(this.geoPool.visor, this.matPool.housing);
    fVRed.position.set(0, 9.5, 4.4);
    headGroup.add(fVRed);

    const fVYel = new THREE.Mesh(this.geoPool.visor, this.matPool.housing);
    fVYel.position.set(0, 1.0, 4.4);
    headGroup.add(fVYel);

    const fVGrn = new THREE.Mesh(this.geoPool.visor, this.matPool.housing);
    fVGrn.position.set(0, -7.5, 4.4);
    headGroup.add(fVGrn);

    // 5. Back Lenses (Facing towards -Z in local coordinates for 360° visibility)
    const bRed = new THREE.Mesh(this.geoPool.signalLens, redMat);
    bRed.position.set(0, 8.5, -3.8);
    headGroup.add(bRed);

    const bYel = new THREE.Mesh(this.geoPool.signalLens, yellowMat);
    bYel.position.set(0, 0, -3.8);
    headGroup.add(bYel);

    const bGrn = new THREE.Mesh(this.geoPool.signalLens, greenMat);
    bGrn.position.set(0, -8.5, -3.8);
    headGroup.add(bGrn);

    // Back Visor Hoods (Rotated 180° around Y)
    const bVRed = new THREE.Mesh(this.geoPool.visor, this.matPool.housing);
    bVRed.position.set(0, 9.5, -4.4);
    bVRed.rotation.y = Math.PI;
    headGroup.add(bVRed);

    const bVYel = new THREE.Mesh(this.geoPool.visor, this.matPool.housing);
    bVYel.position.set(0, 1.0, -4.4);
    bVYel.rotation.y = Math.PI;
    headGroup.add(bVYel);

    const bVGrn = new THREE.Mesh(this.geoPool.visor, this.matPool.housing);
    bVGrn.position.set(0, -7.5, -4.4);
    bVGrn.rotation.y = Math.PI;
    headGroup.add(bVGrn);

    headGroup.rotation.y = facingAngle;

    return {
      group: headGroup,
      red: fRed,
      yellow: fYel,
      green: fGrn,
      redMat,
      yellowMat,
      greenMat
    };
  }

  // 3D Roadside Stop-Line Traffic Signals with Live Countdown Badges & Stop-Line Ground Lights
  initRoadsideSignals() {
    const rw = 70;
    const stopOffset = 82;

    const signalConfigs = [
      { id: 'A', name: 'Road A (North)', x: -rw - 14, z: -stopOffset, stopX: -rw / 2, stopZ: -rw - 4, isHoriz: true,  faceAngle: Math.PI },
      { id: 'B', name: 'Road B (East)',  x:  stopOffset, z: -rw - 14, stopX:  rw + 4, stopZ: -rw / 2, isHoriz: false, faceAngle: Math.PI / 2 },
      { id: 'C', name: 'Road C (South)', x:  rw + 14, z:  stopOffset, stopX:  rw / 2, stopZ:  rw + 4, isHoriz: true,  faceAngle: 0 },
      { id: 'D', name: 'Road D (West)',  x: -stopOffset, z:  rw + 14, stopX: -rw - 4, stopZ:  rw / 2, isHoriz: false, faceAngle: -Math.PI / 2 }
    ];

    for (const cfg of signalConfigs) {
      const group = new THREE.Group();
      group.position.set(cfg.x, 0, cfg.z);

      // 1. Upright Steel Mast
      const mastGeo = new THREE.CylinderGeometry(1.8, 2.5, 38, 12);
      const mast = new THREE.Mesh(mastGeo, this.matPool.steel);
      mast.position.y = 19;
      group.add(mast);

      // 2. High-Visibility Signal Head
      const signalHead = this.createSignalHead(cfg.faceAngle);
      signalHead.group.position.y = 35;
      group.add(signalHead.group);

      // 3. Digital Countdown Billboard Sprite (Faces Camera Automatically)
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 128, 64);
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 36px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('RED', 64, 32);

      const texture = new THREE.CanvasTexture(canvas);
      const spriteMat = new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.position.set(0, 56, 0);
      sprite.scale.set(24, 12, 1);
      group.add(sprite);

      this.scene.add(group);

      // 4. Glowing Stop-Line Road Surface Light Bar (Turns Red/Yellow/Green on asphalt)
      const stopLineMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
      const stopLineGeo = cfg.isHoriz ? new THREE.PlaneGeometry(rw, 6) : new THREE.PlaneGeometry(6, rw);
      const stopLineMesh = new THREE.Mesh(stopLineGeo, stopLineMat);
      stopLineMesh.rotation.x = -Math.PI / 2;
      stopLineMesh.position.set(cfg.stopX, 0.45, cfg.stopZ);
      this.scene.add(stopLineMesh);

      this.signalPosts[cfg.id] = {
        group,
        head: signalHead,
        sprite,
        canvas,
        ctx,
        texture,
        stopLine: stopLineMesh,
        lastRenderedText: ''
      };
    }
  }

  // 3D Cantilever Overhead Highway Signal Gantries with Dual Heads over Lanes
  initSignalGantries() {
    const configs = [
      {
        id: 'A',
        mastPos: [-78, 0, -82],
        armEnd:  [-6, 56, -82],
        heads: [
          { x: -52.5, y: 43, z: -82 },
          { x: -17.5, y: 43, z: -82 }
        ],
        faceAngle: Math.PI,
        lightPos: [-35, 50, -82]
      },
      {
        id: 'B',
        mastPos: [82, 0, -78],
        armEnd:  [82, 56, -6],
        heads: [
          { x: 82, y: 43, z: -52.5 },
          { x: 82, y: 43, z: -17.5 }
        ],
        faceAngle: Math.PI / 2,
        lightPos: [82, 50, -35]
      },
      {
        id: 'C',
        mastPos: [78, 0, 82],
        armEnd:  [6, 56, 82],
        heads: [
          { x: 52.5, y: 43, z: 82 },
          { x: 17.5, y: 43, z: 82 }
        ],
        faceAngle: 0,
        lightPos: [35, 50, 82]
      },
      {
        id: 'D',
        mastPos: [-82, 0, 78],
        armEnd:  [-82, 56, 6],
        heads: [
          { x: -82, y: 43, z: 52.5 },
          { x: -82, y: 43, z: 17.5 }
        ],
        faceAngle: -Math.PI / 2,
        lightPos: [-82, 50, 35]
      }
    ];

    for (const cfg of configs) {
      const gantryGroup = new THREE.Group();

      // 1. Heavy Vertical Mast on Sidewalk
      const mastGeo = new THREE.CylinderGeometry(2.6, 4.0, 58, 12);
      const mast = new THREE.Mesh(mastGeo, this.matPool.steel);
      mast.position.set(cfg.mastPos[0], 29, cfg.mastPos[2]);
      gantryGroup.add(mast);

      // Mast Base Plate
      const basePlate = new THREE.Mesh(new THREE.BoxGeometry(10, 2, 10), this.matPool.housing);
      basePlate.position.set(cfg.mastPos[0], 1, cfg.mastPos[2]);
      gantryGroup.add(basePlate);

      // 2. Dual-Tube Cantilever Highway Truss Arm
      const dx = cfg.armEnd[0] - cfg.mastPos[0];
      const dz = cfg.armEnd[2] - cfg.mastPos[2];
      const armLen = Math.sqrt(dx * dx + dz * dz);
      const armAngle = Math.atan2(dz, dx);
      const midX = (cfg.mastPos[0] + cfg.armEnd[0]) / 2;
      const midZ = (cfg.mastPos[2] + cfg.armEnd[2]) / 2;

      // Upper Tube (y: 56)
      const tubeGeo = new THREE.CylinderGeometry(1.6, 1.8, armLen, 8).rotateZ(Math.PI / 2);
      const upperTube = new THREE.Mesh(tubeGeo, this.matPool.steel);
      upperTube.position.set(midX, 56, midZ);
      upperTube.rotation.y = -armAngle;
      gantryGroup.add(upperTube);

      // Lower Tube (y: 50)
      const lowerTube = new THREE.Mesh(tubeGeo, this.matPool.steel);
      lowerTube.position.set(midX, 50, midZ);
      lowerTube.rotation.y = -armAngle;
      gantryGroup.add(lowerTube);

      // Vertical connecting struts along arm
      const strutGeo = new THREE.CylinderGeometry(0.8, 0.8, 6.0, 6);
      const numStruts = 6;
      for (let s = 1; s <= numStruts; s++) {
        const frac = s / (numStruts + 1);
        const sx = cfg.mastPos[0] + dx * frac;
        const sz = cfg.mastPos[2] + dz * frac;
        const strut = new THREE.Mesh(strutGeo, this.matPool.steel);
        strut.position.set(sx, 53, sz);
        gantryGroup.add(strut);
      }

      // 3. Dual Hanging Signal Heads (One centered over each inbound lane)
      const headsList = [];
      for (const hPos of cfg.heads) {
        // Vertical hanger bracket from lower tube down to top of signal head
        const hanger = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 8.0, 6), this.matPool.steel);
        hanger.position.set(hPos.x, 48, hPos.z);
        gantryGroup.add(hanger);

        const sHead = this.createSignalHead(cfg.faceAngle);
        sHead.group.position.set(hPos.x, hPos.y, hPos.z);
        gantryGroup.add(sHead.group);
        headsList.push(sHead);
      }

      // 4. Downward Street Light Wash (Illuminates asphalt stop line & passing traffic)
      const washLight = new THREE.PointLight(0xff2222, 1.8, 85, 2);
      washLight.position.set(cfg.lightPos[0], cfg.lightPos[1], cfg.lightPos[2]);
      gantryGroup.add(washLight);

      this.scene.add(gantryGroup);
      this.gantryLenses[cfg.id] = { heads: headsList, light: washLight };
    }
  }

  // 3D Directional Corner Pole Sirens (Poles A–D)
  initPoleSirens() {
    const poles = [
      { id: 'A', x: -84, z: -84 },
      { id: 'B', x:  84, z: -84 },
      { id: 'C', x:  84, z:  84 },
      { id: 'D', x: -84, z:  84 }
    ];

    for (const p of poles) {
      const group = new THREE.Group();
      group.position.set(p.x, 0, p.z);

      // Lattice Mast
      const mastGeo = new THREE.CylinderGeometry(2, 3.5, 75, 10);
      const mast = new THREE.Mesh(mastGeo, this.matPool.steel);
      mast.position.y = 37.5;
      group.add(mast);

      // 4-Horn Megaphone Array
      const hornGeo = new THREE.ConeGeometry(3.5, 7, 8);
      const hornMat = new THREE.MeshLambertMaterial({ color: 0x475569 });
      for (let a = 0; a < 4; a++) {
        const h = new THREE.Mesh(hornGeo, hornMat);
        h.position.set(0, 74, 0);
        h.rotation.x = Math.PI / 2;
        h.rotation.z = (a * Math.PI) / 2;
        group.add(h);
      }

      // Rotating Strobe Beacon Dome
      const beaconGeo = new THREE.SphereGeometry(3.5, 10, 10);
      const beaconMat = new THREE.MeshBasicMaterial({ color: 0x64748b });
      const beacon = new THREE.Mesh(beaconGeo, beaconMat);
      beacon.position.y = 78;
      group.add(beacon);

      this.scene.add(group);
      this.sirenPoles[p.id] = { group, beacon, active: false };
    }
  }

  // 3D City Architecture & Metropolitan Cityscape (21 Detailed Buildings + Facade Window Textures)
  initCityArchitecture() {
    // 1. Initialize High-Resolution Procedural Facade Canvas Textures (Window Grids, Sills, Mullions, Lit Offices)
    this.facadeTextures = this.createFacadeTextures();

    // 2. Build 4 Dense Urban Quadrants (21 Unique Buildings)
    this.buildNorthEastQuadrant();
    this.buildSouthEastQuadrant();
    this.buildNorthWestQuadrant();
    this.buildSouthWestQuadrant();

    // 3. Street-Level Landscaping & Urban Trees
    this.addStreetTreesAndLandscaping();

    // 4. Elevated Metro Viaduct
    this.initMetroViaduct();
  }

  // Generates 5 distinct architectural canvas textures with individual window panes, frames, sills, and warm random room lights
  createFacadeTextures() {
    const createTexture = (painter) => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      painter(ctx);
      const tex = new THREE.CanvasTexture(canvas);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      return tex;
    };

    // 1. Modern Skyscraper Glass Curtain Wall (Deep twilight glass + crisp window grid + warm illuminated suites)
    const skyscraper = createTexture((ctx) => {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 512, 512);

      const cols = 8;
      const rows = 14;
      const colW = 512 / cols;
      const rowH = (512 - 64) / rows;

      for (let r = 0; r < rows; r++) {
        const y = r * rowH;
        // Floor spandrel slab
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, y, 512, 6);
        ctx.fillStyle = '#475569';
        ctx.fillRect(0, y + 5, 512, 1);

        for (let c = 0; c < cols; c++) {
          const x = c * colW;
          // Vertical mullion
          ctx.fillStyle = '#334155';
          ctx.fillRect(x, y, 5, rowH);

          const winX = x + 7;
          const winY = y + 8;
          const winW = colW - 12;
          const winH = rowH - 12;

          ctx.fillStyle = '#0a0f1d';
          ctx.fillRect(winX - 1, winY - 1, winW + 2, winH + 2);

          const hash = Math.sin(r * 37 + c * 73) * 10000;
          const rand = hash - Math.floor(hash);

          if (rand < 0.32) {
            // Warm golden amber interior light
            const grad = ctx.createLinearGradient(winX, winY, winX, winY + winH);
            grad.addColorStop(0, '#fef08a');
            grad.addColorStop(1, '#f59e0b');
            ctx.fillStyle = grad;
            ctx.fillRect(winX, winY, winW, winH);

            if (rand < 0.16) {
              ctx.fillStyle = '#78350f';
              ctx.fillRect(winX, winY, winW * 0.25, winH);
            }
          } else if (rand < 0.44) {
            // Cool white executive suite light
            ctx.fillStyle = '#e0f2fe';
            ctx.fillRect(winX, winY, winW, winH);
          } else {
            // Deep twilight reflective glass
            const grad = ctx.createLinearGradient(winX, winY, winX + winW, winY + winH);
            grad.addColorStop(0, '#0c4a6e');
            grad.addColorStop(1, '#082f49');
            ctx.fillStyle = grad;
            ctx.fillRect(winX, winY, winW, winH);

            ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
            ctx.fillRect(winX + winW * 0.2, winY + 2, winW * 0.3, winH - 4);
          }

          // Center mullion divider
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(winX + winW / 2 - 0.5, winY, 1, winH);
        }
      }

      // Ground Floor: Double-height glass storefronts & retail
      const lobbyY = 512 - 64;
      ctx.fillStyle = '#0a0f1d';
      ctx.fillRect(0, lobbyY, 512, 64);
      for (let sc = 0; sc < 4; sc++) {
        const sx = sc * 128 + 10;
        ctx.fillStyle = '#fffbeb';
        ctx.fillRect(sx, lobbyY + 12, 108, 48);
        ctx.fillStyle = '#334155';
        ctx.strokeRect(sx, lobbyY + 12, 108, 48);
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(sx, lobbyY + 6, 108, 6);
      }
    });

    // 2. Collegiate Heritage Red-Brick Facade (University Campus & Dorms)
    const brick = createTexture((ctx) => {
      ctx.fillStyle = '#881337';
      ctx.fillRect(0, 0, 512, 512);

      // Mortar lines
      ctx.fillStyle = 'rgba(254, 205, 211, 0.15)';
      for (let by = 0; by < 512; by += 8) {
        ctx.fillRect(0, by, 512, 1);
      }

      const cols = 8;
      const rows = 10;
      const colW = 512 / cols;
      const rowH = 512 / rows;

      for (let r = 0; r < rows; r++) {
        const y = r * rowH;
        for (let c = 0; c < cols; c++) {
          const x = c * colW;
          const winX = x + 14;
          const winY = y + 12;
          const winW = colW - 28;
          const winH = rowH - 24;

          // White limestone lintel & sill
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(winX - 3, winY - 4, winW + 6, 4);
          ctx.fillRect(winX - 4, winY + winH, winW + 8, 4);

          const hash = Math.sin(r * 29 + c * 53) * 10000;
          const rand = hash - Math.floor(hash);

          if (rand < 0.40) {
            ctx.fillStyle = '#fef08a';
            ctx.fillRect(winX, winY, winW, winH);
          } else {
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(winX, winY, winW, winH);
          }

          // Collegiate window cross mullions
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(winX + winW / 2 - 1, winY, 2, winH);
          ctx.fillRect(winX, winY + winH / 2 - 1, winW, 2);
        }
      }
    });

    // 3. Clinical Medical Precast Concrete & Louvered Windows (Hospital Campus)
    const hospital = createTexture((ctx) => {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, 512, 512);

      const rows = 12;
      const cols = 10;
      const colW = 512 / cols;
      const rowH = 512 / rows;

      for (let r = 0; r < rows; r++) {
        const y = r * rowH;
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(0, y + rowH - 8, 512, 8);

        for (let c = 0; c < cols; c++) {
          const x = c * colW;
          const winX = x + 8;
          const winY = y + 8;
          const winW = colW - 16;
          const winH = rowH - 18;

          const hash = Math.sin(r * 41 + c * 67) * 10000;
          const rand = hash - Math.floor(hash);

          if (rand < 0.45) {
            ctx.fillStyle = '#e0f2fe';
          } else {
            ctx.fillStyle = '#0284c7';
          }
          ctx.fillRect(winX, winY, winW, winH);

          ctx.fillStyle = '#64748b';
          ctx.strokeRect(winX, winY, winW, winH);
        }
      }
    });

    // 4. CyberTech Titanium Composite & Smart Glass with Cyan LED Neon
    const tech = createTexture((ctx) => {
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, 512, 512);

      const cols = 8;
      const rows = 12;
      const colW = 512 / cols;
      const rowH = 512 / rows;

      for (let r = 0; r < rows; r++) {
        const y = r * rowH;
        ctx.fillStyle = '#06b6d4';
        ctx.fillRect(0, y + rowH - 4, 512, 3);

        for (let c = 0; c < cols; c++) {
          const x = c * colW;
          const winX = x + 8;
          const winY = y + 6;
          const winW = colW - 16;
          const winH = rowH - 14;

          const hash = Math.sin(r * 43 + c * 83) * 10000;
          const rand = hash - Math.floor(hash);

          if (rand < 0.35) {
            ctx.fillStyle = '#cffafe';
          } else if (rand < 0.50) {
            ctx.fillStyle = '#0891b2';
          } else {
            ctx.fillStyle = '#042f2e';
          }
          ctx.fillRect(winX, winY, winW, winH);

          ctx.fillStyle = '#1e293b';
          ctx.strokeRect(winX, winY, winW, winH);
        }
      }
    });

    // 5. Urban Residential Tower / Condos / Apartments
    const residential = createTexture((ctx) => {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, 512, 512);

      const cols = 8;
      const rows = 12;
      const colW = 512 / cols;
      const rowH = 512 / rows;

      for (let r = 0; r < rows; r++) {
        const y = r * rowH;
        ctx.fillStyle = '#334155';
        ctx.fillRect(0, y + rowH - 6, 512, 6);

        for (let c = 0; c < cols; c++) {
          const x = c * colW;
          const winX = x + 10;
          const winY = y + 8;
          const winW = colW - 20;
          const winH = rowH - 16;

          const hash = Math.sin(r * 19 + c * 61) * 10000;
          const rand = hash - Math.floor(hash);

          if (rand < 0.38) {
            ctx.fillStyle = '#fef3c7';
            ctx.fillRect(winX, winY, winW, winH);
            ctx.fillStyle = '#d97706';
            ctx.fillRect(winX, winY, winW * 0.3, winH);
          } else {
            ctx.fillStyle = '#0a0f1d';
            ctx.fillRect(winX, winY, winW, winH);
          }

          ctx.fillStyle = '#475569';
          ctx.strokeRect(winX, winY, winW, winH);
        }
      }
    });

    return { skyscraper, brick, hospital, tech, residential };
  }

  // Helper: Creates a textured building box with independent wall UV scaling and dark asphalt roof
  createBuildingMesh(width, height, depth, type, customRx, customRy) {
    const rxX = Math.max(1, Math.round(depth / 32));
    const rxZ = Math.max(1, Math.round(width / 32));
    const ry = customRy || Math.max(1, Math.round(height / 20));

    const baseTex = this.facadeTextures[type] || this.facadeTextures.skyscraper;

    const texSide = baseTex.clone();
    texSide.repeat.set(rxX, ry);
    texSide.needsUpdate = true;
    const matSide = new THREE.MeshLambertMaterial({ map: texSide });

    const texFront = baseTex.clone();
    texFront.repeat.set(rxZ, ry);
    texFront.needsUpdate = true;
    const matFront = new THREE.MeshLambertMaterial({ map: texFront });

    const roofMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    const botMat = new THREE.MeshLambertMaterial({ color: 0x0f172a });

    // Multi-materials: [ +X, -X, +Y, -Y, +Z, -Z ]
    const mats = [matSide, matSide, roofMat, botMat, matFront, matFront];
    return new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), mats);
  }

  // Helper: Adds 4-sided 3D roof parapet coping wall around roof edge
  addRoofParapet(parent, width, height, depth, colorHex) {
    const pMat = new THREE.MeshLambertMaterial({ color: colorHex || 0x334155 });
    const pH = 2.4;
    const pT = 1.6;
    const y = height + pH / 2;

    const pNorth = new THREE.Mesh(new THREE.BoxGeometry(width, pH, pT), pMat);
    pNorth.position.set(0, y, -depth / 2 + pT / 2);
    parent.add(pNorth);

    const pSouth = new THREE.Mesh(new THREE.BoxGeometry(width, pH, pT), pMat);
    pSouth.position.set(0, y, depth / 2 - pT / 2);
    parent.add(pSouth);

    const pEast = new THREE.Mesh(new THREE.BoxGeometry(pT, pH, depth - pT * 2), pMat);
    pEast.position.set(width / 2 - pT / 2, y, 0);
    parent.add(pEast);

    const pWest = new THREE.Mesh(new THREE.BoxGeometry(pT, pH, depth - pT * 2), pMat);
    pWest.position.set(-width / 2 + pT / 2, y, 0);
    parent.add(pWest);
  }

  // Helper: Adds realistic 3D rooftop mechanical equipment
  addRooftopDetails(parent, width, height, depth, options = {}) {
    const { hasHvac = true, hasWaterTank = false, hasAntenna = false, hasElevator = true } = options;
    const hvacMat = new THREE.MeshLambertMaterial({ color: 0x64748b });
    const ventMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.7, roughness: 0.3 });

    if (hasElevator) {
      const eW = Math.min(22, width * 0.32);
      const eD = Math.min(20, depth * 0.32);
      const eH = 9.0;
      const elev = new THREE.Mesh(new THREE.BoxGeometry(eW, eH, eD), hvacMat);
      elev.position.set(-width * 0.15, height + eH / 2, -depth * 0.15);
      parent.add(elev);
    }

    if (hasHvac) {
      const numHvac = width > 75 ? 2 : 1;
      for (let i = 0; i < numHvac; i++) {
        const hx = width * 0.18 * (i === 0 ? 1 : -0.6);
        const hz = depth * 0.18 * (i === 0 ? 1 : -0.6);
        const hvac = new THREE.Mesh(new THREE.BoxGeometry(12, 6, 12), hvacMat);
        hvac.position.set(hx, height + 3, hz);
        parent.add(hvac);

        const fan = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.2, 1.0, 10), ventMat);
        fan.position.set(hx, height + 6.5, hz);
        parent.add(fan);
      }
    }

    if (hasWaterTank) {
      const tankMat = new THREE.MeshLambertMaterial({ color: 0x78350f });
      const roofMat = new THREE.MeshLambertMaterial({ color: 0x451a03 });
      const tx = width * 0.22;
      const tz = -depth * 0.22;

      for (const sx of [-3, 3]) {
        for (const sz of [-3, 3]) {
          const stilt = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 8, 6), steelMat);
          stilt.position.set(tx + sx, height + 4, tz + sz);
          parent.add(stilt);
        }
      }

      const tank = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.5, 7, 12), tankMat);
      tank.position.set(tx, height + 11.5, tz);
      parent.add(tank);

      const tRoof = new THREE.Mesh(new THREE.ConeGeometry(5.2, 3.5, 12), roofMat);
      tRoof.position.set(tx, height + 16.5, tz);
      parent.add(tRoof);
    }

    if (hasAntenna) {
      const mastH = 26;
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 1.2, mastH, 8), steelMat);
      mast.position.set(0, height + mastH / 2, 0);
      parent.add(mast);

      const beacon = new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 8), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
      beacon.position.set(0, height + mastH + 0.6, 0);
      parent.add(beacon);
    }
  }

  // Helper: Adds cantilevered entrance canopy with steel columns
  addEntranceCanopy(parent, width, depth, canopySide = 'south') {
    const canopyMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.7, roughness: 0.3 });
    const cW = Math.min(36, width * 0.6);
    const cD = 18;
    const cH = 2.4;
    const cY = 14;

    const canopy = new THREE.Mesh(new THREE.BoxGeometry(cW, cH, cD), canopyMat);
    const offsetZ = canopySide === 'south' ? depth / 2 + cD / 2 : -depth / 2 - cD / 2;
    canopy.position.set(0, cY, offsetZ);
    parent.add(canopy);

    for (const cx of [-cW * 0.4, cW * 0.4]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, cY, 8), steelMat);
      col.position.set(cx, cY / 2, offsetZ + (canopySide === 'south' ? cD * 0.35 : -cD * 0.35));
      parent.add(col);
    }
  }

  // ========================================================
  // QUADRANT 1 (NORTH-EAST): Financial & Commercial High-Rise District (6 Buildings)
  // ========================================================
  buildNorthEastQuadrant() {
    // 1. Apex Horizon Skyscraper (Landmark Trophy Tower, H: 260)
    const apex = new THREE.Group();
    apex.position.set(220, 0, -220);

    const podium = this.createBuildingMesh(130, 26, 130, 'skyscraper');
    podium.position.set(0, 13, 0);
    apex.add(podium);

    const shaft = this.createBuildingMesh(110, 142, 110, 'skyscraper');
    shaft.position.set(0, 26 + 71, 0);
    apex.add(shaft);

    const setback = this.createBuildingMesh(84, 62, 84, 'skyscraper');
    setback.position.set(0, 168 + 31, 0);
    apex.add(setback);

    const crown = new THREE.Mesh(new THREE.BoxGeometry(62, 26, 62), new THREE.MeshLambertMaterial({ color: 0x0f172a }));
    crown.position.set(0, 230 + 13, 0);
    apex.add(crown);

    const crownGlow = new THREE.Mesh(new THREE.BoxGeometry(63.2, 2.4, 63.2), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
    crownGlow.position.set(0, 250, 0);
    apex.add(crownGlow);

    this.addRoofParapet(apex, 84, 230, 84, 0x475569);
    this.addRooftopDetails(apex, 62, 256, 62, { hasHvac: true, hasAntenna: true, hasElevator: true });
    this.addEntranceCanopy(apex, 130, 130, 'south');

    // 4 Corner Architectural White Fins
    const finMat = new THREE.MeshLambertMaterial({ color: 0xf8fafc });
    for (const fx of [-55.5, 55.5]) {
      for (const fz of [-55.5, 55.5]) {
        const fin = new THREE.Mesh(new THREE.BoxGeometry(3.6, 142, 3.6), finMat);
        fin.position.set(fx, 26 + 71, fz);
        apex.add(fin);
      }
    }

    // High Broadcast Spire & Aviation Beacon
    const spireMat = new THREE.MeshStandardMaterial({ color: 0xcfd8dc, metalness: 0.8, roughness: 0.2 });
    const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 2.4, 48, 8), spireMat);
    spire.position.set(0, 280, 0);
    apex.add(spire);

    const beacon = new THREE.Mesh(new THREE.SphereGeometry(1.8, 8, 8), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    beacon.position.set(0, 304, 0);
    apex.add(beacon);

    this.scene.add(apex);

    // 2. Metropolitan Financial Bank Tower (H: 175)
    const b2 = new THREE.Group();
    b2.position.set(360, 0, -160);
    const b2Mesh = this.createBuildingMesh(85, 175, 75, 'skyscraper');
    b2Mesh.position.set(0, 87.5, 0);
    b2.add(b2Mesh);
    this.addRoofParapet(b2, 85, 175, 75);
    this.addRooftopDetails(b2, 85, 175, 75, { hasHvac: true, hasAntenna: true });
    this.addEntranceCanopy(b2, 85, 75, 'south');
    this.scene.add(b2);

    // 3. Century Media Tower (H: 140)
    const b3 = new THREE.Group();
    b3.position.set(150, 0, -340);
    const b3Mesh = this.createBuildingMesh(80, 140, 80, 'skyscraper');
    b3Mesh.position.set(0, 70, 0);
    b3.add(b3Mesh);
    this.addRoofParapet(b3, 80, 140, 80);
    this.addRooftopDetails(b3, 80, 140, 80, { hasHvac: true, hasAntenna: true });
    this.scene.add(b3);

    // 4. Junction Gateway Commercial Center (Corner Near Intersection, H: 65)
    const b4 = new THREE.Group();
    b4.position.set(130, 0, -150);
    const b4Mesh = this.createBuildingMesh(65, 65, 65, 'residential');
    b4Mesh.position.set(0, 32.5, 0);
    b4.add(b4Mesh);
    this.addRoofParapet(b4, 65, 65, 65);
    this.addRooftopDetails(b4, 65, 65, 65, { hasHvac: true });
    this.addEntranceCanopy(b4, 65, 65, 'south');
    this.scene.add(b4);

    // 5. Skyview Luxury Executive Condos (H: 160)
    const b5 = new THREE.Group();
    b5.position.set(340, 0, -330);
    const b5Mesh = this.createBuildingMesh(80, 160, 80, 'residential');
    b5Mesh.position.set(0, 80, 0);
    b5.add(b5Mesh);
    this.addRoofParapet(b5, 80, 160, 80);
    this.addRooftopDetails(b5, 80, 160, 80, { hasHvac: true, hasWaterTank: true });
    this.scene.add(b5);

    // 6. North-East Mid-Rise Office Block (H: 85)
    const b6 = new THREE.Group();
    b6.position.set(230, 0, -370);
    const b6Mesh = this.createBuildingMesh(90, 85, 65, 'skyscraper');
    b6Mesh.position.set(0, 42.5, 0);
    b6.add(b6Mesh);
    this.addRoofParapet(b6, 90, 85, 65);
    this.addRooftopDetails(b6, 90, 85, 65, { hasHvac: true });
    this.scene.add(b6);
  }

  // ========================================================
  // QUADRANT 2 (SOUTH-EAST): Medical Center & Health Sciences Campus (5 Buildings)
  // ========================================================
  buildSouthEastQuadrant() {
    // 1. St. Jude Metropolitan Trauma Center (Hospital Landmark, Helipad & 3D Red Crosses)
    const hospGroup = new THREE.Group();
    hospGroup.position.set(220, 0, 220);

    const podium = this.createBuildingMesh(160, 54, 140, 'hospital');
    podium.position.set(0, 27, 0);
    hospGroup.add(podium);

    const wardTower = this.createBuildingMesh(108, 32, 96, 'hospital');
    wardTower.position.set(0, 54 + 16, 0);
    hospGroup.add(wardTower);

    this.addRoofParapet(hospGroup, 108, 86, 96, 0xe2e8f0);

    // Emergency Department (ER) Ambulance Trauma Intake Bay
    const canopyMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    const erCanopy = new THREE.Mesh(new THREE.BoxGeometry(60, 3.2, 28), canopyMat);
    erCanopy.position.set(0, 16, -78);
    hospGroup.add(erCanopy);

    const steelColMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.7, roughness: 0.3 });
    for (const cx of [-24, 24]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 16, 8), steelColMat);
      col.position.set(cx, 8, -90);
      hospGroup.add(col);
    }

    const erSign = new THREE.Mesh(new THREE.BoxGeometry(44, 3.4, 0.6), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    erSign.position.set(0, 16, -92.2);
    hospGroup.add(erSign);

    // Two Large 3D Illuminated Red Crosses
    const redCrossMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const c1H = new THREE.Mesh(new THREE.BoxGeometry(30, 7.0, 2.5), redCrossMat);
    c1H.position.set(0, 40, -71.5);
    const c1V = new THREE.Mesh(new THREE.BoxGeometry(7.0, 30, 2.5), redCrossMat);
    c1V.position.set(0, 40, -71.5);
    hospGroup.add(c1H);
    hospGroup.add(c1V);

    const c2H = new THREE.Mesh(new THREE.BoxGeometry(2.5, 7.0, 30), redCrossMat);
    c2H.position.set(-81.5, 40, 0);
    const c2V = new THREE.Mesh(new THREE.BoxGeometry(2.5, 30, 7.0), redCrossMat);
    c2V.position.set(-81.5, 40, 0);
    hospGroup.add(c2H);
    hospGroup.add(c2V);

    // Rooftop Trauma Heliport (Y: 88)
    const padDeck = new THREE.Mesh(new THREE.CylinderGeometry(28, 30, 2.4, 16), new THREE.MeshLambertMaterial({ color: 0x1e293b }));
    padDeck.position.set(0, 88, 0);
    hospGroup.add(padDeck);

    const padRing = new THREE.Mesh(new THREE.RingGeometry(18, 20, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xf8fafc }));
    padRing.position.set(0, 89.3, 0);
    hospGroup.add(padRing);

    const hBar1 = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.2, 18), new THREE.MeshBasicMaterial({ color: 0xf8fafc }));
    hBar1.position.set(-6.5, 89.3, 0);
    const hBar2 = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.2, 18), new THREE.MeshBasicMaterial({ color: 0xf8fafc }));
    hBar2.position.set(6.5, 89.3, 0);
    const hCross = new THREE.Mesh(new THREE.BoxGeometry(10, 0.2, 3.6), new THREE.MeshBasicMaterial({ color: 0xf8fafc }));
    hCross.position.set(0, 89.3, 0);
    hospGroup.add(hBar1);
    hospGroup.add(hBar2);
    hospGroup.add(hCross);

    const greenBeaconMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
    for (let a = 0; a < 8; a++) {
      const ang = (Math.PI / 4) * a;
      const lx = Math.cos(ang) * 27.5;
      const lz = Math.sin(ang) * 27.5;
      const pLight = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 1.2, 6), greenBeaconMat);
      pLight.position.set(lx, 89.6, lz);
      hospGroup.add(pLight);
    }

    this.scene.add(hospGroup);

    // 2. LifeSciences Research & Diagnostic Institute (H: 120)
    const se2 = new THREE.Group();
    se2.position.set(360, 0, 160);
    const se2Mesh = this.createBuildingMesh(85, 120, 75, 'hospital');
    se2Mesh.position.set(0, 60, 0);
    se2.add(se2Mesh);
    this.addRoofParapet(se2, 85, 120, 75);
    this.addRooftopDetails(se2, 85, 120, 75, { hasHvac: true, hasElevator: true });
    this.scene.add(se2);

    // 3. Medical Specialists Plaza & Clinics (H: 90)
    const se3 = new THREE.Group();
    se3.position.set(150, 0, 340);
    const se3Mesh = this.createBuildingMesh(85, 90, 85, 'hospital');
    se3Mesh.position.set(0, 45, 0);
    se3.add(se3Mesh);
    this.addRoofParapet(se3, 85, 90, 85);
    this.addRooftopDetails(se3, 85, 90, 85, { hasHvac: true });
    this.scene.add(se3);

    // 4. 24/7 Pharmacy & Emergency Clinic (Corner Near Intersection, H: 50)
    const se4 = new THREE.Group();
    se4.position.set(130, 0, 130);
    const se4Mesh = this.createBuildingMesh(65, 50, 65, 'hospital');
    se4Mesh.position.set(0, 25, 0);
    se4.add(se4Mesh);
    this.addRoofParapet(se4, 65, 50, 65);
    this.addEntranceCanopy(se4, 65, 65, 'north');
    this.scene.add(se4);

    // 5. Physicians' & Healthcare Residential Tower (H: 145)
    const se5 = new THREE.Group();
    se5.position.set(330, 0, 330);
    const se5Mesh = this.createBuildingMesh(75, 145, 70, 'residential');
    se5Mesh.position.set(0, 72.5, 0);
    se5.add(se5Mesh);
    this.addRoofParapet(se5, 75, 145, 70);
    this.addRooftopDetails(se5, 75, 145, 70, { hasHvac: true, hasWaterTank: true });
    this.scene.add(se5);
  }

  // ========================================================
  // QUADRANT 3 (NORTH-WEST): Imperial Academy University Campus & Historic District (5 Buildings)
  // ========================================================
  buildNorthWestQuadrant() {
    // 1. Imperial Academy Main Quad & 4-Faced Heritage Clock Tower (Landmark)
    const campusGroup = new THREE.Group();
    campusGroup.position.set(-220, 0, -220);

    const hallMesh = this.createBuildingMesh(130, 68, 90, 'brick');
    hallMesh.position.set(-20, 34, 0);
    campusGroup.add(hallMesh);

    // Pitched Slate Mansard Roof on Academic Hall
    const hallRoof = new THREE.Mesh(new THREE.BoxGeometry(122, 12, 82), new THREE.MeshLambertMaterial({ color: 0x334155 }));
    hallRoof.position.set(-20, 74, 0);
    campusGroup.add(hallRoof);

    // Classical Columned Portico Entrance
    const stoneMat = new THREE.MeshLambertMaterial({ color: 0xf1f5f9 });
    const porticoRoof = new THREE.Mesh(new THREE.BoxGeometry(36, 4.0, 18), stoneMat);
    porticoRoof.position.set(-20, 26, 46);
    campusGroup.add(porticoRoof);

    for (const colX of [-12, -4, 4, 12]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.6, 22, 10), stoneMat);
      col.position.set(-20 + colX, 13, 50);
      campusGroup.add(col);
    }

    // ========================================================
    // 4-FACED HERITAGE CLOCK TOWER (Commanding Corner at world -150, -150)
    // ========================================================
    const towerGroup = new THREE.Group();
    towerGroup.position.set(70, 0, 70);

    const tBase = new THREE.Mesh(new THREE.BoxGeometry(42, 8.0, 42), stoneMat);
    tBase.position.set(0, 4.0, 0);
    towerGroup.add(tBase);

    const tShaft = this.createBuildingMesh(34, 122, 34, 'brick', 2, 8);
    tShaft.position.set(0, 69, 0);
    towerGroup.add(tShaft);

    // Corner Stone Quoins
    for (const qy of [20, 45, 70, 95, 120]) {
      for (const qx of [-17.2, 17.2]) {
        for (const qz of [-17.2, 17.2]) {
          const quoin = new THREE.Mesh(new THREE.BoxGeometry(3.0, 6.0, 3.0), stoneMat);
          quoin.position.set(qx, qy, qz);
          towerGroup.add(quoin);
        }
      }
    }

    // Upper Clock Chamber (Y: 130 to 156, height 26, 38x38)
    const clockChamber = new THREE.Mesh(new THREE.BoxGeometry(38, 26, 38), stoneMat);
    clockChamber.position.set(0, 143, 0);
    towerGroup.add(clockChamber);

    // Four Giant Circular Clock Faces
    const clockFaceMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const clockHandMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
    const clockOffsets = [
      { x: 0, z: 19.3, rotY: 0 },
      { x: 0, z: -19.3, rotY: Math.PI },
      { x: 19.3, z: 0, rotY: Math.PI / 2 },
      { x: -19.3, z: 0, rotY: -Math.PI / 2 }
    ];

    for (const cOff of clockOffsets) {
      const bezel = new THREE.Mesh(new THREE.CylinderGeometry(7.5, 7.5, 0.4, 24).rotateX(Math.PI / 2), stoneMat);
      bezel.position.set(cOff.x, 143, cOff.z);
      bezel.rotation.y = cOff.rotY;
      towerGroup.add(bezel);

      const dial = new THREE.Mesh(new THREE.CylinderGeometry(6.4, 6.4, 0.5, 24).rotateX(Math.PI / 2), clockFaceMat);
      dial.position.set(cOff.x, 143, cOff.z);
      dial.rotation.y = cOff.rotY;
      towerGroup.add(dial);

      const hHand = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3.2, 0.6), clockHandMat);
      hHand.position.set(cOff.x, 144, cOff.z);
      hHand.rotation.z = 0.55;
      hHand.rotation.y = cOff.rotY;
      towerGroup.add(hHand);

      const mHand = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4.4, 0.6), clockHandMat);
      mHand.position.set(cOff.x, 144.5, cOff.z);
      mHand.rotation.z = -0.55;
      mHand.rotation.y = cOff.rotY;
      towerGroup.add(mHand);
    }

    // Open-Arched Belfry & Bronze Bell
    const belfryPillars = new THREE.Mesh(new THREE.BoxGeometry(34, 14, 34), stoneMat);
    belfryPillars.position.set(0, 163, 0);
    towerGroup.add(belfryPillars);

    const bell = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 4.8, 6.5, 12), new THREE.MeshStandardMaterial({ color: 0xb45309, metalness: 0.8, roughness: 0.3 }));
    bell.position.set(0, 162, 0);
    towerGroup.add(bell);

    // Steep Pyramidal Copper/Verdigris Spire Roof
    const spireRoof = new THREE.Mesh(new THREE.ConeGeometry(20, 28, 4).rotateY(Math.PI / 4), new THREE.MeshLambertMaterial({ color: 0x0f766e }));
    spireRoof.position.set(0, 184, 0);
    towerGroup.add(spireRoof);

    // Golden Weathervane Finial
    const goldMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const weathervaneRod = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 8.0, 8), goldMat);
    weathervaneRod.position.set(0, 201, 0);
    towerGroup.add(weathervaneRod);

    const weathervaneOrb = new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 8), goldMat);
    weathervaneOrb.position.set(0, 205, 0);
    towerGroup.add(weathervaneOrb);

    campusGroup.add(towerGroup);
    this.scene.add(campusGroup);

    // 2. Science & Robotics Hall with Rooftop Astronomical Observatory (H: 95)
    const nw2 = new THREE.Group();
    nw2.position.set(-350, 0, -150);
    const nw2Mesh = this.createBuildingMesh(85, 95, 75, 'brick');
    nw2Mesh.position.set(0, 47.5, 0);
    nw2.add(nw2Mesh);
    this.addRoofParapet(nw2, 85, 95, 75, 0x881337);

    // Astronomical Observatory Dome
    const domeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3, metalness: 0.6 });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(11, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), domeMat);
    dome.position.set(0, 95, 0);
    nw2.add(dome);

    const slit = new THREE.Mesh(new THREE.BoxGeometry(3.0, 12, 22), new THREE.MeshLambertMaterial({ color: 0x0f172a }));
    slit.position.set(0, 95 + 5, 0);
    nw2.add(slit);

    this.scene.add(nw2);

    // 3. Faculty of Law & Humanities (H: 85)
    const nw3 = new THREE.Group();
    nw3.position.set(-150, 0, -340);
    const nw3Mesh = this.createBuildingMesh(80, 85, 75, 'brick');
    nw3Mesh.position.set(0, 42.5, 0);
    nw3.add(nw3Mesh);
    this.addRoofParapet(nw3, 80, 85, 75);
    this.addRooftopDetails(nw3, 80, 85, 75, { hasHvac: true });
    this.scene.add(nw3);

    // 4. Campus Bookstore, Union & Cafe (Corner Near Intersection, H: 52)
    const nw4 = new THREE.Group();
    nw4.position.set(-130, 0, -150);
    const nw4Mesh = this.createBuildingMesh(65, 52, 65, 'brick');
    nw4Mesh.position.set(0, 26, 0);
    nw4.add(nw4Mesh);
    this.addRoofParapet(nw4, 65, 52, 65);
    this.addEntranceCanopy(nw4, 65, 65, 'south');
    this.scene.add(nw4);

    // 5. Graduate Collegiate Dormitory Tower (H: 125)
    const nw5 = new THREE.Group();
    nw5.position.set(-330, 0, -330);
    const nw5Mesh = this.createBuildingMesh(75, 125, 75, 'brick');
    nw5Mesh.position.set(0, 62.5, 0);
    nw5.add(nw5Mesh);
    this.addRoofParapet(nw5, 75, 125, 75);
    this.addRooftopDetails(nw5, 75, 125, 75, { hasHvac: true, hasWaterTank: true });
    this.scene.add(nw5);
  }

  // ========================================================
  // QUADRANT 4 (SOUTH-WEST): CyberTech Innovation Hub & Smart District (5 Buildings)
  // ========================================================
  buildSouthWestQuadrant() {
    // 1. CyberTech Innovation Hub & Suspended Glass Skybridge (Landmark)
    const techGroup = new THREE.Group();
    techGroup.position.set(-220, 0, 220);

    // Tower 1 (West Wing: X = -50, width 68, depth 84, height 95)
    const t1Mesh = this.createBuildingMesh(68, 95, 84, 'tech');
    t1Mesh.position.set(-50, 47.5, 0);
    techGroup.add(t1Mesh);
    this.addRoofParapet(techGroup, 68, 95, 84, 0x06b6d4);

    // Tower 2 (East Wing: X = +28, width 62, depth 84, height 125)
    const t2Mesh = this.createBuildingMesh(62, 125, 84, 'tech');
    t2Mesh.position.set(28, 62.5, 0);
    techGroup.add(t2Mesh);

    // SUSPENDED ARCHITECTURAL GLASS SKYBRIDGE
    const bridgeX = -11;
    const bridgeY = 60;
    const smartGlassMat = new THREE.MeshStandardMaterial({ color: 0x0e7490, metalness: 0.8, roughness: 0.2 });
    const skybridge = new THREE.Mesh(new THREE.BoxGeometry(32, 12, 22), smartGlassMat);
    skybridge.position.set(bridgeX, bridgeY, 0);
    techGroup.add(skybridge);

    const slateTrimMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    const bTop = new THREE.Mesh(new THREE.BoxGeometry(33, 1.2, 23), slateTrimMat);
    bTop.position.set(bridgeX, bridgeY + 6.2, 0);
    const bBot = new THREE.Mesh(new THREE.BoxGeometry(33, 1.2, 23), slateTrimMat);
    bBot.position.set(bridgeX, bridgeY - 6.2, 0);
    techGroup.add(bTop);
    techGroup.add(bBot);

    // Skybridge Interior Walkway Glow
    const bGlow = new THREE.Mesh(new THREE.BoxGeometry(31, 8.0, 20), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
    bGlow.position.set(bridgeX, bridgeY, 0);
    techGroup.add(bGlow);

    // Skybridge Cyan Edge Neon Lighting
    const bNeon = new THREE.Mesh(new THREE.BoxGeometry(33.2, 0.5, 23.2), new THREE.MeshBasicMaterial({ color: 0x06b6d4 }));
    bNeon.position.set(bridgeX, bridgeY + 6.5, 0);
    techGroup.add(bNeon);

    // Rooftop Photovoltaic Solar Arrays on Tower 1
    const solarMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, metalness: 0.85, roughness: 0.2 });
    for (const sx of [-65, -45, -25]) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(14, 0.8, 26).rotateX(0.25), solarMat);
      panel.position.set(sx, 100, 0);
      techGroup.add(panel);
    }

    // Rooftop Communications Satellite Dish on Tower 2
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.7, roughness: 0.3 });
    const dishMast = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.0, 10, 8), steelMat);
    dishMast.position.set(28, 133, -15);
    techGroup.add(dishMast);

    const dish = new THREE.Mesh(new THREE.CylinderGeometry(6.0, 1.0, 2.5, 16).rotateZ(0.6), steelMat);
    dish.position.set(28, 139, -15);
    techGroup.add(dish);

    this.scene.add(techGroup);

    // 2. AI Cloud Data Center & Fiber Exchange (H: 90)
    const sw2 = new THREE.Group();
    sw2.position.set(-350, 0, 160);
    const sw2Mesh = this.createBuildingMesh(85, 90, 75, 'tech');
    sw2Mesh.position.set(0, 45, 0);
    sw2.add(sw2Mesh);
    this.addRoofParapet(sw2, 85, 90, 75, 0x06b6d4);
    this.addRooftopDetails(sw2, 85, 90, 75, { hasHvac: true, hasElevator: true });
    this.scene.add(sw2);

    // 3. Telecommunications Broadcast Tower (H: 110)
    const sw3 = new THREE.Group();
    sw3.position.set(-150, 0, 340);
    const sw3Mesh = this.createBuildingMesh(75, 110, 70, 'tech');
    sw3Mesh.position.set(0, 55, 0);
    sw3.add(sw3Mesh);
    this.addRoofParapet(sw3, 75, 110, 70);
    this.addRooftopDetails(sw3, 75, 110, 70, { hasHvac: true, hasAntenna: true });
    this.scene.add(sw3);

    // 4. Tech Incubator & Hardware Lab (Corner Near Intersection, H: 54)
    const sw4 = new THREE.Group();
    sw4.position.set(-130, 0, 130);
    const sw4Mesh = this.createBuildingMesh(65, 54, 65, 'tech');
    sw4Mesh.position.set(0, 27, 0);
    sw4.add(sw4Mesh);
    this.addRoofParapet(sw4, 65, 54, 65, 0x06b6d4);
    this.addEntranceCanopy(sw4, 65, 65, 'north');
    this.scene.add(sw4);

    // 5. Urban Cyber Lofts (H: 130)
    const sw5 = new THREE.Group();
    sw5.position.set(-330, 0, 330);
    const sw5Mesh = this.createBuildingMesh(75, 130, 70, 'residential');
    sw5Mesh.position.set(0, 65, 0);
    sw5.add(sw5Mesh);
    this.addRoofParapet(sw5, 75, 130, 70);
    this.addRooftopDetails(sw5, 75, 130, 70, { hasHvac: true, hasWaterTank: true });
    this.scene.add(sw5);
  }

  // Helper: Adds low-poly urban street trees and concrete planter boxes along sidewalks
  addStreetTreesAndLandscaping() {
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x3e2723 });
    const leafMat1 = new THREE.MeshLambertMaterial({ color: 0x15803d });
    const leafMat2 = new THREE.MeshLambertMaterial({ color: 0x16a34a });
    const planterMat = new THREE.MeshLambertMaterial({ color: 0x475569 });

    const treeCoords = [
      [78, -78], [115, -78], [78, -115], [155, -78], [78, -155],
      [78, 78], [115, 78], [78, 115], [155, 78], [78, 155],
      [-78, -78], [-115, -78], [-78, -115], [-155, -78], [-78, -155],
      [-78, 78], [-115, 78], [-78, 115], [-155, 78], [-78, 155]
    ];

    for (let i = 0; i < treeCoords.length; i++) {
      const [tx, tz] = treeCoords[i];

      const planter = new THREE.Mesh(new THREE.BoxGeometry(6.5, 1.2, 6.5), planterMat);
      planter.position.set(tx, 0.6, tz);
      this.scene.add(planter);

      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 7, 6), trunkMat);
      trunk.position.set(tx, 4.0, tz);
      this.scene.add(trunk);

      const f1 = new THREE.Mesh(new THREE.ConeGeometry(4.5, 7.5, 7), i % 2 === 0 ? leafMat1 : leafMat2);
      f1.position.set(tx, 9.5, tz);
      this.scene.add(f1);

      const f2 = new THREE.Mesh(new THREE.ConeGeometry(3.6, 6.0, 7), i % 2 === 0 ? leafMat2 : leafMat1);
      f2.position.set(tx, 13.5, tz);
      this.scene.add(f2);
    }
  }

  initMetroViaduct() {
    const viaductZ = -105;
    const deckY = 46;
    const span = 600;

    const concreteMat = new THREE.MeshLambertMaterial({ color: 0x64748b });
    const pillars = [-360, -200, 200, 360];
    for (const px of pillars) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(6, 7, deckY, 10), concreteMat);
      p.position.set(px, deckY / 2, viaductZ);
      this.scene.add(p);
    }

    // Concrete Viaduct Deck
    const deck = new THREE.Mesh(new THREE.BoxGeometry(span * 2, 6, 22), concreteMat);
    deck.position.set(0, deckY, viaductZ);
    this.scene.add(deck);

    // North & South Concrete Parapets / Crash Barrier Guardwalls
    const parapetMat = new THREE.MeshLambertMaterial({ color: 0x475569 });
    const railHandMat = new THREE.MeshLambertMaterial({ color: 0x94a3b8 });
    for (const zOffset of [-10.3, 10.3]) {
      const parapet = new THREE.Mesh(new THREE.BoxGeometry(span * 2, 3.8, 1.4), parapetMat);
      parapet.position.set(0, deckY + 4.9, viaductZ + zOffset);
      this.scene.add(parapet);

      const handrail = new THREE.Mesh(new THREE.BoxGeometry(span * 2, 0.4, 0.8), railHandMat);
      handrail.position.set(0, deckY + 7.0, viaductZ + zOffset);
      this.scene.add(handrail);
    }

    // Track Plinth (Continuous Concrete Trackbed)
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(span * 2, 0.8, 14), new THREE.MeshLambertMaterial({ color: 0x334155 }));
    plinth.position.set(0, deckY + 3.4, viaductZ);
    this.scene.add(plinth);

    // Twin Steel Running Rails
    const steelRailMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.85, roughness: 0.25 });
    const railNorth = new THREE.Mesh(new THREE.BoxGeometry(span * 2, 0.7, 0.6), steelRailMat);
    railNorth.position.set(0, deckY + 4.15, viaductZ - 3.8);
    this.scene.add(railNorth);

    const railSouth = new THREE.Mesh(new THREE.BoxGeometry(span * 2, 0.7, 0.6), steelRailMat);
    railSouth.position.set(0, deckY + 4.15, viaductZ + 3.8);
    this.scene.add(railSouth);

    // Third Rail (750V DC Power Supply Rail with High-Vis Yellow Cover)
    const thirdRail = new THREE.Mesh(new THREE.BoxGeometry(span * 2, 0.65, 0.5), new THREE.MeshLambertMaterial({ color: 0xf59e0b }));
    thirdRail.position.set(0, deckY + 4.25, viaductZ + 5.5);
    this.scene.add(thirdRail);

    // Overhead Catenary System (Electrification Masts & Suspended Contact Wires)
    const mastMat = new THREE.MeshLambertMaterial({ color: 0x475569 });
    const armMat = new THREE.MeshLambertMaterial({ color: 0x64748b });
    const insulatorMat = new THREE.MeshLambertMaterial({ color: 0xf1f5f9 });
    const wireMat = new THREE.MeshLambertMaterial({ color: 0x94a3b8 });
    const mastPositions = [-500, -375, -250, -125, 0, 125, 250, 375, 500];

    for (const mx of mastPositions) {
      // Vertical Mast on south deck edge
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 23, 6), mastMat);
      mast.position.set(mx, deckY + 3.0 + 11.5, viaductZ + 10.3);
      this.scene.add(mast);

      // Horizontal Cantilever Arm reaching over the tracks
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 11), armMat);
      arm.position.set(mx, deckY + 25.5, viaductZ + 5.0);
      this.scene.add(arm);

      // Vertical Insulator Dropper
      const insulator = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 2.4, 6), insulatorMat);
      insulator.position.set(mx, deckY + 24.0, viaductZ);
      this.scene.add(insulator);
    }

    // Continuous Overhead Catenary Contact Wire (skims pantograph)
    const contactWire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, span * 2, 4).rotateZ(Math.PI / 2),
      wireMat
    );
    contactWire.position.set(0, deckY + 22.8, viaductZ);
    this.scene.add(contactWire);

    // Upper Messenger Suspension Cable
    const messengerWire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, span * 2, 4).rotateZ(Math.PI / 2),
      armMat
    );
    messengerWire.position.set(0, deckY + 25.5, viaductZ);
    this.scene.add(messengerWire);

    // High-Fidelity 3-Car Articulated Metro EMU Trainset
    this.metroTrain = this.buildMetroTrainset();
    this.metroTrain.position.set(this.metroX, deckY, viaductZ);
    this.scene.add(this.metroTrain);
  }

  // Constructs an articulated 3-car high-speed Metro EMU trainset:
  // Car 1 (Lead DMC): Aerodynamic bullet wedge nose, driver windscreen, headlights, amber LED route sign, forward track light
  // Car 2 (Mid Trailer): Passenger saloon, continuous windows, sliding doors with yellow trim, rooftop diamond pantograph
  // Car 3 (Trail DMC): Aerodynamic rear bullet nose, dual red marker taillights, driver windscreen, amber route sign
  // Inter-car Gangways: Articulated black rubber accordion bellows
  // Undercarriage: 6 two-axle bogies with 24 steel flanged train wheels, traction equipment & air reservoirs
  buildMetroTrainset() {
    const trainGroup = new THREE.Group();

    // 1. Shared Train Materials
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25, metalness: 0.15 });
    const stripeMat = new THREE.MeshLambertMaterial({ color: 0x0284c7 }); // Electric Cyan / Transit Blue
    const pinstripeMat = new THREE.MeshLambertMaterial({ color: 0x38bdf8 }); // Sky blue secondary accent
    const darkSkirtMat = new THREE.MeshLambertMaterial({ color: 0x1e293b }); // Slate 800 lower chassis
    const windowMat = new THREE.MeshLambertMaterial({ color: 0x0a1128, emissive: 0x1e3a8a, emissiveIntensity: 0.2 }); // Glossy tinted glass
    const doorMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3, metalness: 0.4 }); // Stainless steel
    const doorYellowMat = new THREE.MeshLambertMaterial({ color: 0xfacc15 }); // Safety yellow warning threshold
    const roofMat = new THREE.MeshLambertMaterial({ color: 0x94a3b8 }); // Slate 400 roof cap
    const hvacMat = new THREE.MeshLambertMaterial({ color: 0x64748b });
    const ventMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
    const bogieMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.85, roughness: 0.2 });
    const pantoArmMat = new THREE.MeshLambertMaterial({ color: 0xdc2626 }); // Vibrant signal red
    const carbonMat = new THREE.MeshLambertMaterial({ color: 0x0f172a }); // Dark carbon contact strip
    const ceramicMat = new THREE.MeshLambertMaterial({ color: 0xf1f5f9 }); // White ceramic insulator
    const headlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const taillightMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const destSignMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b }); // Amber LED matrix
    const bellowsMat = new THREE.MeshLambertMaterial({ color: 0x0f172a }); // Matte black accordion
    const ribMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });

    // Helper: Build a 2-axle undercarriage bogie with 4 flanged steel wheels
    const addBogie = (parent, bogieX) => {
      const bogie = new THREE.Group();
      bogie.position.set(bogieX, 0, 0);

      // Steel bolster frame
      const bolster = new THREE.Mesh(new THREE.BoxGeometry(8.6, 1.2, 9.4), bogieMat);
      bolster.position.set(0, 6.8, 0);
      bogie.add(bolster);

      // Side frames & suspension air springs
      for (const sz of [-4.5, 4.5]) {
        const sideFrame = new THREE.Mesh(new THREE.BoxGeometry(8.2, 1.4, 0.8), bogieMat);
        sideFrame.position.set(0, 6.6, sz);
        bogie.add(sideFrame);

        const spring = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.8, 8), darkSkirtMat);
        spring.position.set(0, 7.3, sz);
        bogie.add(spring);
      }

      // 2 Axles with flanged steel train wheels
      for (const ax of [-2.6, 2.6]) {
        const axle = new THREE.Mesh(
          new THREE.CylinderGeometry(0.3, 0.3, 8.2, 8).rotateX(Math.PI / 2),
          darkSkirtMat
        );
        axle.position.set(ax, 6.3, 0);
        bogie.add(axle);

        for (const wz of [-3.8, 3.8]) {
          // Wheel tread riding on rail
          const wheel = new THREE.Mesh(
            new THREE.CylinderGeometry(1.8, 1.8, 0.7, 12).rotateX(Math.PI / 2),
            wheelMat
          );
          wheel.position.set(ax, 6.3, wz);
          bogie.add(wheel);

          // Inner wheel safety flange
          const flangeZ = wz > 0 ? wz - 0.42 : wz + 0.42;
          const flange = new THREE.Mesh(
            new THREE.CylinderGeometry(2.1, 2.1, 0.16, 12).rotateX(Math.PI / 2),
            wheelMat
          );
          flange.position.set(ax, 6.3, flangeZ);
          bogie.add(flange);

          // Hubcap
          const hub = new THREE.Mesh(
            new THREE.CylinderGeometry(0.55, 0.55, 0.85, 8).rotateX(Math.PI / 2),
            bogieMat
          );
          hub.position.set(ax, 6.3, wz);
          bogie.add(hub);
        }
      }

      parent.add(bogie);
    };

    // Helper: Underfloor electrical equipment & air reservoir tanks
    const addUnderfloor = (parent, startX, endX) => {
      const midX = (startX + endX) / 2;
      const len = Math.abs(endX - startX);
      const eqBox = new THREE.Mesh(new THREE.BoxGeometry(len, 1.6, 6.0), darkSkirtMat);
      eqBox.position.set(midX, 5.6, 0);
      parent.add(eqBox);

      // Compressed air cylinders
      const tank1 = new THREE.Mesh(
        new THREE.CylinderGeometry(0.85, 0.85, len * 0.8, 8).rotateZ(Math.PI / 2),
        ventMat
      );
      tank1.position.set(midX, 5.6, 3.8);
      parent.add(tank1);
    };

    // Helper: Rooftop HVAC climate control module
    const addHvac = (parent, hvacX) => {
      const hvac = new THREE.Mesh(new THREE.BoxGeometry(6.4, 1.3, 6.0), hvacMat);
      hvac.position.set(hvacX, 18.25, 0);
      parent.add(hvac);

      // Fan grilles on top
      for (const fx of [-1.8, 1.8]) {
        const fan = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.2, 10), ventMat);
        fan.position.set(hvacX + fx, 18.95, 0);
        parent.add(fan);
      }
    };

    // Helper: Windows, Passenger Doors & Livery Stripes on coach saloon
    const addCoachFixtures = (parent, len, isTrailer) => {
      // Lower dark skirt
      const skirt = new THREE.Mesh(new THREE.BoxGeometry(len, 1.4, 10.9), darkSkirtMat);
      skirt.position.set(0, 7.7, 0);
      parent.add(skirt);

      // Speed stripe along body waistline
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(len, 1.1, 11.16), stripeMat);
      stripe.position.set(0, 9.4, 0);
      parent.add(stripe);

      // Secondary sky blue thin stripe
      const pinstripe = new THREE.Mesh(new THREE.BoxGeometry(len, 0.35, 11.16), pinstripeMat);
      pinstripe.position.set(0, 15.6, 0);
      parent.add(pinstripe);

      // Tinted window ribbon on both sides
      const winLen = len - 4;
      for (const wz of [-5.53, 5.53]) {
        const winBand = new THREE.Mesh(new THREE.BoxGeometry(winLen, 2.8, 0.18), windowMat);
        winBand.position.set(0, 12.8, wz);
        parent.add(winBand);

        // Window mullion vertical dividers
        const numPillars = Math.floor(winLen / 4.5);
        for (let i = 0; i <= numPillars; i++) {
          const px = -winLen / 2 + (winLen / numPillars) * i;
          const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.35, 2.8, 0.22), bodyMat);
          pillar.position.set(px, 12.8, wz);
          parent.add(pillar);
        }
      }

      // Passenger Sliding Doors (2 pairs per side)
      const doorOffsets = isTrailer ? [-9.0, 9.0] : [-5.0, 5.0];
      for (const dx of doorOffsets) {
        for (const dz of [-5.55, 5.55]) {
          // Stainless steel door leaves
          const door = new THREE.Mesh(new THREE.BoxGeometry(3.2, 6.2, 0.2), doorMat);
          door.position.set(dx, 11.1, dz);
          parent.add(door);

          // Center door rubber seam
          const seam = new THREE.Mesh(new THREE.BoxGeometry(0.12, 6.2, 0.24), darkSkirtMat);
          seam.position.set(dx, 11.1, dz);
          parent.add(seam);

          // Door window inserts
          for (const leafX of [-0.8, 0.8]) {
            const dw = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.4, 0.24), windowMat);
            dw.position.set(dx + leafX, 12.8, dz);
            parent.add(dw);
          }

          // High-visibility yellow threshold strip
          const threshold = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.25, 0.26), doorYellowMat);
          threshold.position.set(dx, 8.1, dz);
          parent.add(threshold);
        }
      }

      // Rooftop curved cap
      const roofCap = new THREE.Mesh(new THREE.BoxGeometry(len, 1.0, 10.4), roofMat);
      roofCap.position.set(0, 17.8, 0);
      parent.add(roofCap);
    };

    // Helper: Build Accordion Gangway Bellows between coaches
    const addGangway = (gx) => {
      const gangway = new THREE.Group();
      gangway.position.set(gx, 0, 0);

      // Black rubber bellows body
      const bellows = new THREE.Mesh(new THREE.BoxGeometry(9.6, 8.8, 9.4), bellowsMat);
      bellows.position.set(0, 12.6, 0);
      gangway.add(bellows);

      // Accordion convolutions / ribs
      for (const rx of [-3.2, 0, 3.2]) {
        const rib = new THREE.Mesh(new THREE.BoxGeometry(0.5, 9.2, 9.8), ribMat);
        rib.position.set(rx, 12.6, 0);
        gangway.add(rib);
      }

      // Footplate coupler link
      const footplate = new THREE.Mesh(new THREE.BoxGeometry(9.8, 0.4, 5.0), darkSkirtMat);
      footplate.position.set(0, 7.8, 0);
      gangway.add(footplate);

      trainGroup.add(gangway);
    };

    // ==========================================
    // CAR 1: LEAD DRIVING MOTOR CAR (+X Facing)
    // ==========================================
    const leadCar = new THREE.Group();
    leadCar.position.set(46, 0, 0);

    // Saloon main body (X from -17 to +10, length 27)
    const leadBody = new THREE.Mesh(new THREE.BoxGeometry(27, 9.6, 11.0), bodyMat);
    leadBody.position.set(-3.5, 12.6, 0);
    leadCar.add(leadBody);

    // Saloon fixtures
    const leadSaloonGroup = new THREE.Group();
    leadSaloonGroup.position.set(-3.5, 0, 0);
    addCoachFixtures(leadSaloonGroup, 27, false);
    leadCar.add(leadSaloonGroup);

    // Aerodynamic Streamlined Bullet Nosecone (Facing +X)
    // Tier 1: Cab lower skirt & deflector
    const cabBase = new THREE.Mesh(new THREE.BoxGeometry(6.0, 3.4, 10.6), bodyMat);
    cabBase.position.set(13.0, 9.5, 0);
    leadCar.add(cabBase);

    const cabSkirt = new THREE.Mesh(new THREE.BoxGeometry(6.0, 1.4, 10.6), darkSkirtMat);
    cabSkirt.position.set(13.0, 7.7, 0);
    leadCar.add(cabSkirt);

    const cabStripe = new THREE.Mesh(new THREE.BoxGeometry(6.0, 1.1, 10.7), stripeMat);
    cabStripe.position.set(13.0, 9.4, 0);
    leadCar.add(cabStripe);

    // Tier 2: Mid-wedge nose
    const noseMid = new THREE.Mesh(new THREE.BoxGeometry(5.0, 4.0, 9.0), bodyMat);
    noseMid.position.set(17.5, 9.6, 0);
    leadCar.add(noseMid);

    const noseMidStripe = new THREE.Mesh(new THREE.BoxGeometry(5.0, 1.1, 9.1), stripeMat);
    noseMidStripe.position.set(17.5, 9.4, 0);
    leadCar.add(noseMidStripe);

    // Tier 3: Extreme aerodynamic nose tip
    const noseTip = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.6, 7.0), bodyMat);
    noseTip.position.set(20.5, 9.2, 0);
    leadCar.add(noseTip);

    // Obstacle deflector plow / cowcatcher
    const plow = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.4, 8.4), darkSkirtMat);
    plow.position.set(19.0, 6.0, 0);
    leadCar.add(plow);

    // Sloped Driver Windshield (angled 30 degrees)
    const windshield = new THREE.Mesh(
      new THREE.BoxGeometry(4.8, 3.8, 8.6).rotateZ(-0.55),
      windowMat
    );
    windshield.position.set(14.8, 14.2, 0);
    leadCar.add(windshield);

    // Cab sloped roof cap
    const cabRoof = new THREE.Mesh(
      new THREE.BoxGeometry(5.5, 1.2, 9.2).rotateZ(-0.3),
      roofMat
    );
    cabRoof.position.set(13.5, 17.0, 0);
    leadCar.add(cabRoof);

    // Amber LED Destination Display ("METRO RAPID")
    const destSign = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.3, 5.2), destSignMat);
    destSign.position.set(17.0, 16.2, 0);
    leadCar.add(destSign);

    // Dual Projector Headlights
    for (const hlz of [-2.6, 2.6]) {
      const hlHousing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.85, 0.85, 0.4, 12).rotateZ(Math.PI / 2),
        darkSkirtMat
      );
      hlHousing.position.set(21.8, 9.6, hlz);
      leadCar.add(hlHousing);

      const hlLens = new THREE.Mesh(
        new THREE.CylinderGeometry(0.65, 0.65, 0.45, 12).rotateZ(Math.PI / 2),
        headlightMat
      );
      hlLens.position.set(21.95, 9.6, hlz);
      leadCar.add(hlLens);
    }

    // High-beam center marker
    const highBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.45, 0.4, 10).rotateZ(Math.PI / 2),
      headlightMat
    );
    highBeam.position.set(16.5, 17.4, 0);
    leadCar.add(highBeam);

    // Forward Track Illumination Light
    const trackLight = new THREE.PointLight(0xfff7ed, 1.2, 120);
    trackLight.position.set(23, 9.6, 0);
    leadCar.add(trackLight);

    // Undercarriage Bogies, Equipment & Roof HVAC
    addBogie(leadCar, -8);
    addBogie(leadCar, 8);
    addUnderfloor(leadCar, -4, 4);
    addHvac(leadCar, -6);
    addHvac(leadCar, 6);

    trainGroup.add(leadCar);

    // ==========================================
    // INTER-CAR GANGWAY 1 (Between Lead & Mid)
    // ==========================================
    addGangway(24);

    // ==========================================
    // CAR 2: MIDDLE TRAILER COACH (Pantograph)
    // ==========================================
    const midCar = new THREE.Group();
    midCar.position.set(0, 0, 0);

    const midBody = new THREE.Mesh(new THREE.BoxGeometry(38, 9.6, 11.0), bodyMat);
    midBody.position.set(0, 12.6, 0);
    midCar.add(midBody);

    addCoachFixtures(midCar, 38, true);
    addBogie(midCar, -11);
    addBogie(midCar, 11);
    addUnderfloor(midCar, -6, 6);
    addHvac(midCar, -11);
    addHvac(midCar, 11);

    // Rooftop Diamond / Z-Shaped Articulated Pantograph
    const pantoGroup = new THREE.Group();
    pantoGroup.position.set(0, 17.8, 0);

    // Base frame
    const pantoBase = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.35, 4.6), darkSkirtMat);
    pantoBase.position.set(0, 0.2, 0);
    pantoGroup.add(pantoBase);

    // 4 Corner Insulator Standoffs
    for (const px of [-2.0, 2.0]) {
      for (const pz of [-1.6, 1.6]) {
        const ins = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.8, 8), ceramicMat);
        ins.position.set(px, 0.45, pz);
        pantoGroup.add(ins);
      }
    }

    // Lower Pantograph Articulated Arm (angled back)
    const lowerArm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.2, 3.4, 6).rotateZ(0.55),
      pantoArmMat
    );
    lowerArm.position.set(-0.8, 2.0, 0);
    pantoGroup.add(lowerArm);

    // Upper Pantograph Articulated Arm (angled forward up to contact wire)
    const upperArm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.18, 3.6, 6).rotateZ(-0.6),
      pantoArmMat
    );
    upperArm.position.set(0.6, 3.8, 0);
    pantoGroup.add(upperArm);

    // Carbon Contact Collector Shoe Crosshead (touches wire at Y = 22.8)
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.3, 7.4), carbonMat);
    shoe.position.set(1.5, 5.0, 0);
    pantoGroup.add(shoe);

    // Safety curved horn ends
    for (const hz of [-3.7, 3.7]) {
      const horn = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.5, 0.8).rotateX(hz > 0 ? -0.4 : 0.4),
        pantoArmMat
      );
      horn.position.set(1.5, 4.8, hz);
      pantoGroup.add(horn);
    }

    midCar.add(pantoGroup);
    trainGroup.add(midCar);

    // ==========================================
    // INTER-CAR GANGWAY 2 (Between Mid & Trail)
    // ==========================================
    addGangway(-24);

    // ==========================================
    // CAR 3: TRAILING MOTOR CAR (-X Facing)
    // ==========================================
    const trailCar = new THREE.Group();
    trailCar.position.set(-46, 0, 0);

    // Saloon main body (X from -10 to +17, length 27)
    const trailBody = new THREE.Mesh(new THREE.BoxGeometry(27, 9.6, 11.0), bodyMat);
    trailBody.position.set(3.5, 12.6, 0);
    trailCar.add(trailBody);

    // Saloon fixtures
    const trailSaloonGroup = new THREE.Group();
    trailSaloonGroup.position.set(3.5, 0, 0);
    addCoachFixtures(trailSaloonGroup, 27, false);
    trailCar.add(trailSaloonGroup);

    // Aerodynamic Streamlined Rear Bullet Nosecone (Facing -X)
    // Tier 1: Rear skirt & lower base
    const rCabBase = new THREE.Mesh(new THREE.BoxGeometry(6.0, 3.4, 10.6), bodyMat);
    rCabBase.position.set(-13.0, 9.5, 0);
    trailCar.add(rCabBase);

    const rCabSkirt = new THREE.Mesh(new THREE.BoxGeometry(6.0, 1.4, 10.6), darkSkirtMat);
    rCabSkirt.position.set(-13.0, 7.7, 0);
    trailCar.add(rCabSkirt);

    const rCabStripe = new THREE.Mesh(new THREE.BoxGeometry(6.0, 1.1, 10.7), stripeMat);
    rCabStripe.position.set(-13.0, 9.4, 0);
    trailCar.add(rCabStripe);

    // Tier 2: Mid-wedge nose
    const rNoseMid = new THREE.Mesh(new THREE.BoxGeometry(5.0, 4.0, 9.0), bodyMat);
    rNoseMid.position.set(-17.5, 9.6, 0);
    trailCar.add(rNoseMid);

    const rNoseMidStripe = new THREE.Mesh(new THREE.BoxGeometry(5.0, 1.1, 9.1), stripeMat);
    rNoseMidStripe.position.set(-17.5, 9.4, 0);
    trailCar.add(rNoseMidStripe);

    // Tier 3: Extreme rear nose tip
    const rNoseTip = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.6, 7.0), bodyMat);
    rNoseTip.position.set(-20.5, 9.2, 0);
    trailCar.add(rNoseTip);

    // Rear deflector plow
    const rPlow = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.4, 8.4), darkSkirtMat);
    rPlow.position.set(-19.0, 6.0, 0);
    trailCar.add(rPlow);

    // Sloped Rear Windshield (angled 30 degrees)
    const rWindshield = new THREE.Mesh(
      new THREE.BoxGeometry(4.8, 3.8, 8.6).rotateZ(0.55),
      windowMat
    );
    rWindshield.position.set(-14.8, 14.2, 0);
    trailCar.add(rWindshield);

    // Rear sloped roof cap
    const rCabRoof = new THREE.Mesh(
      new THREE.BoxGeometry(5.5, 1.2, 9.2).rotateZ(0.3),
      roofMat
    );
    rCabRoof.position.set(-13.5, 17.0, 0);
    trailCar.add(rCabRoof);

    // Amber LED Destination Display ("METRO RAPID")
    const rDestSign = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.3, 5.2), destSignMat);
    rDestSign.position.set(-17.0, 16.2, 0);
    trailCar.add(rDestSign);

    // Dual Glowing Red LED Marker Taillights
    for (const tlz of [-2.6, 2.6]) {
      const tlHousing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.85, 0.85, 0.4, 12).rotateZ(Math.PI / 2),
        darkSkirtMat
      );
      tlHousing.position.set(-21.8, 9.6, tlz);
      trailCar.add(tlHousing);

      const tlLens = new THREE.Mesh(
        new THREE.CylinderGeometry(0.65, 0.65, 0.45, 12).rotateZ(Math.PI / 2),
        taillightMat
      );
      tlLens.position.set(-21.95, 9.6, tlz);
      trailCar.add(tlLens);
    }

    // High marker red light
    const highTail = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.45, 0.4, 10).rotateZ(Math.PI / 2),
      taillightMat
    );
    highTail.position.set(-16.5, 17.4, 0);
    trailCar.add(highTail);

    // Rear Red Track Marker Glow
    const tailLightGlow = new THREE.PointLight(0xef4444, 1.2, 80);
    tailLightGlow.position.set(-23, 9.6, 0);
    trailCar.add(tailLightGlow);

    // Undercarriage Bogies, Equipment & Roof HVAC
    addBogie(trailCar, -8);
    addBogie(trailCar, 8);
    addUnderfloor(trailCar, -4, 4);
    addHvac(trailCar, -6);
    addHvac(trailCar, 6);

    trainGroup.add(trailCar);

    return trainGroup;
  }

  // Helper: Adds 4 rubber wheels with optional hubcap centers
  addWheels(group, len, wid, radius, hubColor) {
    const wX = len * 0.28;
    const wZ = wid * 0.52;
    const offsets = [[wX, wZ], [wX, -wZ], [-wX, wZ], [-wX, -wZ]];
    for (const [ox, oz] of offsets) {
      const w = new THREE.Mesh(this.geoPool.wheel, this.matPool.wheel);
      w.position.set(ox, radius, oz);
      group.add(w);
      if (hubColor !== null && hubColor !== undefined) {
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 2.6, 8).rotateX(Math.PI / 2), new THREE.MeshLambertMaterial({ color: hubColor }));
        cap.position.set(ox, radius, oz);
        group.add(cap);
      }
    }
  }

  // Helper: Adds dual front LED headlights
  addHeadlights(group, x, y, z) {
    const hl1 = new THREE.Mesh(this.geoPool.headlight, this.matPool.headlight);
    hl1.position.set(x, y, z);
    const hl2 = new THREE.Mesh(this.geoPool.headlight, this.matPool.headlight);
    hl2.position.set(x, y, -z);
    group.add(hl1);
    group.add(hl2);
  }

  // Helper: Adds dual rear red LED taillights and tracks them for braking
  addTaillights(group, x, y, z) {
    const tl1 = new THREE.Mesh(this.geoPool.taillight, new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    tl1.position.set(x, y, z);
    const tl2 = new THREE.Mesh(this.geoPool.taillight, new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    tl2.position.set(x, y, -z);
    group.add(tl1);
    group.add(tl2);
    if (!group.userData.taillights) group.userData.taillights = [];
    group.userData.taillights.push(tl1, tl2);
  }

  // Builder 1: Public Transit City Bus (Long body, roof AC, destination signboard, dual rear axles)
  buildBus(group, v, colorHex) {
    const busColor = colorHex || 0x0284c7;
    const chassisMat = new THREE.MeshLambertMaterial({ color: busColor });

    // 1. Lower Chassis
    const chassis = new THREE.Mesh(this.geoPool.busChassis, chassisMat);
    chassis.position.y = 6.5;
    chassis.castShadow = true;
    group.add(chassis);

    // 2. Tinted Passenger Window Greenhouse
    const windowGeo = new THREE.BoxGeometry(52, 9, 16.2);
    const windowMesh = new THREE.Mesh(windowGeo, this.matPool.glass);
    windowMesh.position.set(-0.5, 14.5, 0);
    group.add(windowMesh);

    // 3. Side Window Pillars
    const pillarMat = new THREE.MeshLambertMaterial({ color: 0x0f172a });
    for (let i = -16; i <= 16; i += 8) {
      const p1 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 9.2, 0.4), pillarMat);
      p1.position.set(i, 14.5, 8.2);
      group.add(p1);
      const p2 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 9.2, 0.4), pillarMat);
      p2.position.set(i, 14.5, -8.2);
      group.add(p2);
    }

    // 4. White Fiberglass Roof
    const roofGeo = new THREE.BoxGeometry(53, 2, 16.6);
    const roofMat = new THREE.MeshLambertMaterial({ color: 0xf1f5f9 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, 19.5, 0);
    group.add(roof);

    // 5. Rooftop AC Unit & Vents
    const acGeo = new THREE.BoxGeometry(20, 3.5, 10);
    const acMat = new THREE.MeshLambertMaterial({ color: 0x94a3b8 });
    const ac = new THREE.Mesh(acGeo, acMat);
    ac.position.set(-4, 21.5, 0);
    group.add(ac);

    const ventGeo = new THREE.BoxGeometry(4.5, 1.2, 4.5);
    const v1 = new THREE.Mesh(ventGeo, acMat);
    v1.position.set(15, 20.8, 0);
    group.add(v1);
    const v2 = new THREE.Mesh(ventGeo, acMat);
    v2.position.set(-20, 20.8, 0);
    group.add(v2);

    // 6. Illuminated Amber Destination Signboard
    const signGeo = new THREE.BoxGeometry(1.5, 3.2, 12);
    const signMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(26.2, 16.5, 0);
    group.add(sign);

    // 7. Heavy Lower Front Bumper
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(2.5, 3.5, 17.2), this.matPool.housing);
    bumper.position.set(26.5, 3.5, 0);
    group.add(bumper);

    // 8. 6 Wheels (Dual Rear Axles)
    const wheelOffsets = [
      [17, 8.7], [17, -8.7],
      [-12, 8.7], [-12, -8.7],
      [-20, 8.7], [-20, -8.7]
    ];
    for (const [wx, wz] of wheelOffsets) {
      const w = new THREE.Mesh(this.geoPool.wheel, this.matPool.wheel);
      w.position.set(wx, 3.5, wz);
      group.add(w);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 2.6, 8).rotateX(Math.PI / 2), this.matPool.steel);
      cap.position.set(wx, 3.5, wz);
      group.add(cap);
    }

    // 9. Lighting
    this.addHeadlights(group, 27.2, 5.5, 6.0);
    this.addTaillights(group, -27.2, 6.5, 6.0);
  }

  // Builder 2: 108 Emergency ALS Ambulance (High cube van, 3D Red Cross, green/red chevrons, split strobe)
  buildAmbulance(group, v) {
    const whiteMat = new THREE.MeshLambertMaterial({ color: 0xffffff });

    // 1. Driver Cab
    const cabGeo = new THREE.BoxGeometry(14, 11, 15.6);
    const cab = new THREE.Mesh(cabGeo, whiteMat);
    cab.position.set(11, 7.5, 0);
    group.add(cab);

    const wsGeo = new THREE.BoxGeometry(6, 6, 14.8);
    const ws = new THREE.Mesh(wsGeo, this.matPool.glass);
    ws.position.set(13.5, 10.5, 0);
    ws.rotation.z = -0.3;
    group.add(ws);

    // 2. High-Roof Patient Box
    const boxGeo = new THREE.BoxGeometry(24, 15, 16.2);
    const box = new THREE.Mesh(boxGeo, whiteMat);
    box.position.set(-6, 9.5, 0);
    box.castShadow = true;
    group.add(box);

    // 3. Fluorescent Green & Red Emergency Chevrons
    const sGreenMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    const sRedMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const sG1 = new THREE.Mesh(new THREE.BoxGeometry(24, 1.2, 0.3), sGreenMat);
    sG1.position.set(-6, 3.8, 8.2);
    group.add(sG1);
    const sG2 = new THREE.Mesh(new THREE.BoxGeometry(24, 1.2, 0.3), sGreenMat);
    sG2.position.set(-6, 3.8, -8.2);
    group.add(sG2);
    const sR1 = new THREE.Mesh(new THREE.BoxGeometry(24, 1.2, 0.3), sRedMat);
    sR1.position.set(-6, 5.2, 8.2);
    group.add(sR1);
    const sR2 = new THREE.Mesh(new THREE.BoxGeometry(24, 1.2, 0.3), sRedMat);
    sR2.position.set(-6, 5.2, -8.2);
    group.add(sR2);

    // 4. 3D Red Medical Crosses
    const cL1 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 6.0, 0.3), sRedMat);
    cL1.position.set(-6, 11, 8.25);
    group.add(cL1);
    const cL2 = new THREE.Mesh(new THREE.BoxGeometry(6.0, 1.8, 0.3), sRedMat);
    cL2.position.set(-6, 11, 8.25);
    group.add(cL2);
    const cR1 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 6.0, 0.3), sRedMat);
    cR1.position.set(-6, 11, -8.25);
    group.add(cR1);
    const cR2 = new THREE.Mesh(new THREE.BoxGeometry(6.0, 1.8, 0.3), sRedMat);
    cR2.position.set(-6, 11, -8.25);
    group.add(cR2);
    const cRoof1 = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.3, 8.0), sRedMat);
    cRoof1.position.set(-6, 17.2, 0);
    group.add(cRoof1);
    const cRoof2 = new THREE.Mesh(new THREE.BoxGeometry(8.0, 0.3, 2.2), sRedMat);
    cRoof2.position.set(-6, 17.2, 0);
    group.add(cRoof2);

    // 5. Emergency Lightbar (Split Red & Blue)
    const barBase = new THREE.Mesh(new THREE.BoxGeometry(3.5, 1.0, 12.0), this.matPool.housing);
    barBase.position.set(10, 13.5, 0);
    group.add(barBase);

    const redPodMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const redPod = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.2, 5.2), redPodMat);
    redPod.position.set(10, 15.0, 3.0);
    group.add(redPod);

    const bluePodMat = new THREE.MeshBasicMaterial({ color: 0x0066ff });
    const bluePod = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.2, 5.2), bluePodMat);
    bluePod.position.set(10, 15.0, -3.0);
    group.add(bluePod);

    const rearBeaconL = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 2.0, 8), redPodMat);
    rearBeaconL.position.set(-17.5, 18.0, 7.5);
    group.add(rearBeaconL);
    const rearBeaconR = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 2.0, 8), bluePodMat);
    rearBeaconR.position.set(-17.5, 18.0, -7.5);
    group.add(rearBeaconR);

    const strobeLight = new THREE.PointLight(0xff0044, 2.5, 70, 2);
    strobeLight.position.set(10, 17, 0);
    group.add(strobeLight);

    group.userData.ambulanceRedPod = redPod;
    group.userData.ambulanceBluePod = bluePod;
    group.userData.rearBeaconL = rearBeaconL;
    group.userData.rearBeaconR = rearBeaconR;
    group.userData.strobeLight = strobeLight;

    // 6. Rear Windows & Details
    const rearWindow1 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4.0, 4.0), this.matPool.glass);
    rearWindow1.position.set(-18.15, 12.0, 3.0);
    group.add(rearWindow1);
    const rearWindow2 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4.0, 4.0), this.matPool.glass);
    rearWindow2.position.set(-18.15, 12.0, -3.0);
    group.add(rearWindow2);

    // 7. Wheels & Lights
    this.addWheels(group, 36, 16, 3.5, 0xffffff);
    this.addHeadlights(group, 18.2, 4.5, 5.5);
    this.addTaillights(group, -18.2, 4.5, 6.5);
  }

  // Builder 3: Police Interceptor / PCR Patrol Cruiser (Navy/white two-tone, push bumper, pursuit lightbar)
  buildPolice(group, v) {
    const navyMat = new THREE.MeshLambertMaterial({ color: 0x1e3a8a });
    const whiteMat = new THREE.MeshLambertMaterial({ color: 0xf8fafc });

    // 1. Pursuit Chassis
    const chassisGeo = new THREE.BoxGeometry(34, 6.5, 16);
    const chassis = new THREE.Mesh(chassisGeo, navyMat);
    chassis.position.y = 4.8;
    chassis.castShadow = true;
    group.add(chassis);

    // 2. White Patrol Doors
    const doorGeo = new THREE.BoxGeometry(14, 5.8, 0.3);
    const doorL = new THREE.Mesh(doorGeo, whiteMat);
    doorL.position.set(-1, 5.0, 8.1);
    group.add(doorL);
    const doorR = new THREE.Mesh(doorGeo, whiteMat);
    doorR.position.set(-1, 5.0, -8.1);
    group.add(doorR);

    // 3. Cabin & White Roof
    const cabinGeo = new THREE.BoxGeometry(18, 7.0, 14);
    const cabin = new THREE.Mesh(cabinGeo, this.matPool.glass);
    cabin.position.set(-2, 10.5, 0);
    group.add(cabin);

    const roofGeo = new THREE.BoxGeometry(18.2, 1.2, 14.2);
    const roof = new THREE.Mesh(roofGeo, whiteMat);
    roof.position.set(-2, 14.5, 0);
    group.add(roof);

    // 4. Black Steel Push Bumper (Bull Bar)
    const pushBarMat = new THREE.MeshLambertMaterial({ color: 0x0f172a });
    const pushCross = new THREE.Mesh(new THREE.BoxGeometry(2.0, 5.0, 11.0), pushBarMat);
    pushCross.position.set(18.0, 5.0, 0);
    group.add(pushCross);
    const pushUp1 = new THREE.Mesh(new THREE.BoxGeometry(2.2, 7.5, 1.5), pushBarMat);
    pushUp1.position.set(18.0, 6.0, 3.5);
    group.add(pushUp1);
    const pushUp2 = new THREE.Mesh(new THREE.BoxGeometry(2.2, 7.5, 1.5), pushBarMat);
    pushUp2.position.set(18.0, 6.0, -3.5);
    group.add(pushUp2);

    // 5. Police Modern Lightbar (Split Red & Blue)
    const pBarBase = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.8, 10.0), this.matPool.housing);
    pBarBase.position.set(-2, 15.4, 0);
    group.add(pBarBase);

    const pRedPodMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const pRedPod = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.8, 4.4), pRedPodMat);
    pRedPod.position.set(-2, 16.5, 2.5);
    group.add(pRedPod);

    const pBluePodMat = new THREE.MeshBasicMaterial({ color: 0x0066ff });
    const pBluePod = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.8, 4.4), pBluePodMat);
    pBluePod.position.set(-2, 16.5, -2.5);
    group.add(pBluePod);

    const strobeLight = new THREE.PointLight(0x0055ff, 2.5, 65, 2);
    strobeLight.position.set(-2, 17.5, 0);
    group.add(strobeLight);

    group.userData.policeRedPod = pRedPod;
    group.userData.policeBluePod = pBluePod;
    group.userData.strobeLight = strobeLight;

    // 6. Tactical Wheels & Lights
    this.addWheels(group, 34, 16, 3.5, 0x111827);
    this.addHeadlights(group, 17.2, 5.0, 5.5);
    this.addTaillights(group, -17.2, 5.0, 5.5);
  }

  // Builder 4: Fire & Rescue Tender (Scarlet truck, aluminum roof ladder, roll-up shutters, water gun)
  buildFireEngine(group, v) {
    const redMat = new THREE.MeshLambertMaterial({ color: 0xdc2626 });
    const silverMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3, metalness: 0.8 });

    // 1. Heavy Rescue Body
    const bodyGeo = new THREE.BoxGeometry(46, 13.5, 18);
    const body = new THREE.Mesh(bodyGeo, redMat);
    body.position.set(0, 8.5, 0);
    body.castShadow = true;
    group.add(body);

    const cabWs = new THREE.Mesh(new THREE.BoxGeometry(7, 5.5, 17.2), this.matPool.glass);
    cabWs.position.set(16, 12.0, 0);
    group.add(cabWs);

    const cabRoof = new THREE.Mesh(new THREE.BoxGeometry(14, 1.5, 18.2), new THREE.MeshLambertMaterial({ color: 0xf8fafc }));
    cabRoof.position.set(16, 15.5, 0);
    group.add(cabRoof);

    // 2. Rooftop Aluminum Rescue Ladder
    const railGeo = new THREE.BoxGeometry(32, 1.2, 0.6);
    const rail1 = new THREE.Mesh(railGeo, silverMat);
    rail1.position.set(-5, 17.5, 4.0);
    group.add(rail1);
    const rail2 = new THREE.Mesh(railGeo, silverMat);
    rail2.position.set(-5, 17.5, -4.0);
    group.add(rail2);

    const rungGeo = new THREE.CylinderGeometry(0.3, 0.3, 8.0, 6).rotateX(Math.PI / 2);
    for (let rx = -18; rx <= 8; rx += 3.7) {
      const rung = new THREE.Mesh(rungGeo, silverMat);
      rung.position.set(rx, 17.5, 0);
      group.add(rung);
    }

    // 3. Side Roll-Up Equipment Shutters
    const shutterMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.5, metalness: 0.6 });
    for (let sx = -14; sx <= 2; sx += 8) {
      const shL = new THREE.Mesh(new THREE.BoxGeometry(6.5, 7.5, 0.3), shutterMat);
      shL.position.set(sx, 7.5, 9.1);
      group.add(shL);
      const shR = new THREE.Mesh(new THREE.BoxGeometry(6.5, 7.5, 0.3), shutterMat);
      shR.position.set(sx, 7.5, -9.1);
      group.add(shR);
    }

    // 4. Rooftop Water Monitor Deck Gun
    const cannonBase = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 2.5, 8), silverMat);
    cannonBase.position.set(7, 16.5, 0);
    group.add(cannonBase);
    const cannonNozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.9, 5.0, 8).rotateZ(-Math.PI / 3), silverMat);
    cannonNozzle.position.set(8.5, 18.5, 0);
    group.add(cannonNozzle);

    // 5. Dual Revolving Roof Beacons
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff1100 });
    const b1 = new THREE.Mesh(new THREE.SphereGeometry(1.8, 10, 10), beaconMat);
    b1.position.set(20, 17.2, 6.0);
    group.add(b1);
    const b2 = new THREE.Mesh(new THREE.SphereGeometry(1.8, 10, 10), beaconMat);
    b2.position.set(20, 17.2, -6.0);
    group.add(b2);

    const strobeLight = new THREE.PointLight(0xff2200, 2.5, 70, 2);
    strobeLight.position.set(20, 18.5, 0);
    group.add(strobeLight);

    group.userData.fireBeacon1 = b1;
    group.userData.fireBeacon2 = b2;
    group.userData.strobeLight = strobeLight;

    // 6. 6 Heavy-Duty Wheels (Dual Rear Axle)
    const wheelOffsets = [
      [15, 9.2], [15, -9.2],
      [-9, 9.2], [-9, -9.2],
      [-17, 9.2], [-17, -9.2]
    ];
    for (const [wx, wz] of wheelOffsets) {
      const w = new THREE.Mesh(this.geoPool.wheel, this.matPool.wheel);
      w.position.set(wx, 3.5, wz);
      group.add(w);
      const redCap = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 2.6, 8).rotateX(Math.PI / 2), redMat);
      redCap.position.set(wx, 3.5, wz);
      group.add(redCap);
    }

    // 7. Lighting
    this.addHeadlights(group, 23.2, 5.5, 6.5);
    this.addTaillights(group, -23.2, 5.5, 7.0);
  }

  // Builder 5: Auto-Rickshaw (Indian 3-Wheeler: green lower body, curved yellow canopy, open cabin, single front wheel)
  buildAutoRickshaw(group, v) {
    const greenMat = new THREE.MeshLambertMaterial({ color: 0x15803d });
    const yellowMat = new THREE.MeshLambertMaterial({ color: 0xeab308 });
    const blackMat = new THREE.MeshLambertMaterial({ color: 0x0f172a });

    // 1. Lower Body & Apron
    const rearBoxGeo = new THREE.BoxGeometry(14, 5.5, 13);
    const rearBox = new THREE.Mesh(rearBoxGeo, greenMat);
    rearBox.position.set(-3, 4.0, 0);
    rearBox.castShadow = true;
    group.add(rearBox);

    const noseGeo = new THREE.BoxGeometry(8, 5.0, 8);
    const nose = new THREE.Mesh(noseGeo, greenMat);
    nose.position.set(7, 4.0, 0);
    group.add(nose);

    // 2. Open-Sided Cabin & Seats
    const floor = new THREE.Mesh(new THREE.BoxGeometry(18, 0.8, 12), blackMat);
    floor.position.set(1, 6.5, 0);
    group.add(floor);

    const bench = new THREE.Mesh(new THREE.BoxGeometry(5.5, 4.0, 11), blackMat);
    bench.position.set(-5, 8.5, 0);
    group.add(bench);

    const driverSeat = new THREE.Mesh(new THREE.BoxGeometry(3.5, 3.0, 4.5), blackMat);
    driverSeat.position.set(1.5, 8.0, 0);
    group.add(driverSeat);

    const handleBar = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 5.5, 8).rotateX(Math.PI / 2), this.matPool.steel);
    handleBar.position.set(6.5, 9.5, 0);
    group.add(handleBar);

    // 3. Upright Windshield
    const wsGeo = new THREE.BoxGeometry(0.6, 6.0, 9.0);
    const ws = new THREE.Mesh(wsGeo, this.matPool.glass);
    ws.position.set(8.5, 11.5, 0);
    group.add(ws);

    // 4. Curved Yellow Canvas Canopy Roof
    const canopyGeo = new THREE.BoxGeometry(19, 2.5, 12.8);
    const canopy = new THREE.Mesh(canopyGeo, yellowMat);
    canopy.position.set(0, 15.0, 0);
    group.add(canopy);

    const browGeo = new THREE.BoxGeometry(4.5, 1.8, 10.5);
    const brow = new THREE.Mesh(browGeo, yellowMat);
    brow.position.set(8.5, 14.5, 0);
    brow.rotation.z = -0.35;
    group.add(brow);

    const strutGeo = new THREE.CylinderGeometry(0.25, 0.25, 8.0, 6);
    const sOffsets = [[-8, 6.0], [-8, -6.0], [8, 4.5], [8, -4.5]];
    for (const [sx, sz] of sOffsets) {
      const st = new THREE.Mesh(strutGeo, blackMat);
      st.position.set(sx, 11.0, sz);
      group.add(st);
    }

    // 5. 3 Wheels (Single Centered Front Wheel + Dual Rear Wheels)
    const frontWheel = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.8, 2.0, 12).rotateX(Math.PI / 2), this.matPool.wheel);
    frontWheel.position.set(8.5, 2.8, 0);
    group.add(frontWheel);

    const fCap = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 2.2, 8).rotateX(Math.PI / 2), this.matPool.steel);
    fCap.position.set(8.5, 2.8, 0);
    group.add(fCap);

    const rearW1 = new THREE.Mesh(this.geoPool.wheel, this.matPool.wheel);
    rearW1.position.set(-6.5, 3.5, 6.8);
    group.add(rearW1);
    const rCap1 = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 2.6, 8).rotateX(Math.PI / 2), this.matPool.steel);
    rCap1.position.set(-6.5, 3.5, 6.8);
    group.add(rCap1);

    const rearW2 = new THREE.Mesh(this.geoPool.wheel, this.matPool.wheel);
    rearW2.position.set(-6.5, 3.5, -6.8);
    group.add(rearW2);
    const rCap2 = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 2.6, 8).rotateX(Math.PI / 2), this.matPool.steel);
    rCap2.position.set(-6.5, 3.5, -6.8);
    group.add(rCap2);

    // 6. Round Front Headlight & Rear Taillights
    const hl = new THREE.Mesh(new THREE.SphereGeometry(1.6, 12, 12), this.matPool.headlight);
    hl.position.set(11.2, 6.5, 0);
    group.add(hl);
    this.addTaillights(group, -10.2, 4.5, 4.5);
  }

  // Builder 6: Passenger Sedan / Car (Aerodynamic 3-box profile, mirrors, alloy wheels)
  buildCar(group, v, colorHex) {
    const bodyColor = colorHex || 0x38bdf8;
    const bodyMat = new THREE.MeshLambertMaterial({ color: bodyColor });

    // 1. Lower Streamlined Chassis
    const chassisGeo = new THREE.BoxGeometry(32, 5.5, 15);
    const chassis = new THREE.Mesh(chassisGeo, bodyMat);
    chassis.position.y = 4.2;
    chassis.castShadow = true;
    group.add(chassis);

    // 2. Cabin Greenhouse
    const cabinGeo = new THREE.BoxGeometry(17, 6.5, 13);
    const cabin = new THREE.Mesh(cabinGeo, this.matPool.glass);
    cabin.position.set(-1.5, 9.2, 0);
    group.add(cabin);

    const roofGeo = new THREE.BoxGeometry(16.5, 0.8, 13.2);
    const roof = new THREE.Mesh(roofGeo, bodyMat);
    roof.position.set(-1.5, 12.6, 0);
    group.add(roof);

    // 3. Side Mirrors
    const mirrorGeo = new THREE.BoxGeometry(1.0, 0.8, 1.6);
    const m1 = new THREE.Mesh(mirrorGeo, bodyMat);
    m1.position.set(4.5, 7.5, 7.2);
    group.add(m1);
    const m2 = new THREE.Mesh(mirrorGeo, bodyMat);
    m2.position.set(4.5, 7.5, -7.2);
    group.add(m2);

    // 4. Wheels & Lights
    this.addWheels(group, 32, 15, 3.5, 0x94a3b8);
    this.addHeadlights(group, 16.2, 4.5, 5.2);
    this.addTaillights(group, -16.2, 4.5, 5.2);
  }

  // Builder 7: SUV (Taller muscular stance, roof rails, rear tailgate spare tire)
  buildSUV(group, v, colorHex) {
    const bodyColor = colorHex || 0x059669;
    const bodyMat = new THREE.MeshLambertMaterial({ color: bodyColor });

    // 1. Muscular Tall Chassis
    const chassisGeo = new THREE.BoxGeometry(34, 7.5, 16);
    const chassis = new THREE.Mesh(chassisGeo, bodyMat);
    chassis.position.y = 5.2;
    chassis.castShadow = true;
    group.add(chassis);

    // 2. Cabin & Roof
    const cabinGeo = new THREE.BoxGeometry(20, 7.5, 14.2);
    const cabin = new THREE.Mesh(cabinGeo, this.matPool.glass);
    cabin.position.set(-2, 11.5, 0);
    group.add(cabin);

    const roofGeo = new THREE.BoxGeometry(20.2, 1.0, 14.4);
    const roof = new THREE.Mesh(roofGeo, bodyMat);
    roof.position.set(-2, 15.3, 0);
    group.add(roof);

    // 3. Roof Rack Rails
    const railGeo = new THREE.BoxGeometry(16, 0.8, 0.5);
    const rMat = new THREE.MeshLambertMaterial({ color: 0x0f172a });
    const r1 = new THREE.Mesh(railGeo, rMat);
    r1.position.set(-2, 16.0, 5.8);
    group.add(r1);
    const r2 = new THREE.Mesh(railGeo, rMat);
    r2.position.set(-2, 16.0, -5.8);
    group.add(r2);

    // 4. Rear Spare Tire
    const spare = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, 2.2, 10).rotateZ(Math.PI / 2), this.matPool.wheel);
    spare.position.set(-18.0, 7.5, 0);
    group.add(spare);

    // 5. Wheels & Lights
    this.addWheels(group, 34, 16, 3.8, 0x1f2937);
    this.addHeadlights(group, 17.2, 5.5, 5.8);
    this.addTaillights(group, -17.2, 5.5, 5.8);
  }

  // Builder 8: Commercial Delivery Truck (Forward-control cab, cargo container box, hazard bar)
  buildTruck(group, v, colorHex) {
    const cabColor = colorHex || 0xe11d48;
    const cabMat = new THREE.MeshLambertMaterial({ color: cabColor });
    const boxMat = new THREE.MeshLambertMaterial({ color: 0xf1f5f9 });

    // 1. Cab
    const cabGeo = new THREE.BoxGeometry(12, 13.5, 16.5);
    const cab = new THREE.Mesh(cabGeo, cabMat);
    cab.position.set(15, 8.5, 0);
    cab.castShadow = true;
    group.add(cab);

    const ws = new THREE.Mesh(new THREE.BoxGeometry(4, 5.5, 15.8), this.matPool.glass);
    ws.position.set(18.5, 11.5, 0);
    group.add(ws);

    // 2. Corrugated Cargo Box
    const boxGeo = new THREE.BoxGeometry(32, 17, 17);
    const cargoBox = new THREE.Mesh(boxGeo, boxMat);
    cargoBox.position.set(-6, 11.5, 0);
    cargoBox.castShadow = true;
    group.add(cargoBox);

    const hazMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const haz = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.8, 16.5), hazMat);
    haz.position.set(-22.3, 3.5, 0);
    group.add(haz);

    // 3. 6 Wheels
    const wheelOffsets = [
      [14, 8.8], [14, -8.8],
      [-8, 8.8], [-8, -8.8],
      [-16, 8.8], [-16, -8.8]
    ];
    for (const [wx, wz] of wheelOffsets) {
      const w = new THREE.Mesh(this.geoPool.wheel, this.matPool.wheel);
      w.position.set(wx, 3.5, wz);
      group.add(w);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 2.6, 8).rotateX(Math.PI / 2), this.matPool.steel);
      cap.position.set(wx, 3.5, wz);
      group.add(cap);
    }

    // 4. Lights
    this.addHeadlights(group, 21.2, 4.5, 6.2);
    this.addTaillights(group, -22.2, 4.5, 6.5);
  }

  // High-Performance Procedural Vehicle Mesh Factory (Dispatches to distinct 3D vehicles)
  createVehicleMesh(v) {
    const group = new THREE.Group();
    const type = (v.type || '').toUpperCase();
    const emergencyType = (v.emergencyType || '').toUpperCase();
    const isEmergency = Boolean(v.isEmergency || emergencyType || type === 'AMBULANCE' || type === 'POLICE' || type === 'FIRE_ENGINE');
    const colorHex = v.color ? parseInt(v.color.replace('#', '0x')) : null;

    if (type === 'BUS') {
      this.buildBus(group, v, colorHex);
    } else if (type === 'AMBULANCE' || emergencyType === 'AMBULANCE' || (isEmergency && !type.includes('POLICE') && !type.includes('FIRE'))) {
      this.buildAmbulance(group, v);
    } else if (type === 'POLICE' || emergencyType === 'POLICE') {
      this.buildPolice(group, v);
    } else if (type === 'FIRE_ENGINE' || emergencyType === 'FIRE_ENGINE') {
      this.buildFireEngine(group, v);
    } else if (type === 'AUTO_RICKSHAW' || type === 'AUTO') {
      this.buildAutoRickshaw(group, v);
    } else if (type === 'SUV') {
      this.buildSUV(group, v, colorHex);
    } else if (type === 'TRUCK') {
      this.buildTruck(group, v, colorHex);
    } else {
      this.buildCar(group, v, colorHex);
    }

    group.userData.vehicleId = v.id;
    group.userData.type = type;
    group.userData.currentX = v.x;
    group.userData.currentZ = v.y;
    group.userData.targetX = v.x;
    group.userData.targetZ = v.y;
    group.userData.speed = v.speed || 0;
    group.userData.angle = v.angle || 0;

    return group;
  }

  // Update loop called every animation frame with live backend state
  update(sim) {
    if (!sim) return;

    const dt = Math.min(this.clock.getDelta(), 0.05); // Frame delta time (seconds)

    // 1. Camera Orbit Mode Updates
    if (this.cameraMode === '3D_ORBIT' || this.isOrbiting) {
      const r = 660;
      this.strobeAngle += 0.0035;
      this.camera.position.x = Math.sin(this.strobeAngle) * r;
      this.camera.position.z = Math.cos(this.strobeAngle) * r;
      this.camera.position.y = 440;
      this.camera.lookAt(0, 0, 0);
    } else {
      this.controls.update();
    }

    // 2. Metro Train Motion
    if (this.metroTrain) {
      if (!window.__freezeMetro) {
        this.metroX += 1.8;
        if (this.metroX > 750) this.metroX = -750;
      }
      this.metroTrain.position.x = this.metroX;
    }

    // 3. Vehicles Sync & Buttery-Smooth Dead-Reckoning Extrapolation
    const liveVehicles = sim.vehicles || [];
    const activeIds = new Set();

    for (const v of liveVehicles) {
      if (v.hasExited) continue;
      activeIds.add(v.id);

      let mesh = this.vehicleMeshes.get(v.id);
      if (!mesh) {
        mesh = this.createVehicleMesh(v);
        this.scene.add(mesh);
        this.vehicleMeshes.set(v.id, mesh);
        mesh.position.set(v.x, 0, v.y);
        mesh.userData.currentX = v.x;
        mesh.userData.currentZ = v.y;
      }

      // Record latest server telemetry targets
      mesh.userData.targetX = v.x;
      mesh.userData.targetZ = v.y;
      mesh.userData.speed = v.speed || 0;
      mesh.userData.angle = v.angle || 0;

      // Dynamic Strobe & Beacon Flash for Emergency Vehicles
      if (mesh.userData.ambulanceRedPod && mesh.userData.ambulanceBluePod) {
        const t = Date.now() * 0.02;
        const isRed = Math.sin(t) > 0;
        mesh.userData.ambulanceRedPod.material.color.setHex(isRed ? 0xff0022 : 0x220005);
        mesh.userData.ambulanceBluePod.material.color.setHex(isRed ? 0x001133 : 0x0077ff);
        if (mesh.userData.rearBeaconL) mesh.userData.rearBeaconL.material.color.setHex(isRed ? 0xff0022 : 0x220005);
        if (mesh.userData.rearBeaconR) mesh.userData.rearBeaconR.material.color.setHex(isRed ? 0x001133 : 0x0077ff);
        if (mesh.userData.strobeLight) {
          mesh.userData.strobeLight.color.setHex(isRed ? 0xff0033 : 0x0066ff);
          mesh.userData.strobeLight.intensity = Math.abs(Math.sin(t * 2)) * 3.0;
        }
      }

      if (mesh.userData.policeRedPod && mesh.userData.policeBluePod) {
        const t = Date.now() * 0.028;
        const isRed = Math.sin(t) > 0;
        mesh.userData.policeRedPod.material.color.setHex(isRed ? 0xff0022 : 0x220005);
        mesh.userData.policeBluePod.material.color.setHex(isRed ? 0x001133 : 0x0077ff);
        if (mesh.userData.strobeLight) {
          mesh.userData.strobeLight.color.setHex(isRed ? 0xff0033 : 0x0066ff);
          mesh.userData.strobeLight.intensity = Math.abs(Math.sin(t * 2)) * 3.0;
        }
      }

      if (mesh.userData.fireBeacon1 && mesh.userData.fireBeacon2) {
        const t = Date.now() * 0.015;
        const flash1 = Math.sin(t) > 0;
        mesh.userData.fireBeacon1.material.color.setHex(flash1 ? 0xff1100 : 0x330500);
        mesh.userData.fireBeacon2.material.color.setHex(!flash1 ? 0xffaa00 : 0x331500);
        if (mesh.userData.strobeLight) {
          mesh.userData.strobeLight.intensity = flash1 ? 2.5 : 1.0;
        }
      }

      // Dynamic Brake Lights (Turns bright red when stopping/stopped)
      if (mesh.userData.taillights) {
        const isBraking = (mesh.userData.speed < 4) || Boolean(v.brakeLightsOn);
        const tColor = isBraking ? 0xff1111 : 0x550000;
        for (const tl of mesh.userData.taillights) {
          tl.material.color.setHex(tColor);
        }
      }
    }

    // Continuous 60 FPS forward kinematic integration for ALL vehicles
    for (const [id, mesh] of this.vehicleMeshes.entries()) {
      if (!activeIds.has(id)) {
        this.scene.remove(mesh);
        this.vehicleMeshes.delete(id);
        continue;
      }

      const speed = mesh.userData.speed || 0;
      const angle = mesh.userData.angle || 0;

      if (speed > 1) {
        // Extrapolate forward along heading vector at current velocity
        const vx = Math.cos(angle) * speed;
        const vz = Math.sin(angle) * speed;
        mesh.position.x += vx * dt;
        mesh.position.z += vz * dt;

        // Smooth error correction toward latest server packet
        const errX = mesh.userData.targetX - mesh.position.x;
        const errZ = mesh.userData.targetZ - mesh.position.z;
        mesh.position.x += errX * Math.min(1.0, 7.5 * dt);
        mesh.position.z += errZ * Math.min(1.0, 7.5 * dt);
      } else {
        // Vehicle is stopping / stopped at red light: smoothly settle to stop line
        mesh.position.x += (mesh.userData.targetX - mesh.position.x) * Math.min(1.0, 10.0 * dt);
        mesh.position.z += (mesh.userData.targetZ - mesh.position.z) * Math.min(1.0, 10.0 * dt);
      }

      // Smooth heading rotation interpolation
      let targetRot = -angle;
      let diff = targetRot - mesh.rotation.y;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      mesh.rotation.y += diff * Math.min(1.0, 14.0 * dt);
    }

    // 4. Traffic Signal Heads & Optics Sync (Real-Time LEDs, Stop Lines & Overhead Gantries)
    const roads = sim.roads || {};
    const roadIds = ['A', 'B', 'C', 'D'];

    for (const rId of roadIds) {
      const roadData = roads[rId];
      const state = (roadData && roadData.signalState) || 'RED';
      const remaining = Math.ceil((roadData && roadData.remainingInPhase) || 0);

      const isRed = (state === 'RED' || state === 'ALL_RED' || state === 'SCRAMBLE');
      const isYellow = (state === 'YELLOW' || state === 'FLASHING_YELLOW');
      const isGreen = (state === 'GREEN');

      const redColor = isRed ? 0xff2222 : 0x1e2433;
      const yellowColor = isYellow ? 0xffbb00 : 0x1e2433;
      const greenColor = isGreen ? 0x00ff88 : 0x162420;
      const activeColor = isGreen ? 0x00ff88 : (isYellow ? 0xffbb00 : 0xff2222);

      // Update Roadside Signal Posts
      const post = this.signalPosts[rId];
      if (post && post.head) {
        post.head.redMat.color.setHex(redColor);
        post.head.yellowMat.color.setHex(yellowColor);
        post.head.greenMat.color.setHex(greenColor);

        // Ground Stop-Line Light Bar (Illuminates Red/Yellow/Green on asphalt)
        post.stopLine.material.color.setHex(activeColor);

        // Billboard Countdown Sprite
        const badgeText = `${state.substring(0, 3)} ${remaining}s`;
        if (post.lastRenderedText !== badgeText) {
          post.lastRenderedText = badgeText;
          const ctx = post.ctx;
          ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
          ctx.fillRect(0, 0, 128, 64);
          ctx.lineWidth = 4;
          ctx.strokeStyle = isGreen ? '#10b981' : (isYellow ? '#f59e0b' : '#ef4444');
          ctx.strokeRect(2, 2, 124, 60);

          ctx.fillStyle = isGreen ? '#34d399' : (isYellow ? '#fbbf24' : '#f87171');
          ctx.font = 'bold 30px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(badgeText, 64, 32);
          post.texture.needsUpdate = true;
        }
      }

      // Update Overhead Cantilever Gantries
      const gantry = this.gantryLenses[rId];
      if (gantry) {
        if (gantry.heads) {
          for (const h of gantry.heads) {
            h.redMat.color.setHex(redColor);
            h.yellowMat.color.setHex(yellowColor);
            h.greenMat.color.setHex(greenColor);
          }
        }
        if (gantry.light) {
          gantry.light.color.setHex(activeColor);
          gantry.light.intensity = isGreen ? 2.2 : (isYellow ? 1.6 : 1.8);
        }
      }
    }

    // 5. Corner Pole Sirens (Poles A–D)
    const sirens = sim.directionalSirens || {};
    for (const [poleId, poleObj] of Object.entries(this.sirenPoles)) {
      const sirenData = sirens[poleId];
      const isActive = Boolean(sirenData && sirenData.active);

      if (isActive) {
        const flash = Math.sin(Date.now() * 0.015) > 0;
        poleObj.beacon.material.color.setHex(flash ? 0xef4444 : 0x1e293b);
      } else {
        poleObj.beacon.material.color.setHex(0x475569);
      }
    }

    // 6. Crosswalk Scramble Color
    const isScramble = Boolean(sim.scrambleActive || (sim.pedestrians && sim.pedestrians.isScrambleActive));
    if (this.crosswalkGroup) {
      this.crosswalkGroup.children.forEach(stripe => {
        stripe.material.color.setHex(isScramble ? 0x22c55e : 0xf8fafc);
      });
    }

    // 7. Render 3D Scene
    this.renderer.render(this.scene, this.camera);
  }

  // Camera Presets
  setCameraMode(mode) {
    this.cameraMode = mode;
    this.isOrbiting = false;

    if (mode === '3D_PERSPECTIVE') {
      this.animateCameraTo(0, 460, 500, 0, 0, 0);
    } else if (mode === '3D_ORBIT') {
      this.isOrbiting = true;
    } else if (mode === '3D_STREET') {
      this.animateCameraTo(-140, 28, 140, 0, 15, 0);
    } else if (mode === '2D_PLAN') {
      this.animateCameraTo(0, 750, 0.1, 0, 0, 0);
    }
  }

  animateCameraTo(x, y, z, tx, ty, tz) {
    this.camera.position.set(x, y, z);
    this.controls.target.set(tx, ty, tz);
    this.controls.update();
  }

  toggleOrbit() {
    this.isOrbiting = !this.isOrbiting;
    this.cameraMode = this.isOrbiting ? '3D_ORBIT' : '3D_PERSPECTIVE';
    return this.isOrbiting;
  }

  onWindowResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width === 0 || height === 0) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  onMouseMove(e) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes = Array.from(this.vehicleMeshes.values());
    const intersects = this.raycaster.intersectObjects(meshes, true);

    if (intersects.length > 0) {
      let root = intersects[0].object;
      while (root.parent && !root.userData.vehicleId) {
        root = root.parent;
      }
      this.hoveredVehicleId = root.userData.vehicleId;
      this.renderer.domElement.style.cursor = 'pointer';
    } else {
      this.hoveredVehicleId = null;
      this.renderer.domElement.style.cursor = 'default';
    }
  }

  onClick(e) {
    if (this.hoveredVehicleId && this.parent && this.parent.onVehicleSelect) {
      const v = this.parent.cachedVehicles.find(item => item.id === this.hoveredVehicleId);
      if (v) this.parent.onVehicleSelect(v);
    }
  }
}
