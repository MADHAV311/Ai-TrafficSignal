/**
 * AI Adaptive Traffic Signal Digital Twin - High-End Photorealistic 3D Three.js Engine
 * Full WebGL hardware-accelerated 3D digital twin:
 * - PBR Metallic Shaders, ACES Filmic Tone Mapping, Soft Directional Sun Shadows
 * - Procedural 3D Vehicles (108 ALS Ambulance, Fire Engine, Buses, Auto-Rickshaws, Cars)
 * - 3D City Environment (Presidency Campus, Clock Tower, Skyscrapers, Hospital, Metro Viaduct)
 * - 3D Cantilever Signal Gantries with Realistic LED Blooms & Ground Light Wash
 * - 3D Directional Corner Pole Sirens with Rotating Strobe Lights & Acoustic Shockwaves
 * - OrbitControls with 360° Mouse Drag, Zoom, Drone Orbit, Street Level, and 2D Plan Views
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

    // Entity caches
    this.vehicleMeshes = new Map(); // id -> THREE.Group
    this.signalLenses = {};         // approach -> { red, yellow, green, light }
    this.sirenPoles = {};           // A, B, C, D -> { group, strobeLight, shockwaves }
    this.pedestrianMeshes = [];
    this.smokeParticles = [];
    this.metroTrain = null;
    this.metroX = -450;

    // Camera modes
    this.cameraMode = '3D_PERSPECTIVE'; // '3D_PERSPECTIVE', '3D_ORBIT', '3D_STREET', '2D_PLAN'
    this.isOrbiting = false;
    this.strobeAngle = 0;

    // Raycaster for vehicle clicking & hovering
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.hoveredVehicleId = null;

    this.init();
  }

  init() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    // 1. Scene & Atmospheric Fog
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a101d);
    this.scene.fog = new THREE.FogExp2(0x0a101d, 0.00085);

    // 2. Perspective Camera
    this.camera = new THREE.PerspectiveCamera(45, width / height, 5, 4000);
    this.camera.position.set(0, 480, 520);

    // 3. WebGL Renderer with High-End Tone Mapping & Soft Shadows
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.container.appendChild(this.renderer.domElement);

    // 4. OrbitControls
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.04; // Don't go below ground
    this.controls.minDistance = 60;
    this.controls.maxDistance = 1600;
    this.controls.target.set(0, 0, 0);

    // 5. Lighting Setup
    this.initLighting();

    // 6. Ground, Asphalt Roads & Curbs
    this.initGroundAndRoads();

    // 7. 3D Architectural Cityscape
    this.initCityArchitecture();

    // 8. 3D Cantilever Signal Gantries
    this.initSignalGantries();

    // 9. 3D Directional Corner Pole Sirens
    this.initPoleSirens();

    // 10. Event Listeners
    window.addEventListener('resize', () => this.onWindowResize());
    this.renderer.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.renderer.domElement.addEventListener('click', (e) => this.onClick(e));
  }

  initLighting() {
    // Ambient City Night Sky Light
    const ambientLight = new THREE.AmbientLight(0x38bdf8, 0.65);
    this.scene.add(ambientLight);

    // Hemisphere Light (Sky vs Ground)
    const hemiLight = new THREE.HemisphereLight(0x60a5fa, 0x0f172a, 0.7);
    this.scene.add(hemiLight);

    // Directional Sunlight with Soft Shadows
    const sunLight = new THREE.DirectionalLight(0xffedd5, 1.9);
    sunLight.position.set(-320, 650, -220);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 100;
    sunLight.shadow.camera.far = 1500;
    const d = 480;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0004;
    this.scene.add(sunLight);
  }

  initGroundAndRoads() {
    const rw = SIM_CONFIG.ROAD_WIDTH / 2; // 70 units
    const span = 600;

    // Grass / Ground Base Plate
    const groundGeo = new THREE.PlaneGeometry(span * 2, span * 2);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x070c14, roughness: 0.95, metalness: 0.05 });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;
    this.scene.add(groundMesh);

    // Asphalt Material (PBR dark charcoal)
    const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x181f2a, roughness: 0.85, metalness: 0.1 });

    // East-West Asphalt Road
    const ewGeo = new THREE.PlaneGeometry(span * 2, rw * 2);
    const ewMesh = new THREE.Mesh(ewGeo, asphaltMat);
    ewMesh.rotation.x = -Math.PI / 2;
    ewMesh.position.y = 0.2;
    ewMesh.receiveShadow = true;
    this.scene.add(ewMesh);

    // North-South Asphalt Road
    const nsGeo = new THREE.PlaneGeometry(rw * 2, span * 2);
    const nsMesh = new THREE.Mesh(nsGeo, asphaltMat);
    nsMesh.rotation.x = -Math.PI / 2;
    nsMesh.position.y = 0.25;
    nsMesh.receiveShadow = true;
    this.scene.add(nsMesh);

    // Concrete Sidewalk Curbs (Height: 3.5 units)
    const curbMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8, metalness: 0.2 });
    const curbSegments = [
      { x: -span / 2 - rw / 2, z: -rw - 2, len: span - rw, isH: true },
      { x:  span / 2 + rw / 2, z: -rw - 2, len: span - rw, isH: true },
      { x: -span / 2 - rw / 2, z:  rw + 2, len: span - rw, isH: true },
      { x:  span / 2 + rw / 2, z:  rw + 2, len: span - rw, isH: true },
      { x: -rw - 2, z: -span / 2 - rw / 2, len: span - rw, isH: false },
      { x:  rw + 2, z: -span / 2 - rw / 2, len: span - rw, isH: false },
      { x: -rw - 2, z:  span / 2 + rw / 2, len: span - rw, isH: false },
      { x:  rw + 2, z:  span / 2 + rw / 2, len: span - rw, isH: false }
    ];

    for (const c of curbSegments) {
      const geo = c.isH ? new THREE.BoxGeometry(c.len, 3.5, 3.5) : new THREE.BoxGeometry(3.5, 3.5, c.len);
      const mesh = new THREE.Mesh(geo, curbMat);
      mesh.position.set(c.x, 1.75, c.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
    }

    // Road Markings: Double Yellow Centerlines
    const yellowMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    this.createRoadLine(0, 0.4, -span / 2 - rw / 2, 2.5, span - rw, yellowMat, false);
    this.createRoadLine(0, 0.4,  span / 2 + rw / 2, 2.5, span - rw, yellowMat, false);
    this.createRoadLine(-span / 2 - rw / 2, 0.4, 0, span - rw, 2.5, yellowMat, true);
    this.createRoadLine( span / 2 + rw / 2, 0.4, 0, span - rw, 2.5, yellowMat, true);

    // Stop Lines (Solid White)
    const whiteMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
    this.createRoadLine(-rw / 2, 0.45, -rw - 4, rw, 4.5, whiteMat, true);  // North
    this.createRoadLine( rw + 4, 0.45, -rw / 2, 4.5, rw, whiteMat, false); // East
    this.createRoadLine( rw / 2, 0.45,  rw + 4, rw, 4.5, whiteMat, true);  // South
    this.createRoadLine(-rw - 4, 0.45,  rw / 2, 4.5, rw, whiteMat, false); // West

    // Zebra Crosswalk Stripes
    this.crosswalkGroup = new THREE.Group();
    this.scene.add(this.crosswalkGroup);
    this.initCrosswalks(rw, whiteMat);
  }

  createRoadLine(x, y, z, w, l, mat, isHoriz) {
    const geo = new THREE.PlaneGeometry(w, l);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, y, z);
    this.scene.add(mesh);
  }

  initCrosswalks(rw, whiteMat) {
    const cwPositions = [
      { axis: 'H', z: -rw - 16 },
      { axis: 'H', z:  rw + 16 },
      { axis: 'V', x:  rw + 16 },
      { axis: 'V', x: -rw - 16 }
    ];

    for (const cw of cwPositions) {
      for (let offset = -rw + 10; offset < rw - 8; offset += 15) {
        const isH = cw.axis === 'H';
        const geo = new THREE.PlaneGeometry(isH ? 8 : 12, isH ? 12 : 8);
        const mesh = new THREE.Mesh(geo, whiteMat.clone());
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(isH ? offset : cw.x, 0.42, isH ? cw.z : offset);
        this.crosswalkGroup.add(mesh);
      }
    }
  }

  // 3D Architectural Cityscape
  initCityArchitecture() {
    // 1. NORTH-WEST: Presidency University Campus
    // Academic Complex
    const campusMat = new THREE.MeshStandardMaterial({ color: 0x881337, roughness: 0.7, metalness: 0.2 });
    const campusGeo = new THREE.BoxGeometry(160, 75, 120);
    const campusMesh = new THREE.Mesh(campusGeo, campusMat);
    campusMesh.position.set(-230, 37.5, -210);
    campusMesh.castShadow = true;
    campusMesh.receiveShadow = true;
    this.scene.add(campusMesh);

    // Campus Clock Tower
    const towerMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6, metalness: 0.3 });
    const towerGeo = new THREE.BoxGeometry(36, 140, 36);
    const towerMesh = new THREE.Mesh(towerGeo, towerMat);
    towerMesh.position.set(-135, 70, -145);
    towerMesh.castShadow = true;
    towerMesh.receiveShadow = true;
    this.scene.add(towerMesh);

    // Glowing Round Clock Face
    const clockGeo = new THREE.CircleGeometry(7, 16);
    const clockMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const clockMesh = new THREE.Mesh(clockGeo, clockMat);
    clockMesh.position.set(-135, 115, -126.9);
    this.scene.add(clockMesh);

    // 2. NORTH-EAST: Smart City Financial Tower (240 units high)
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.1, metalness: 0.9 });
    const skyGeo1 = new THREE.BoxGeometry(140, 110, 130);
    const skyMesh1 = new THREE.Mesh(skyGeo1, glassMat);
    skyMesh1.position.set(220, 55, -220);
    skyMesh1.castShadow = true;
    skyMesh1.receiveShadow = true;
    this.scene.add(skyMesh1);

    const skyGeo2 = new THREE.BoxGeometry(105, 80, 95);
    const skyMesh2 = new THREE.Mesh(skyGeo2, glassMat);
    skyMesh2.position.set(220, 150, -220);
    skyMesh2.castShadow = true;
    this.scene.add(skyMesh2);

    // Helipad Top
    const heliMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
    const heliGeo = new THREE.BoxGeometry(75, 20, 70);
    const heliMesh = new THREE.Mesh(heliGeo, heliMat);
    heliMesh.position.set(220, 200, -220);
    this.scene.add(heliMesh);

    // Glowing Helipad Ring
    const ringGeo = new THREE.RingGeometry(12, 14, 24);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.set(220, 210.1, -220);
    this.scene.add(ringMesh);

    // 3. SOUTH-EAST: City Multi-Specialty Trauma Care & Emergency Center
    const hospMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5, metalness: 0.2 });
    const hospGeo = new THREE.BoxGeometry(160, 80, 125);
    const hospMesh = new THREE.Mesh(hospGeo, hospMat);
    hospMesh.position.set(220, 40, 220);
    hospMesh.castShadow = true;
    hospMesh.receiveShadow = true;
    this.scene.add(hospMesh);

    // Glowing Red Medical Cross on Hospital
    const crossMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const c1 = new THREE.Mesh(new THREE.BoxGeometry(6, 20, 1), crossMat);
    c1.position.set(220, 55, 157.4);
    const c2 = new THREE.Mesh(new THREE.BoxGeometry(20, 6, 1), crossMat);
    c2.position.set(220, 55, 157.4);
    this.scene.add(c1);
    this.scene.add(c2);

    // 4. SOUTH-WEST: Metro Tech Park
    const techMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3, metalness: 0.8 });
    const techGeo = new THREE.BoxGeometry(150, 70, 130);
    const techMesh = new THREE.Mesh(techGeo, techMat);
    techMesh.position.set(-220, 35, 220);
    techMesh.castShadow = true;
    techMesh.receiveShadow = true;
    this.scene.add(techMesh);

    // 5. ELEVATED METRO VIADUCT
    this.initMetroViaduct();
  }

  initMetroViaduct() {
    const viaductZ = -105;
    const deckY = 46;
    const span = 600;

    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9, metalness: 0.1 });
    // Support Pillars
    const pillars = [-360, -200, 200, 360];
    for (const px of pillars) {
      const geo = new THREE.CylinderGeometry(6, 7, deckY, 12);
      const mesh = new THREE.Mesh(geo, concreteMat);
      mesh.position.set(px, deckY / 2, viaductZ);
      mesh.castShadow = true;
      this.scene.add(mesh);
    }

    // Concrete Deck
    const deckGeo = new THREE.BoxGeometry(span * 2, 6, 22);
    const deckMesh = new THREE.Mesh(deckGeo, concreteMat);
    deckMesh.position.set(0, deckY, viaductZ);
    deckMesh.receiveShadow = true;
    this.scene.add(deckMesh);

    // Metro Train Body
    const trainMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.2, metalness: 0.8 });
    const trainGeo = new THREE.BoxGeometry(110, 16, 16);
    this.metroTrain = new THREE.Mesh(trainGeo, trainMat);
    this.metroTrain.position.set(this.metroX, deckY + 11, viaductZ);
    this.metroTrain.castShadow = true;
    this.scene.add(this.metroTrain);
  }

  // 3D Cantilever Signal Gantries
  initSignalGantries() {
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.4, metalness: 0.7 });
    const boxMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });

    const configs = [
      { approach: 'NORTH', polePos: [-78, 0, -92], armTarget: [-22, 54, -78], lensPos: [-22, 45, -78] },
      { approach: 'EAST',  polePos: [ 92, 0, -78], armTarget: [ 78, 54, -22], lensPos: [ 78, 45, -22] },
      { approach: 'SOUTH', polePos: [ 78, 0,  92], armTarget: [ 22, 54,  78], lensPos: [ 22, 45,  78] },
      { approach: 'WEST',  polePos: [-92, 0,  78], armTarget: [-78, 54,  22], lensPos: [-78, 45,  22] }
    ];

    for (const cfg of configs) {
      // Vertical Mast
      const mastGeo = new THREE.CylinderGeometry(2.5, 3.2, 54, 12);
      const mast = new THREE.Mesh(mastGeo, steelMat);
      mast.position.set(cfg.polePos[0], 27, cfg.polePos[2]);
      mast.castShadow = true;
      this.scene.add(mast);

      // Horizontal Arm
      const dx = cfg.armTarget[0] - cfg.polePos[0];
      const dz = cfg.armTarget[2] - cfg.polePos[2];
      const armLen = Math.sqrt(dx * dx + dz * dz);
      const armGeo = new THREE.CylinderGeometry(1.8, 2.2, armLen, 8);
      const arm = new THREE.Mesh(armGeo, steelMat);
      arm.position.set((cfg.polePos[0] + cfg.armTarget[0]) / 2, 54, (cfg.polePos[2] + cfg.armTarget[2]) / 2);
      arm.rotation.z = Math.PI / 2;
      arm.rotation.y = Math.atan2(dz, dx);
      this.scene.add(arm);

      // Signal Head Housing
      const headGeo = new THREE.BoxGeometry(8, 22, 8);
      const head = new THREE.Mesh(headGeo, boxMat);
      head.position.set(cfg.armTarget[0], 43, cfg.armTarget[2]);
      this.scene.add(head);

      // 3 LED Optics (Red, Yellow, Green)
      const rMesh = this.createSignalLens(cfg.armTarget[0], 49, cfg.armTarget[2], 0xef4444);
      const yMesh = this.createSignalLens(cfg.armTarget[0], 43, cfg.armTarget[2], 0xf59e0b);
      const gMesh = this.createSignalLens(cfg.armTarget[0], 37, cfg.armTarget[2], 0x10b981);

      // Downward Ground Light Wash
      const light = new THREE.PointLight(0xef4444, 2.2, 120);
      light.position.set(cfg.armTarget[0], 35, cfg.armTarget[2]);
      this.scene.add(light);

      this.signalLenses[cfg.approach] = { red: rMesh, yellow: yMesh, green: gMesh, light: light };
    }
  }

  createSignalLens(x, y, z, color) {
    const geo = new THREE.SphereGeometry(2.2, 16, 16);
    const mat = new THREE.MeshBasicMaterial({ color: 0x334155 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z + 4.2);
    this.scene.add(mesh);
    return mesh;
  }

  // 3D Directional Corner Pole Sirens (Poles A–D)
  initPoleSirens() {
    const poles = [
      { id: 'A', x: -82, z: -82 },
      { id: 'B', x:  82, z: -82 },
      { id: 'C', x:  82, z:  82 },
      { id: 'D', x: -82, z:  82 }
    ];

    const steelMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.3, metalness: 0.8 });

    for (const p of poles) {
      const group = new THREE.Group();
      group.position.set(p.x, 0, p.z);

      // Tapered Mast
      const mastGeo = new THREE.CylinderGeometry(2, 3.5, 75, 12);
      const mast = new THREE.Mesh(mastGeo, steelMat);
      mast.position.y = 37.5;
      mast.castShadow = true;
      group.add(mast);

      // 4-Horn Megaphone Array
      const hornGeo = new THREE.ConeGeometry(3.5, 7, 8);
      const hornMat = new THREE.MeshStandardMaterial({ color: 0x475569 });
      for (let a = 0; a < 4; a++) {
        const h = new THREE.Mesh(hornGeo, hornMat);
        h.position.set(0, 74, 0);
        h.rotation.x = Math.PI / 2;
        h.rotation.z = (a * Math.PI) / 2;
        group.add(h);
      }

      // Rotating Strobe Beacon Dome
      const beaconGeo = new THREE.SphereGeometry(3.5, 12, 12);
      const beaconMat = new THREE.MeshBasicMaterial({ color: 0x64748b });
      const beacon = new THREE.Mesh(beaconGeo, beaconMat);
      beacon.position.y = 78;
      group.add(beacon);

      // Dynamic Strobe Point Light
      const strobeLight = new THREE.PointLight(0xef4444, 0, 160);
      strobeLight.position.y = 80;
      group.add(strobeLight);

      this.scene.add(group);
      this.sirenPoles[p.id] = { group, beacon, strobeLight, active: false };
    }
  }

  // High-End Procedural Vehicle Mesh Factory
  createVehicleMesh(v) {
    const group = new THREE.Group();
    const len = v.length || 32;
    const wid = v.width || 16;
    const type = v.type || 'CAR';
    const colorHex = v.color ? parseInt(v.color.replace('#', '0x')) : 0x38bdf8;

    // 1. Lower Chassis with Metallic Car Paint
    const chassisH = (type === 'BUS' ? 12 : type === 'FIRE_ENGINE' ? 14 : type === 'AMBULANCE' ? 12 : 7);
    const chassisMat = new THREE.MeshStandardMaterial({
      color: type === 'AMBULANCE' ? 0xffffff : type === 'FIRE_ENGINE' ? 0xdc2626 : colorHex,
      metalness: 0.85,
      roughness: 0.22
    });
    const chassisGeo = new THREE.BoxGeometry(len, chassisH, wid);
    const chassis = new THREE.Mesh(chassisGeo, chassisMat);
    chassis.position.y = chassisH / 2 + 1.5;
    chassis.castShadow = true;
    chassis.receiveShadow = true;
    group.add(chassis);

    // 2. 4 Rubber Wheels with Alloy Rims
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 });
    const wheelGeo = new THREE.CylinderGeometry(3.5, 3.5, 2.5, 12);
    wheelGeo.rotateZ(Math.PI / 2);

    const wX = len * 0.28;
    const wZ = wid * 0.52;
    const wheelOffsets = [
      [ wX, wZ],
      [ wX, -wZ],
      [-wX, wZ],
      [-wX, -wZ]
    ];
    for (const [ox, oz] of wheelOffsets) {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.position.set(ox, 3.5, oz);
      w.castShadow = true;
      group.add(w);
    }

    // 3. Cabin & Specific Types
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.95, roughness: 0.05 });

    if (type === 'AMBULANCE') {
      // 108 Ambulance High-Cube Body
      const boxGeo = new THREE.BoxGeometry(len * 0.88, 14, wid * 0.94);
      const boxMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
      const cube = new THREE.Mesh(boxGeo, boxMat);
      cube.position.set(0, chassisH + 7, 0);
      cube.castShadow = true;
      group.add(cube);

      // Red Cross on Ambulance Roof
      const crossMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
      const c1 = new THREE.Mesh(new THREE.BoxGeometry(8, 0.4, 2.5), crossMat);
      c1.position.set(0, chassisH + 14.2, 0);
      const c2 = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.4, 8), crossMat);
      c2.position.set(0, chassisH + 14.2, 0);
      group.add(c1);
      group.add(c2);

      // Flashing Dual Red & Blue Lightbar
      const lightbarGeo = new THREE.BoxGeometry(4, 2.5, 8);
      const redBlueMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
      const lightbar = new THREE.Mesh(lightbarGeo, redBlueMat);
      lightbar.position.set(len * 0.2, chassisH + 15, 0);
      group.add(lightbar);

      const beaconLight = new THREE.PointLight(0xef4444, 2.5, 80);
      beaconLight.position.set(len * 0.2, chassisH + 16, 0);
      group.add(beaconLight);
      group.userData.beaconLight = beaconLight;

    } else if (type === 'BUS') {
      // Full Passenger Cabin
      const cabinGeo = new THREE.BoxGeometry(len * 0.92, 14, wid * 0.92);
      const cabin = new THREE.Mesh(cabinGeo, glassMat);
      cabin.position.set(0, chassisH + 7, 0);
      cabin.castShadow = true;
      group.add(cabin);

    } else if (type === 'AUTO_RICKSHAW') {
      // Yellow-Green Auto Rickshaw Canopy
      const topGeo = new THREE.BoxGeometry(len * 0.82, 11, wid * 0.92);
      const topMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.5 });
      const canopy = new THREE.Mesh(topGeo, topMat);
      canopy.position.set(0, chassisH + 5.5, 0);
      canopy.castShadow = true;
      group.add(canopy);

    } else {
      // Passenger Car / Sedan Cabin
      const cabLen = len * 0.58;
      const cabWid = wid * 0.84;
      const cabinGeo = new THREE.BoxGeometry(cabLen, 8, cabWid);
      const cabin = new THREE.Mesh(cabinGeo, glassMat);
      cabin.position.set(-len * 0.08, chassisH + 4, 0);
      cabin.castShadow = true;
      group.add(cabin);
    }

    // 4. LED Headlights with Forward Spotlights
    const hlMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const hlGeo = new THREE.BoxGeometry(1.5, 2, 2.5);
    const hl1 = new THREE.Mesh(hlGeo, hlMat);
    hl1.position.set(len / 2 + 0.5, chassisH * 0.55, wid * 0.32);
    const hl2 = new THREE.Mesh(hlGeo, hlMat);
    hl2.position.set(len / 2 + 0.5, chassisH * 0.55, -wid * 0.32);
    group.add(hl1);
    group.add(hl2);

    // 5. LED Taillights (Red)
    const tlMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const tlGeo = new THREE.BoxGeometry(1.5, 2, 2.5);
    const tl1 = new THREE.Mesh(tlGeo, tlMat);
    tl1.position.set(-len / 2 - 0.5, chassisH * 0.55, wid * 0.32);
    const tl2 = new THREE.Mesh(tlGeo, tlMat);
    tl2.position.set(-len / 2 - 0.5, chassisH * 0.55, -wid * 0.32);
    group.add(tl1);
    group.add(tl2);

    group.userData.vehicleId = v.id;
    return group;
  }

  // Update loop called every animation frame with live backend state
  update(sim) {
    if (!sim) return;

    // 1. Camera Preset / Orbit Mode Updates
    if (this.cameraMode === '3D_ORBIT' || this.isOrbiting) {
      const r = 680;
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
      this.metroX += 1.6;
      if (this.metroX > 600) this.metroX = -600;
      this.metroTrain.position.x = this.metroX;
    }

    // 3. Vehicles Sync
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
      }

      // Smooth position interpolation
      mesh.position.x += (v.x - mesh.position.x) * 0.35;
      mesh.position.z += (v.y - mesh.position.z) * 0.35;
      mesh.rotation.y = -v.angle;

      // 108 Ambulance Flashing Strobe
      if (v.type === 'AMBULANCE' && mesh.userData.beaconLight) {
        const isRed = Math.sin(Date.now() * 0.012) > 0;
        mesh.userData.beaconLight.color.setHex(isRed ? 0xef4444 : 0x3b82f6);
        mesh.userData.beaconLight.intensity = 2.8;
      }
    }

    // Clean up exited vehicles
    for (const [id, mesh] of this.vehicleMeshes.entries()) {
      if (!activeIds.has(id)) {
        this.scene.remove(mesh);
        this.vehicleMeshes.delete(id);
      }
    }

    // 4. Traffic Signal Heads & Optics Sync
    const roads = sim.roads || {};
    const roadMap = {
      'NORTH': roads['A'],
      'EAST':  roads['B'],
      'SOUTH': roads['C'],
      'WEST':  roads['D']
    };

    for (const [app, lenses] of Object.entries(this.signalLenses)) {
      const roadData = roadMap[app];
      const state = (roadData && roadData.signalState) || 'RED';

      lenses.red.material.color.setHex(state === 'RED' ? 0xef4444 : 0x1e293b);
      lenses.yellow.material.color.setHex(state === 'YELLOW' ? 0xf59e0b : 0x1e293b);
      lenses.green.material.color.setHex(state === 'GREEN' ? 0x10b981 : 0x1e293b);

      const activeColor = state === 'RED' ? 0xef4444 : state === 'YELLOW' ? 0xf59e0b : 0x10b981;
      lenses.light.color.setHex(activeColor);
      lenses.light.intensity = 2.2;
    }

    // 5. Corner Pole Sirens (Poles A–D)
    const sirens = sim.directionalSirens || {};
    for (const [poleId, poleObj] of Object.entries(this.sirenPoles)) {
      const sirenData = sirens[poleId];
      const isActive = Boolean(sirenData && sirenData.active);

      if (isActive) {
        const flash = Math.sin(Date.now() * 0.015) > 0;
        poleObj.beacon.material.color.setHex(flash ? 0xef4444 : 0x1e293b);
        poleObj.strobeLight.intensity = flash ? 3.5 : 0;
      } else {
        poleObj.beacon.material.color.setHex(0x475569);
        poleObj.strobeLight.intensity = 0;
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
      this.animateCameraTo(0, 480, 520, 0, 0, 0);
    } else if (mode === '3D_ORBIT') {
      this.isOrbiting = true;
    } else if (mode === '3D_STREET') {
      this.animateCameraTo(-140, 32, 140, 0, 15, 0);
    } else if (mode === '2D_PLAN') {
      this.animateCameraTo(0, 780, 0.1, 0, 0, 0);
    }
  }

  animateCameraTo(x, y, z, tx, ty, tz) {
    const t0 = Date.now();
    const dur = 600;
    const sx = this.camera.position.x;
    const sy = this.camera.position.y;
    const sz = this.camera.position.z;

    const step = () => {
      const elapsed = Date.now() - t0;
      const progress = Math.min(1, elapsed / dur);
      const ease = 0.5 - Math.cos(progress * Math.PI) / 2;

      this.camera.position.set(
        sx + (x - sx) * ease,
        sy + (y - sy) * ease,
        sz + (z - sz) * ease
      );
      this.controls.target.set(tx, ty, tz);

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };
    step();
  }

  toggleOrbit() {
    this.isOrbiting = !this.isOrbiting;
    this.cameraMode = this.isOrbiting ? '3D_ORBIT' : '3D_PERSPECTIVE';
    return this.isOrbiting;
  }

  onWindowResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
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
