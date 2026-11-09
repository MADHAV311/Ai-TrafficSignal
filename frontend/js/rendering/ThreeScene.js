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
      carChassis: new THREE.BoxGeometry(32, 7, 16),
      busChassis: new THREE.BoxGeometry(48, 12, 17),
      fireChassis: new THREE.BoxGeometry(44, 14, 17),
      autoChassis: new THREE.BoxGeometry(22, 6, 13),
      wheel: new THREE.CylinderGeometry(3.5, 3.5, 2.5, 10).rotateZ(Math.PI / 2),
      carCabin: new THREE.BoxGeometry(18, 8, 14),
      busCabin: new THREE.BoxGeometry(44, 14, 15),
      autoCabin: new THREE.BoxGeometry(17, 11, 12),
      headlight: new THREE.BoxGeometry(1.5, 2, 2.5),
      taillight: new THREE.BoxGeometry(1.5, 2, 2.5),
      signalLens: new THREE.SphereGeometry(3.2, 16, 16)
    };

    // Shared Materials
    this.matPool = {
      wheel: new THREE.MeshLambertMaterial({ color: 0x111827 }),
      glass: new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.1 }),
      headlight: new THREE.MeshBasicMaterial({ color: 0xfffad2 }),
      taillight: new THREE.MeshBasicMaterial({ color: 0xef4444 }),
      signalDark: new THREE.MeshBasicMaterial({ color: 0x182234 }),
      steel: new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.4, metalness: 0.7 }),
      housing: new THREE.MeshStandardMaterial({ color: 0x0a0f1d, roughness: 0.8 })
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

  initGroundAndRoads() {
    const rw = 70; // Half road width
    const span = 600;

    // Ground Base
    const groundGeo = new THREE.PlaneGeometry(span * 2, span * 2);
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x070c14 });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;
    this.scene.add(groundMesh);

    // Asphalt Roads (East-West & North-South)
    const asphaltMat = new THREE.MeshLambertMaterial({ color: 0x18202d });

    const ewGeo = new THREE.PlaneGeometry(span * 2, rw * 2);
    const ewMesh = new THREE.Mesh(ewGeo, asphaltMat);
    ewMesh.rotation.x = -Math.PI / 2;
    ewMesh.position.y = 0.2;
    ewMesh.receiveShadow = true;
    this.scene.add(ewMesh);

    const nsGeo = new THREE.PlaneGeometry(rw * 2, span * 2);
    const nsMesh = new THREE.Mesh(nsGeo, asphaltMat);
    nsMesh.rotation.x = -Math.PI / 2;
    nsMesh.position.y = 0.22;
    nsMesh.receiveShadow = true;
    this.scene.add(nsMesh);

    // Double-Solid Yellow Centerlines
    const yellowMat = new THREE.MeshBasicMaterial({ color: 0xeab308 });
    this.createRoadLine(0, 0.4, -span / 2 - rw / 2, 2.5, span - rw, yellowMat, false);
    this.createRoadLine(0, 0.4,  span / 2 + rw / 2, 2.5, span - rw, yellowMat, false);
    this.createRoadLine(-span / 2 - rw / 2, 0.4, 0, span - rw, 2.5, yellowMat, true);
    this.createRoadLine( span / 2 + rw / 2, 0.4, 0, span - rw, 2.5, yellowMat, true);

    // Zebra Crosswalk Stripes
    this.crosswalkGroup = new THREE.Group();
    this.scene.add(this.crosswalkGroup);
    const whiteMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
    this.initCrosswalks(rw, whiteMat);
  }

  createRoadLine(x, y, z, w, l, mat, isHoriz) {
    const geo = new THREE.PlaneGeometry(w, l);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, y, z);
    this.scene.add(mesh);
    return mesh;
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

  // 3D Roadside Stop-Line Traffic Signals with Live Countdown Badges & Stop-Line Ground Lights
  initRoadsideSignals() {
    const rw = 70;
    const stopOffset = 82;

    const signalConfigs = [
      { id: 'A', name: 'Road A (North)', x: -rw - 14, z: -stopOffset, stopX: -rw / 2, stopZ: -rw - 4, isHoriz: true,  angle: 0 },
      { id: 'B', name: 'Road B (East)',  x:  stopOffset, z: -rw - 14, stopX:  rw + 4, stopZ: -rw / 2, isHoriz: false, angle: -Math.PI / 2 },
      { id: 'C', name: 'Road C (South)', x:  rw + 14, z:  stopOffset, stopX:  rw / 2, stopZ:  rw + 4, isHoriz: true,  angle: Math.PI },
      { id: 'D', name: 'Road D (West)',  x: -stopOffset, z:  rw + 14, stopX: -rw - 4, stopZ:  rw / 2, isHoriz: false, angle: Math.PI / 2 }
    ];

    for (const cfg of signalConfigs) {
      const group = new THREE.Group();
      group.position.set(cfg.x, 0, cfg.z);

      // 1. Upright Steel Mast
      const mastGeo = new THREE.CylinderGeometry(1.8, 2.5, 36, 12);
      const mast = new THREE.Mesh(mastGeo, this.matPool.steel);
      mast.position.y = 18;
      group.add(mast);

      // 2. High-Visibility Signal Housing Box
      const boxGeo = new THREE.BoxGeometry(10, 24, 10);
      const box = new THREE.Mesh(boxGeo, this.matPool.housing);
      box.position.y = 36;
      group.add(box);

      // 3. Three Large Circular LED Lenses (Red, Yellow, Green)
      const redMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
      const yellowMat = new THREE.MeshBasicMaterial({ color: 0x334155 });
      const greenMat = new THREE.MeshBasicMaterial({ color: 0x334155 });

      const redLens = new THREE.Mesh(this.geoPool.signalLens, redMat);
      redLens.position.set(0, 43, 0);
      group.add(redLens);

      const yellowLens = new THREE.Mesh(this.geoPool.signalLens, yellowMat);
      yellowLens.position.set(0, 36, 0);
      group.add(yellowLens);

      const greenLens = new THREE.Mesh(this.geoPool.signalLens, greenMat);
      greenLens.position.set(0, 29, 0);
      group.add(greenLens);

      // 4. Digital Countdown Billboard Sprite (Faces Camera Automatically)
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
      sprite.position.set(0, 52, 0);
      sprite.scale.set(24, 12, 1);
      group.add(sprite);

      this.scene.add(group);

      // 5. Glowing Stop-Line Road Surface Light Bar (Turns Red/Yellow/Green on asphalt)
      const stopLineMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
      const stopLineGeo = cfg.isHoriz ? new THREE.PlaneGeometry(rw, 6) : new THREE.PlaneGeometry(6, rw);
      const stopLineMesh = new THREE.Mesh(stopLineGeo, stopLineMat);
      stopLineMesh.rotation.x = -Math.PI / 2;
      stopLineMesh.position.set(cfg.stopX, 0.45, cfg.stopZ);
      this.scene.add(stopLineMesh);

      this.signalPosts[cfg.id] = {
        group,
        redLens,
        yellowLens,
        greenLens,
        sprite,
        canvas,
        ctx,
        texture,
        stopLine: stopLineMesh,
        lastRenderedText: ''
      };
    }
  }

  // 3D Cantilever Overhead Signal Gantries
  initSignalGantries() {
    const configs = [
      { id: 'A', polePos: [-78, 0, -92], armTarget: [-22, 54, -78] },
      { id: 'B', polePos: [ 92, 0, -78], armTarget: [ 78, 54, -22] },
      { id: 'C', polePos: [ 78, 0,  92], armTarget: [ 22, 54,  78] },
      { id: 'D', polePos: [-92, 0,  78], armTarget: [-78, 54,  22] }
    ];

    for (const cfg of configs) {
      // Vertical Mast
      const mastGeo = new THREE.CylinderGeometry(2.5, 3.2, 54, 10);
      const mast = new THREE.Mesh(mastGeo, this.matPool.steel);
      mast.position.set(cfg.polePos[0], 27, cfg.polePos[2]);
      this.scene.add(mast);

      // Horizontal Arm
      const dx = cfg.armTarget[0] - cfg.polePos[0];
      const dz = cfg.armTarget[2] - cfg.polePos[2];
      const armLen = Math.sqrt(dx * dx + dz * dz);
      const armGeo = new THREE.CylinderGeometry(1.8, 2.2, armLen, 8);
      const arm = new THREE.Mesh(armGeo, this.matPool.steel);
      arm.position.set((cfg.polePos[0] + cfg.armTarget[0]) / 2, 54, (cfg.polePos[2] + cfg.armTarget[2]) / 2);
      arm.rotation.z = Math.PI / 2;
      arm.rotation.y = Math.atan2(dz, dx);
      this.scene.add(arm);

      // Overhead Signal Head Box
      const headGeo = new THREE.BoxGeometry(8, 22, 8);
      const head = new THREE.Mesh(headGeo, this.matPool.housing);
      head.position.set(cfg.armTarget[0], 43, cfg.armTarget[2]);
      this.scene.add(head);

      // 3 LED Optics (Red, Yellow, Green)
      const redMesh = new THREE.Mesh(this.geoPool.signalLens, new THREE.MeshBasicMaterial({ color: 0xef4444 }));
      redMesh.position.set(cfg.armTarget[0], 49, cfg.armTarget[2]);
      this.scene.add(redMesh);

      const yellowMesh = new THREE.Mesh(this.geoPool.signalLens, new THREE.MeshBasicMaterial({ color: 0x1e293b }));
      yellowMesh.position.set(cfg.armTarget[0], 43, cfg.armTarget[2]);
      this.scene.add(yellowMesh);

      const greenMesh = new THREE.Mesh(this.geoPool.signalLens, new THREE.MeshBasicMaterial({ color: 0x1e293b }));
      greenMesh.position.set(cfg.armTarget[0], 37, cfg.armTarget[2]);
      this.scene.add(greenMesh);

      this.gantryLenses[cfg.id] = { red: redMesh, yellow: yellowMesh, green: greenMesh };
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

  // 3D City Architecture (Optimized Lambert materials for zero lag)
  initCityArchitecture() {
    // 1. NORTH-WEST: University Campus
    const campusMat = new THREE.MeshLambertMaterial({ color: 0x881337 });
    const campus = new THREE.Mesh(new THREE.BoxGeometry(160, 75, 120), campusMat);
    campus.position.set(-220, 37.5, -220);
    this.scene.add(campus);

    // Clock Tower
    const towerMat = new THREE.MeshLambertMaterial({ color: 0x9f1239 });
    const tower = new THREE.Mesh(new THREE.BoxGeometry(45, 140, 45), towerMat);
    tower.position.set(-145, 70, -145);
    this.scene.add(tower);

    // 2. NORTH-EAST: Glass High-Rise Skyscraper
    const skyMat = new THREE.MeshLambertMaterial({ color: 0x0369a1 });
    const sky = new THREE.Mesh(new THREE.BoxGeometry(130, 240, 130), skyMat);
    sky.position.set(220, 120, -220);
    this.scene.add(sky);

    // 3. SOUTH-EAST: Trauma Center & Emergency Hospital
    const hospMat = new THREE.MeshLambertMaterial({ color: 0xf1f5f9 });
    const hospital = new THREE.Mesh(new THREE.BoxGeometry(170, 65, 150), hospMat);
    hospital.position.set(220, 32.5, 220);
    this.scene.add(hospital);

    // 3D Illuminated Red Cross on Hospital
    const crossMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const c1 = new THREE.Mesh(new THREE.BoxGeometry(28, 6, 2), crossMat);
    c1.position.set(220, 52, 144);
    const c2 = new THREE.Mesh(new THREE.BoxGeometry(6, 28, 2), crossMat);
    c2.position.set(220, 52, 144);
    this.scene.add(c1);
    this.scene.add(c2);

    // 4. SOUTH-WEST: Metro Tech Park
    const techMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    const tech = new THREE.Mesh(new THREE.BoxGeometry(150, 70, 130), techMat);
    tech.position.set(-220, 35, 220);
    this.scene.add(tech);

    // 5. ELEVATED METRO VIADUCT
    this.initMetroViaduct();
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

    const deck = new THREE.Mesh(new THREE.BoxGeometry(span * 2, 6, 22), concreteMat);
    deck.position.set(0, deckY, viaductZ);
    this.scene.add(deck);

    // Metro Train
    const trainMat = new THREE.MeshLambertMaterial({ color: 0x0284c7 });
    this.metroTrain = new THREE.Mesh(new THREE.BoxGeometry(110, 16, 16), trainMat);
    this.metroTrain.position.set(this.metroX, deckY + 11, viaductZ);
    this.scene.add(this.metroTrain);
  }

  // High-Performance Procedural Vehicle Mesh Factory (Reused geometries, 1 shadow per vehicle)
  createVehicleMesh(v) {
    const group = new THREE.Group();
    const len = v.length || 32;
    const wid = v.width || 16;
    const type = v.type || 'CAR';
    const colorHex = v.color ? parseInt(v.color.replace('#', '0x')) : 0x38bdf8;

    let chassisGeo = this.geoPool.carChassis;
    let chassisH = 7;
    let cabinGeo = this.geoPool.carCabin;
    let cabinY = 7.5;
    let chassisColor = colorHex;

    if (type === 'BUS') {
      chassisGeo = this.geoPool.busChassis;
      chassisH = 12;
      cabinGeo = this.geoPool.busCabin;
      cabinY = 13;
    } else if (type === 'FIRE_ENGINE') {
      chassisGeo = this.geoPool.fireChassis;
      chassisH = 14;
      chassisColor = 0xdc2626;
      cabinGeo = this.geoPool.carCabin;
      cabinY = 11;
    } else if (type === 'AMBULANCE') {
      chassisGeo = this.geoPool.carChassis;
      chassisH = 12;
      chassisColor = 0xffffff;
      cabinGeo = this.geoPool.carCabin;
      cabinY = 10;
    } else if (type === 'AUTO_RICKSHAW') {
      chassisGeo = this.geoPool.autoChassis;
      chassisH = 6;
      chassisColor = 0xeab308;
      cabinGeo = this.geoPool.autoCabin;
      cabinY = 8.5;
    }

    // 1. Lower Metallic Chassis (ONLY mesh casting a shadow for 60 FPS performance)
    const chassisMat = new THREE.MeshLambertMaterial({ color: chassisColor });
    const chassis = new THREE.Mesh(chassisGeo, chassisMat);
    chassis.position.y = chassisH / 2 + 1.5;
    chassis.castShadow = true;
    group.add(chassis);

    // 2. Cabin Glass
    const cabin = new THREE.Mesh(cabinGeo, this.matPool.glass);
    cabin.position.set(-len * 0.05, chassisH + cabinY / 2 - 2, 0);
    group.add(cabin);

    // 3. 4 Rubber Wheels (No shadows on wheels -> massive speedup)
    const wX = len * 0.28;
    const wZ = wid * 0.52;
    const offsets = [[wX, wZ], [wX, -wZ], [-wX, wZ], [-wX, -wZ]];
    for (const [ox, oz] of offsets) {
      const w = new THREE.Mesh(this.geoPool.wheel, this.matPool.wheel);
      w.position.set(ox, 3.5, oz);
      group.add(w);
    }

    // 4. Headlights & Taillights
    const hl1 = new THREE.Mesh(this.geoPool.headlight, this.matPool.headlight);
    hl1.position.set(len / 2 + 0.5, chassisH * 0.6, wid * 0.32);
    const hl2 = new THREE.Mesh(this.geoPool.headlight, this.matPool.headlight);
    hl2.position.set(len / 2 + 0.5, chassisH * 0.6, -wid * 0.32);
    group.add(hl1);
    group.add(hl2);

    const tl1 = new THREE.Mesh(this.geoPool.taillight, this.matPool.taillight);
    tl1.position.set(-len / 2 - 0.5, chassisH * 0.6, wid * 0.32);
    const tl2 = new THREE.Mesh(this.geoPool.taillight, this.matPool.taillight);
    tl2.position.set(-len / 2 - 0.5, chassisH * 0.6, -wid * 0.32);
    group.add(tl1);
    group.add(tl2);

    // 5. 108 Ambulance Lightbar
    if (type === 'AMBULANCE') {
      const barMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
      const bar = new THREE.Mesh(new THREE.BoxGeometry(4, 2.5, 8), barMat);
      bar.position.set(len * 0.15, chassisH + 9, 0);
      group.add(bar);
      group.userData.ambulanceBar = bar;
    }

    group.userData.vehicleId = v.id;
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
      this.metroX += 1.8;
      if (this.metroX > 600) this.metroX = -600;
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

      // Ambulance Lightbar Flash
      if (v.type === 'AMBULANCE' && mesh.userData.ambulanceBar) {
        const isRed = Math.sin(Date.now() * 0.012) > 0;
        mesh.userData.ambulanceBar.material.color.setHex(isRed ? 0xef4444 : 0x3b82f6);
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

    // 4. Traffic Signal Heads & Optics Sync (Real-Time LEDs & Glowing Stop Lines)
    const roads = sim.roads || {};
    const roadIds = ['A', 'B', 'C', 'D'];

    for (const rId of roadIds) {
      const roadData = roads[rId];
      const state = (roadData && roadData.signalState) || 'RED';
      const remaining = Math.ceil((roadData && roadData.remainingInPhase) || 0);

      const isRed = (state === 'RED' || state === 'ALL_RED' || state === 'SCRAMBLE');
      const isYellow = (state === 'YELLOW' || state === 'FLASHING_YELLOW');
      const isGreen = (state === 'GREEN');

      // Update Roadside Signal Posts
      const post = this.signalPosts[rId];
      if (post) {
        // Lenses
        post.redLens.material.color.setHex(isRed ? 0xff2222 : 0x182234);
        post.yellowLens.material.color.setHex(isYellow ? 0xffbb00 : 0x182234);
        post.greenLens.material.color.setHex(isGreen ? 0x00ff88 : 0x182234);

        // Ground Stop-Line Light Bar (Illuminates Red/Yellow/Green on asphalt)
        const stopColor = isGreen ? 0x00ff88 : (isYellow ? 0xffbb00 : 0xff2222);
        post.stopLine.material.color.setHex(stopColor);

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
        gantry.red.material.color.setHex(isRed ? 0xff2222 : 0x182234);
        gantry.yellow.material.color.setHex(isYellow ? 0xffbb00 : 0x182234);
        gantry.green.material.color.setHex(isGreen ? 0x00ff88 : 0x182234);
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
    const t0 = Date.now();
    const dur = 550;
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
