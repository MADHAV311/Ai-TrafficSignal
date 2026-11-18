with open('frontend/js/rendering/ThreeScene.js', 'r', encoding='utf-8') as f:
    code = f.read()

# Replace initCivicInfrastructure with photorealistic version
civic_start = "  // Initialize 3D Civic & Sustainable Infrastructure\n  initCivicInfrastructure() {"
civic_end = "  initGroundAndRoads() {"

idx1 = code.find(civic_start)
idx2 = code.find(civic_end)
assert idx1 != -1 and idx2 != -1, "Markers for initCivicInfrastructure not found"

new_civic = """  // Initialize 3D Civic & Sustainable Infrastructure (Photorealistic Potholes, Waste & Smart Pole)
  initCivicInfrastructure() {
    this.civicGroup = new THREE.Group();
    this.scene.add(this.civicGroup);

    // =========================================================================
    // 1. ROAD POTHOLES & PWD SAFETY PERIMETER (Road A & Road C)
    // =========================================================================
    const potholeTex = this.createPotholeTexture();

    // Pothole #1 (Critical Severity) on Road A (North approach, Lane 1: x = 17.5, z = -140)
    const pot1Group = new THREE.Group();
    pot1Group.position.set(17.5, 0.12, -140);

    const pot1Geo = new THREE.PlaneGeometry(26, 26);
    const pot1Mat = new THREE.MeshLambertMaterial({ map: potholeTex, transparent: true, polygonOffset: true, polygonOffsetFactor: -3 });
    const pot1Mesh = new THREE.Mesh(pot1Geo, pot1Mat);
    pot1Mesh.rotation.x = -Math.PI / 2;
    pot1Group.add(pot1Mesh);

    // 3D Aggregate Loose Asphalt Stones around crater rim
    const stoneGeo = new THREE.DodecahedronGeometry(0.75, 0);
    const stoneMat = new THREE.MeshLambertMaterial({ color: 0x334155, roughness: 0.9 });
    for (let i = 0; i < 18; i++) {
      const stone = new THREE.Mesh(stoneGeo, stoneMat);
      const ang = (i / 18) * Math.PI * 2 + (Math.random() * 0.2);
      const rad = 8.5 + Math.random() * 4.5;
      stone.position.set(Math.cos(ang) * rad, 0.4, Math.sin(ang) * rad);
      stone.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      pot1Group.add(stone);
    }

    // 2 High-Visibility Municipal PWD Safety Traffic Cones flanking the pothole
    const cone1 = this.createTrafficCone();
    cone1.position.set(-9.5, 0, -8);
    pot1Group.add(cone1);

    const cone2 = this.createTrafficCone();
    cone2.position.set(9.5, 0, 8);
    pot1Group.add(cone2);

    // Glowing inspection halo
    const halo1Geo = new THREE.RingGeometry(14.0, 15.6, 32);
    const halo1Mat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
    const halo1Mesh = new THREE.Mesh(halo1Geo, halo1Mat);
    halo1Mesh.rotation.x = -Math.PI / 2;
    halo1Mesh.position.y = 0.06;
    pot1Group.add(halo1Mesh);
    halo1Mesh.userData.dynamic = true;
    pot1Group.userData.halo = halo1Mesh;

    // Overhead 3D label
    const pot1Badge = this.createBadgeSprite('🕳️ POTHOLE #104 | 28cm | PWD REPAIR ACTIVE', 'rgba(15, 23, 42, 0.94)', '#f59e0b', '#fbbf24');
    pot1Badge.position.set(0, 10, 0);
    pot1Group.add(pot1Badge);

    this.civicGroup.add(pot1Group);
    this.pothole1 = pot1Group;

    // Pothole #2 (Moderate Severity) on Road C (South approach, Lane 2: x = -52.5, z = 95)
    const pot2Group = new THREE.Group();
    pot2Group.position.set(-52.5, 0.12, 95);

    const pot2Geo = new THREE.PlaneGeometry(18, 18);
    const pot2Mat = new THREE.MeshLambertMaterial({ map: potholeTex, transparent: true, polygonOffset: true, polygonOffsetFactor: -3 });
    const pot2Mesh = new THREE.Mesh(pot2Geo, pot2Mat);
    pot2Mesh.rotation.x = -Math.PI / 2;
    pot2Group.add(pot2Mesh);

    const halo2Geo = new THREE.RingGeometry(9.8, 11.2, 32);
    const halo2Mat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
    const halo2Mesh = new THREE.Mesh(halo2Geo, halo2Mat);
    halo2Mesh.rotation.x = -Math.PI / 2;
    halo2Mesh.position.y = 0.06;
    pot2Group.add(halo2Mesh);
    halo2Mesh.userData.dynamic = true;
    pot2Group.userData.halo = halo2Mesh;

    const pot2Badge = this.createBadgeSprite('🕳️ POTHOLE #108 | 16cm | PWD LOGGED', 'rgba(15, 23, 42, 0.94)', '#38bdf8', '#7dd3fc');
    pot2Badge.position.set(0, 8.5, 0);
    pot2Group.add(pot2Badge);

    this.civicGroup.add(pot2Group);
    this.pothole2 = pot2Group;

    // =========================================================================
    // 2. MUNICIPAL RECYCLING DUMPSTER & ROADSIDE LITTER CLUSTER
    // =========================================================================
    const wasteGroup = new THREE.Group();
    wasteGroup.position.set(-78, 1.0, -78); // NW sidewalk corner plaza

    // Green Municipal Wheelie Bin with Side Grips
    const binGeo = new THREE.CylinderGeometry(3.6, 3.1, 9.2, 16);
    const binMat = new THREE.MeshLambertMaterial({ color: 0x15803d }); // Municipal green
    const binMesh = new THREE.Mesh(binGeo, binMat);
    binMesh.position.y = 5.2;
    binMesh.castShadow = true;
    wasteGroup.add(binMesh);

    // Wheelie bin rubber wheels & steel axle
    const wheelMat = new THREE.MeshLambertMaterial({ color: 0x0f172a });
    const w1 = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.8, 12).rotateZ(Math.PI / 2), wheelMat);
    w1.position.set(-3.2, 1.2, 0);
    wasteGroup.add(w1);
    const w2 = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.8, 12).rotateZ(Math.PI / 2), wheelMat);
    w2.position.set(3.2, 1.2, 0);
    wasteGroup.add(w2);
    const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 6.4, 8).rotateZ(Math.PI / 2), this.matPool.steel);
    axle.position.set(0, 1.2, 0);
    wasteGroup.add(axle);

    // Yellow Hinged Lid (Tilted slightly open by 18° showing overflow)
    const lidGroup = new THREE.Group();
    lidGroup.position.set(0, 9.8, -2.8);
    const lidGeo = new THREE.BoxGeometry(7.6, 0.8, 7.6);
    const lidMat = new THREE.MeshLambertMaterial({ color: 0xeab308 });
    const lidMesh = new THREE.Mesh(lidGeo, lidMat);
    lidMesh.position.set(0, 0, 3.8);
    lidGroup.add(lidMesh);
    lidGroup.rotation.x = -0.32; // slightly ajar
    wasteGroup.add(lidGroup);

    // Realistic Cardboard Shipping Carton with courier tape & barcode
    const cardTex = this.createCardboardTexture();
    const cardMat = new THREE.MeshLambertMaterial({ map: cardTex });
    const cBox = new THREE.Mesh(new THREE.BoxGeometry(4.2, 3.2, 3.4), cardMat);
    cBox.position.set(4.8, 1.6, 2.0);
    cBox.rotation.y = 0.42;
    wasteGroup.add(cBox);

    // Crushed Aluminum Beverage Can (Metallic Specular finish)
    const canMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.92, roughness: 0.22 });
    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 2.2, 10).rotateZ(0.7), canMat);
    can.position.set(-4.2, 0.7, 3.4);
    wasteGroup.add(can);

    // Plastic bottle debris (translucent blue)
    const botMat = new THREE.MeshLambertMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.78 });
    for (let i = 0; i < 4; i++) {
      const bot = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 1.8, 8), botMat);
      bot.position.set(2.2 + (Math.random() * 4), 0.5, -2 + (Math.random() * 4));
      bot.rotation.z = Math.PI / 2;
      bot.rotation.y = Math.random() * Math.PI;
      wasteGroup.add(bot);
    }

    // Crumpled white paper balls
    const paperMat = new THREE.MeshLambertMaterial({ color: 0xf1f5f9 });
    for (let i = 0; i < 3; i++) {
      const p = new THREE.Mesh(new THREE.DodecahedronGeometry(0.7, 0), paperMat);
      p.position.set(-2.5 + Math.random() * 4.5, 0.5, 3.0 + Math.random() * 2.5);
      p.rotation.set(Math.random(), Math.random(), 0);
      wasteGroup.add(p);
    }

    // Overhead 3D label
    const wasteBadge = this.createBadgeSprite('🗑️ SOLID WASTE OVERFLOW (94%) | SWM SLA DISPATCHED', 'rgba(15, 23, 42, 0.94)', '#10b981', '#34d399');
    wasteBadge.position.set(0, 15, 0);
    wasteGroup.add(wasteBadge);

    this.civicGroup.add(wasteGroup);
    this.wasteStation = wasteGroup;

    // =========================================================================
    // 3. URBAN WATERLOGGING PUDDLE (South Crosswalk Gutter)
    // =========================================================================
    const puddleGroup = new THREE.Group();
    puddleGroup.position.set(65, 0.14, 70);

    // Dark wet-look asphalt halo around the standing water
    const wetHaloGeo = new THREE.PlaneGeometry(36, 28);
    const wetHaloMat = new THREE.MeshLambertMaterial({
      color: 0x0b1320,
      transparent: true,
      opacity: 0.75,
      polygonOffset: true,
      polygonOffsetFactor: -1
    });
    const wetHalo = new THREE.Mesh(wetHaloGeo, wetHaloMat);
    wetHalo.rotation.x = -Math.PI / 2;
    puddleGroup.add(wetHalo);

    const puddleTex = this.createPuddleTexture();
    const puddleGeo = new THREE.PlaneGeometry(30, 22);
    const puddleMat = new THREE.MeshStandardMaterial({
      map: puddleTex,
      color: 0x0284c7,
      roughness: 0.05,
      metalness: 0.92,
      transparent: true,
      opacity: 0.85,
      polygonOffset: true,
      polygonOffsetFactor: -2
    });
    const puddleMesh = new THREE.Mesh(puddleGeo, puddleMat);
    puddleMesh.rotation.x = -Math.PI / 2;
    puddleGroup.add(puddleMesh);

    // Concentric animated ripple ring
    const ripGeo = new THREE.RingGeometry(11, 12.4, 32);
    const ripMat = new THREE.MeshBasicMaterial({ color: 0x7dd3fc, side: THREE.DoubleSide, transparent: true, opacity: 0.65 });
    const ripMesh = new THREE.Mesh(ripGeo, ripMat);
    ripMesh.rotation.x = -Math.PI / 2;
    puddleGroup.add(ripMesh);
    ripMesh.userData.dynamic = true;
    puddleGroup.userData.ripple = ripMesh;

    const puddleBadge = this.createBadgeSprite('🌊 WATERLOGGING 8.5cm | DRAIN TICKET #044 DISPATCHED', 'rgba(15, 23, 42, 0.94)', '#0ea5e9', '#7dd3fc');
    puddleBadge.position.set(0, 9.5, 0);
    puddleGroup.add(puddleBadge);

    this.civicGroup.add(puddleGroup);
    this.puddle = puddleGroup;

    // =========================================================================
    // 4. PHYSICAL SMART POLE PROTOTYPE (100% Authentic to User's College Lab Photo)
    // =========================================================================
    const poleGroup = new THREE.Group();
    poleGroup.position.set(76, 1.0, -76); // NE sidewalk corner apron

    // Layer 1: Translucent White/Grey Laboratory Support Base Container
    const crateMat = new THREE.MeshLambertMaterial({ color: 0xdbeafe, transparent: true, opacity: 0.75 });
    const crate = new THREE.Mesh(new THREE.BoxGeometry(16, 2.2, 16), crateMat);
    crate.position.y = 1.1;
    poleGroup.add(crate);

    // Layer 2: Dark Wooden Support Base Platform Board
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x3d271d }); // Dark walnut wood
    const woodPlatform = new THREE.Mesh(new THREE.BoxGeometry(14, 1.0, 14), woodMat);
    woodPlatform.position.y = 2.7;
    poleGroup.add(woodPlatform);

    // Layer 3: Circular 8-Bolt Industrial Mounting Flange Collar
    const flangeMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.7, roughness: 0.35 });
    const baseFlange = new THREE.Mesh(new THREE.CylinderGeometry(4.8, 5.2, 1.2, 24), flangeMat);
    baseFlange.position.y = 3.8;
    poleGroup.add(baseFlange);

    // 8 Industrial Hex Stud Bolts with Washers around bottom flange
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const bx = Math.cos(ang) * 4.0;
      const bz = Math.sin(ang) * 4.0;
      const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 1.2, 8), flangeMat);
      bolt.position.set(bx, 4.4, bz);
      poleGroup.add(bolt);
    }

    // Layer 4: Vertical Cylindrical Grey Industrial UPVC Mast
    const mastMat = new THREE.MeshLambertMaterial({ color: 0x8b99a6 }); // Authentic UPVC plumbing grey
    const mastGeo = new THREE.CylinderGeometry(1.85, 1.85, 52, 20);
    const mastMesh = new THREE.Mesh(mastGeo, mastMat);
    mastMesh.position.y = 30.4;
    mastMesh.castShadow = true;
    poleGroup.add(mastMesh);

    // Layer 5: Upper Sensor Cutout Slot (MQ-135 Gas / AQI + RCWL-0516 Radar)
    const slot1 = new THREE.Mesh(new THREE.BoxGeometry(2.5, 4.5, 2.5), new THREE.MeshLambertMaterial({ color: 0x0f172a }));
    slot1.position.set(0, 39, 0.8);
    poleGroup.add(slot1);
    // MQ-135 Perforated Stainless Steel Sensor Canister
    const sensorCanister = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 1.8, 12), flangeMat);
    sensorCanister.position.set(0, 39.5, 1.8);
    poleGroup.add(sensorCanister);
    // Mini Radar PCB Board
    const radarBoard = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.8), new THREE.MeshBasicMaterial({ color: 0x0284c7 }));
    radarBoard.position.set(0, 37.6, 2.1);
    poleGroup.add(radarBoard);

    // Layer 6: Lower Interactive Cutout Slot (0.96" OLED Display & 112 SOS Button)
    const slot2 = new THREE.Mesh(new THREE.BoxGeometry(2.5, 6.0, 2.5), new THREE.MeshLambertMaterial({ color: 0x0f172a }));
    slot2.position.set(0, 22, 0.8);
    poleGroup.add(slot2);
    // Illuminated OLED Screen with Real-Time Telemetry Readout
    const oledScreen = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 2.5), new THREE.MeshBasicMaterial({ color: 0x22c55e }));
    oledScreen.position.set(0, 23.4, 2.1);
    poleGroup.add(oledScreen);
    // Red 112 SOS Panic Emergency Button with White Bezel
    const sosBezel = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.3, 16).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    sosBezel.position.set(0, 20.2, 2.05);
    poleGroup.add(sosBezel);
    const sosBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.6, 16).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    sosBtn.position.set(0, 20.2, 2.2);
    poleGroup.add(sosBtn);

    // Layer 7: Downward 90° Curved UPVC Streetlight Elbow
    const elbowArm = new THREE.Mesh(new THREE.CylinderGeometry(1.65, 1.65, 11, 16), mastMat);
    elbowArm.rotation.z = Math.PI / 2;
    elbowArm.position.set(-5.5, 53, 0);
    poleGroup.add(elbowArm);

    const elbowDrop = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.9, 6.5, 16), mastMat);
    elbowDrop.position.set(-11, 50, 0);
    poleGroup.add(elbowDrop);

    // Downward Frosted High-CRI LED Luminaire Bulb
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(2.3, 16, 16), new THREE.MeshBasicMaterial({ color: 0xfffbeb }));
    bulb.position.set(-11, 46.2, 0);
    poleGroup.add(bulb);

    // Soft Warm Downward Streetlight Beam Mesh (Conical illumination on sidewalk)
    const coneGeo = new THREE.CylinderGeometry(1.6, 16.0, 44, 16, 1, true);
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.13,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const lightCone = new THREE.Mesh(coneGeo, coneMat);
    lightCone.position.set(-11, 24, 0);
    poleGroup.add(lightCone);

    // Warm circular illumination pool on the sidewalk apron
    const groundPoolGeo = new THREE.CircleGeometry(16.5, 24);
    const groundPoolMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.20,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const groundPool = new THREE.Mesh(groundPoolGeo, groundPoolMat);
    groundPool.rotation.x = -Math.PI / 2;
    groundPool.position.set(-11, 0.22, 0);
    poleGroup.add(groundPool);

    // 360° NeoPixel Addressable Strobe Ring around Elbow Collar
    const strobeRingGeo = new THREE.TorusGeometry(2.6, 0.6, 8, 24);
    const strobeRingMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    const strobeRing = new THREE.Mesh(strobeRingGeo, strobeRingMat);
    strobeRing.position.set(-11, 52.8, 0);
    strobeRing.rotation.x = Math.PI / 2;
    poleGroup.add(strobeRing);
    poleGroup.userData.strobeRing = strobeRing;

    // Layer 8: Top 4-Bolt Circular Mounting Flange
    const topFlange = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.4, 1.0, 20), flangeMat);
    topFlange.position.y = 56.5;
    poleGroup.add(topFlange);

    // Layer 9: Dark Wooden Solar Platform Canopy Board (Square Top Plate)
    const solarPlatform = new THREE.Mesh(new THREE.BoxGeometry(19, 1.0, 19), woodMat);
    solarPlatform.position.y = 57.5;
    poleGroup.add(solarPlatform);

    // Layer 10: High-Resolution 36-Cell Polycrystalline Solar PV Panel
    const solarTex = this.createSolarPanelTexture();
    const solarMat = new THREE.MeshLambertMaterial({ map: solarTex });
    const pvPanel = new THREE.Mesh(new THREE.PlaneGeometry(18, 18), solarMat);
    pvPanel.rotation.x = -Math.PI / 2;
    pvPanel.position.y = 58.05;
    poleGroup.add(pvPanel);

    // Overhead 3D Smart Pole Badge
    const poleBadge = this.createBadgeSprite('⚡ SMART POLE IOT | SOLAR + AQI + 112 SOS', 'rgba(15, 23, 42, 0.95)', '#38bdf8', '#7dd3fc');
    poleBadge.position.set(0, 61.5, 0);
    poleGroup.add(poleBadge);

    this.civicGroup.add(poleGroup);
    this.smartPole = poleGroup;
  }
\n"""

new_code = code[:idx1] + new_civic + code[idx2:]
with open('frontend/js/rendering/ThreeScene.js', 'w', encoding='utf-8') as f:
    f.write(new_code)

print("Part 2: Photorealistic Civic Infrastructure & Authentic Smart Pole updated successfully!")
