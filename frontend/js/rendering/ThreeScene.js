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
      wheel: new THREE.CylinderGeometry(3.5, 3.5, 2.5, 12).rotateZ(Math.PI / 2),
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
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 2.6, 8).rotateZ(Math.PI / 2), new THREE.MeshLambertMaterial({ color: hubColor }));
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
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 2.6, 8).rotateZ(Math.PI / 2), this.matPool.steel);
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
      const redCap = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 2.6, 8).rotateZ(Math.PI / 2), redMat);
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
    const frontWheel = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.8, 2.0, 10).rotateZ(Math.PI / 2), this.matPool.wheel);
    frontWheel.position.set(8.5, 2.8, 0);
    group.add(frontWheel);

    const rearW1 = new THREE.Mesh(this.geoPool.wheel, this.matPool.wheel);
    rearW1.position.set(-6.5, 3.5, 6.8);
    group.add(rearW1);
    const rearW2 = new THREE.Mesh(this.geoPool.wheel, this.matPool.wheel);
    rearW2.position.set(-6.5, 3.5, -6.8);
    group.add(rearW2);

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
