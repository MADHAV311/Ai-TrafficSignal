import os

file_path = 'frontend/js/rendering/ThreeScene.js'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add this.initCivicInfrastructure(); in init()
target_init = '    this.initPoleSirens();'
replacement_init = '''    this.initPoleSirens();

    // 10b. 3D Civic Health & Sustainable Infrastructure (Potholes, Waste & Smart Pole)
    this.initCivicInfrastructure();'''

if target_init in content:
    content = content.replace(target_init, replacement_init, 1)
    print("Added this.initCivicInfrastructure() in init()")
else:
    print("Could not find target_init!")
    exit(1)

# 2. Add texture generators & initCivicInfrastructure() after createDrainGrateTexture()
target_after_drain = '''    return new THREE.CanvasTexture(canvas);
  }

  initGroundAndRoads() {'''

civic_methods = '''    return new THREE.CanvasTexture(canvas);
  }

  // Procedural Ragged Asphalt Pothole Texture with Radial Fissure Cracks
  createPotholeTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Outer crater perimeter
    ctx.fillStyle = '#0a0f18';
    ctx.beginPath();
    const cx = 128, cy = 128, baseR = 95;
    for (let a = 0; a < Math.PI * 2; a += 0.15) {
      const r = baseR + (Math.sin(a * 7) * 12) + (Math.cos(a * 13) * 8);
      const px = cx + Math.cos(a) * r;
      const py = cy + Math.sin(a) * r;
      if (a === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    // Inner deep pit (dark asphalt cavity)
    ctx.fillStyle = '#020408';
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 2; a += 0.2) {
      const r = 55 + (Math.sin(a * 5) * 8) + (Math.cos(a * 9) * 6);
      const px = cx + Math.cos(a) * r;
      const py = cy + Math.sin(a) * r;
      if (a === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    // Radial jagged crack lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + (Math.random() * 0.2);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 70, cy + Math.sin(a) * 70);
      ctx.lineTo(cx + Math.cos(a) * 124, cy + Math.sin(a) * 124);
      ctx.stroke();
    }

    // Broken aggregate gravel rubble
    for (let i = 0; i < 40; i++) {
      const dist = Math.random() * 85;
      const ang = Math.random() * Math.PI * 2;
      ctx.fillStyle = Math.random() > 0.5 ? '#334155' : '#475569';
      ctx.beginPath();
      ctx.arc(cx + Math.cos(ang) * dist, cy + Math.sin(ang) * dist, 1.5 + Math.random() * 2, 0, Math.PI * 2);
      ctx.fill();
    }

    return new THREE.CanvasTexture(canvas);
  }

  // Realistic Water Puddle Texture with Specular Sheen
  createPuddleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(128, 128, 20, 128, 128, 120);
    grad.addColorStop(0, 'rgba(14, 165, 233, 0.85)');
    grad.addColorStop(0.65, 'rgba(2, 132, 199, 0.55)');
    grad.addColorStop(0.9, 'rgba(3, 105, 161, 0.2)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(128, 128, 115, 80, Math.PI / 6, 0, Math.PI * 2);
    ctx.fill();

    return new THREE.CanvasTexture(canvas);
  }

  // Overhead 3D Floating Canvas Badge
  createBadgeSprite(text, bgHex = 'rgba(15, 23, 42, 0.9)', borderHex = '#F59E0B', textHex = '#FBBF24') {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Rounded pill
    ctx.fillStyle = bgHex;
    ctx.strokeStyle = borderHex;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(8, 8, 496, 112, 24);
    ctx.fill();
    ctx.stroke();

    // Text
    ctx.fillStyle = textHex;
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 64);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(40, 10, 1);
    return sprite;
  }

  // Initialize 3D Civic & Sustainable Infrastructure
  initCivicInfrastructure() {
    this.civicGroup = new THREE.Group();
    this.scene.add(this.civicGroup);

    // =========================================================================
    // 1. ROAD POTHOLES (Road A & Road C)
    // =========================================================================
    const potholeTex = this.createPotholeTexture();

    // Pothole #1 (Critical Severity) on Road A (North approach, Lane 1: x = 17.5, z = -140)
    const pot1Group = new THREE.Group();
    pot1Group.position.set(17.5, 0.12, -140);

    const pot1Geo = new THREE.PlaneGeometry(24, 24);
    const pot1Mat = new THREE.MeshLambertMaterial({ map: potholeTex, transparent: true, polygonOffset: true, polygonOffsetFactor: -3 });
    const pot1Mesh = new THREE.Mesh(pot1Geo, pot1Mat);
    pot1Mesh.rotation.x = -Math.PI / 2;
    pot1Group.add(pot1Mesh);

    // Glowing inspection halo
    const halo1Geo = new THREE.RingGeometry(13.5, 15.0, 32);
    const halo1Mat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
    const halo1Mesh = new THREE.Mesh(halo1Geo, halo1Mat);
    halo1Mesh.rotation.x = -Math.PI / 2;
    halo1Mesh.position.y = 0.05;
    pot1Group.add(halo1Mesh);
    pot1Group.userData.halo = halo1Mesh;

    // Overhead 3D label
    const pot1Badge = this.createBadgeSprite('🕳️ POTHOLE #104 | 28cm | PWD ACTIVE', 'rgba(15, 23, 42, 0.92)', '#f59e0b', '#fbbf24');
    pot1Badge.position.set(0, 18, 0);
    pot1Group.add(pot1Badge);

    this.civicGroup.add(pot1Group);
    this.pothole1 = pot1Group;

    // Pothole #2 (Moderate Severity) on Road C (South approach, Lane 2: x = -52.5, z = 95)
    const pot2Group = new THREE.Group();
    pot2Group.position.set(-52.5, 0.12, 95);

    const pot2Geo = new THREE.PlaneGeometry(16, 16);
    const pot2Mat = new THREE.MeshLambertMaterial({ map: potholeTex, transparent: true, polygonOffset: true, polygonOffsetFactor: -3 });
    const pot2Mesh = new THREE.Mesh(pot2Geo, pot2Mat);
    pot2Mesh.rotation.x = -Math.PI / 2;
    pot2Group.add(pot2Mesh);

    const halo2Geo = new THREE.RingGeometry(9.5, 10.8, 32);
    const halo2Mat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
    const halo2Mesh = new THREE.Mesh(halo2Geo, halo2Mat);
    halo2Mesh.rotation.x = -Math.PI / 2;
    halo2Mesh.position.y = 0.05;
    pot2Group.add(halo2Mesh);
    pot2Group.userData.halo = halo2Mesh;

    const pot2Badge = this.createBadgeSprite('🕳️ POTHOLE #108 | 16cm | PWD LOGGED', 'rgba(15, 23, 42, 0.92)', '#38bdf8', '#7dd3fc');
    pot2Badge.position.set(0, 16, 0);
    pot2Group.add(pot2Badge);

    this.civicGroup.add(pot2Group);
    this.pothole2 = pot2Group;

    // =========================================================================
    // 2. MUNICIPAL RECYCLING BIN & ROADSIDE LITTER CLUSTER
    // =========================================================================
    const wasteGroup = new THREE.Group();
    wasteGroup.position.set(-78, 1.0, -78); // NW sidewalk corner plaza

    // Green Municipal Waste Receptacle
    const binGeo = new THREE.CylinderGeometry(3.6, 3.2, 9.0, 14);
    const binMat = new THREE.MeshLambertMaterial({ color: 0x16a34a });
    const binMesh = new THREE.Mesh(binGeo, binMat);
    binMesh.position.y = 4.5;
    binMesh.castShadow = true;
    wasteGroup.add(binMesh);

    // Yellow Hinged Lid
    const lidGeo = new THREE.CylinderGeometry(3.9, 3.8, 1.2, 14);
    const lidMat = new THREE.MeshLambertMaterial({ color: 0xfacc15 });
    const lidMesh = new THREE.Mesh(lidGeo, lidMat);
    lidMesh.position.y = 9.4;
    wasteGroup.add(lidMesh);

    // Litter cluster around bin: Cardboard boxes, crumpled paper, plastic bottles
    const boxMat = new THREE.MeshLambertMaterial({ color: 0xb45309 });
    const b1 = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.4, 2.8), boxMat);
    b1.position.set(4.2, 1.2, 1.5);
    b1.rotation.y = 0.35;
    wasteGroup.add(b1);

    const b2 = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.8, 2.2), boxMat);
    b2.position.set(-3.8, 0.9, 3.2);
    b2.rotation.y = -0.5;
    wasteGroup.add(b2);

    // Plastic bottle debris (translucent cyan)
    const botMat = new THREE.MeshLambertMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.85 });
    for (let i = 0; i < 5; i++) {
      const bot = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.8, 8), botMat);
      bot.position.set(2.5 + (Math.random() * 4), 0.5, -2 + (Math.random() * 4));
      bot.rotation.z = Math.PI / 2;
      bot.rotation.y = Math.random() * Math.PI;
      wasteGroup.add(bot);
    }

    // Overhead 3D label
    const wasteBadge = this.createBadgeSprite('🗑️ OVERFLOWING BIN (24m) | SWM SLA ACTIVE', 'rgba(15, 23, 42, 0.92)', '#10b981', '#34d399');
    wasteBadge.position.set(0, 18, 0);
    wasteGroup.add(wasteBadge);

    this.civicGroup.add(wasteGroup);
    this.wasteStation = wasteGroup;

    // =========================================================================
    // 3. URBAN WATERLOGGING PUDDLE (South Crosswalk Gutter)
    // =========================================================================
    const puddleGroup = new THREE.Group();
    puddleGroup.position.set(65, 0.14, 70);

    const puddleTex = this.createPuddleTexture();
    const puddleGeo = new THREE.PlaneGeometry(28, 20);
    const puddleMat = new THREE.MeshStandardMaterial({
      map: puddleTex,
      color: 0x0284c7,
      roughness: 0.05,
      metalness: 0.92,
      transparent: true,
      opacity: 0.82
    });
    const puddleMesh = new THREE.Mesh(puddleGeo, puddleMat);
    puddleMesh.rotation.x = -Math.PI / 2;
    puddleGroup.add(puddleMesh);

    // Concentric ripple ring
    const ripGeo = new THREE.RingGeometry(11, 12.2, 32);
    const ripMat = new THREE.MeshBasicMaterial({ color: 0x7dd3fc, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
    const ripMesh = new THREE.Mesh(ripGeo, ripMat);
    ripMesh.rotation.x = -Math.PI / 2;
    puddleGroup.add(ripMesh);
    puddleGroup.userData.ripple = ripMesh;

    const puddleBadge = this.createBadgeSprite('🌊 WATERLOGGING 8.5cm | DRAIN TICKET #044', 'rgba(15, 23, 42, 0.92)', '#0ea5e9', '#7dd3fc');
    puddleBadge.position.set(0, 16, 0);
    puddleGroup.add(puddleBadge);

    this.civicGroup.add(puddleGroup);
    this.puddle = puddleGroup;

    // =========================================================================
    // 4. PHYSICAL SMART POLE PROTOTYPE (Matching User's College Lab Photo!)
    // =========================================================================
    const poleGroup = new THREE.Group();
    poleGroup.position.set(76, 1.0, -76); // NE sidewalk corner apron

    // Bolted Flanged Base Plate
    const basePlate = new THREE.Mesh(new THREE.BoxGeometry(9, 1.2, 9), new THREE.MeshLambertMaterial({ color: 0x334155 }));
    basePlate.position.y = 0.6;
    poleGroup.add(basePlate);

    // 4 Corner Bolts
    const boltMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 });
    const boltOffsets = [[-3.5, -3.5], [3.5, -3.5], [-3.5, 3.5], [3.5, 3.5]];
    boltOffsets.forEach(([bx, bz]) => {
      const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 1.0, 8), boltMat);
      bolt.position.set(bx, 1.3, bz);
      poleGroup.add(bolt);
    });

    // Vertical Cylindrical Grey PVC Mast
    const mastGeo = new THREE.CylinderGeometry(1.8, 1.8, 54, 16);
    const mastMat = new THREE.MeshLambertMaterial({ color: 0x94a3b8 }); // Industrial grey
    const mastMesh = new THREE.Mesh(mastGeo, mastMat);
    mastMesh.position.y = 28;
    mastMesh.castShadow = true;
    poleGroup.add(mastMesh);

    // Upper Slot: MQ-135 AQI & RCWL-0516 Radar
    const slot1 = new THREE.Mesh(new THREE.BoxGeometry(2.4, 4.0, 2.4), new THREE.MeshLambertMaterial({ color: 0x0f172a }));
    slot1.position.set(0, 38, 0.8);
    poleGroup.add(slot1);
    const sensorPcb = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.6, 0.6), new THREE.MeshBasicMaterial({ color: 0x0284c7 }));
    sensorPcb.position.set(0, 38, 1.8);
    poleGroup.add(sensorPcb);

    // Lower Slot: 0.96" OLED Display & 112 SOS Button
    const slot2 = new THREE.Mesh(new THREE.BoxGeometry(2.4, 5.5, 2.4), new THREE.MeshLambertMaterial({ color: 0x0f172a }));
    slot2.position.set(0, 22, 0.8);
    poleGroup.add(slot2);
    // Glowing OLED Screen
    const oledScreen = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 2.4), new THREE.MeshBasicMaterial({ color: 0x22c55e }));
    oledScreen.position.set(0, 23.2, 2.05);
    poleGroup.add(oledScreen);
    // Red SOS Button
    const sosBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.6, 12), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    sosBtn.rotation.x = Math.PI / 2;
    sosBtn.position.set(0, 20.4, 2.1);
    poleGroup.add(sosBtn);

    // Downward Curved Streetlight Elbow
    const elbowArm = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 12, 12), mastMat);
    elbowArm.rotation.z = Math.PI / 2;
    elbowArm.position.set(-6, 52, 0);
    poleGroup.add(elbowArm);

    const elbowDrop = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 6, 12), mastMat);
    elbowDrop.position.set(-11, 49, 0);
    poleGroup.add(elbowDrop);

    // High-CRI LED Luminaire Bulb
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(2.4, 16, 16), new THREE.MeshBasicMaterial({ color: 0xfffbeb }));
    bulb.position.set(-11, 45, 0);
    poleGroup.add(bulb);

    const streetLight = new THREE.PointLight(0xfffbeb, 1.5, 140, 1.2);
    streetLight.position.set(-11, 44, 0);
    poleGroup.add(streetLight);

    // 360° NeoPixel Addressable Strobe Ring around Elbow
    const strobeRingGeo = new THREE.TorusGeometry(2.6, 0.6, 8, 24);
    const strobeRingMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const strobeRing = new THREE.Mesh(strobeRingGeo, strobeRingMat);
    strobeRing.position.set(-11, 51.5, 0);
    strobeRing.rotation.x = Math.PI / 2;
    poleGroup.add(strobeRing);
    poleGroup.userData.strobeRing = strobeRing;

    // Top Solar Platform & Canopy
    const solarPlate = new THREE.Mesh(new THREE.BoxGeometry(18, 0.8, 18), new THREE.MeshLambertMaterial({ color: 0x1e293b }));
    solarPlate.position.y = 55.4;
    poleGroup.add(solarPlate);

    const pvCell = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), new THREE.MeshBasicMaterial({ color: 0x1e3a8a }));
    pvCell.rotation.x = -Math.PI / 2;
    pvCell.position.y = 55.9;
    poleGroup.add(pvCell);

    // Overhead 3D Smart Pole Badge
    const poleBadge = this.createBadgeSprite('⚡ SMART POLE IOT | SOLAR + AQI + 112 SOS', 'rgba(15, 23, 42, 0.95)', '#38bdf8', '#7dd3fc');
    poleBadge.position.set(0, 64, 0);
    poleGroup.add(poleBadge);

    this.civicGroup.add(poleGroup);
    this.smartPole = poleGroup;
  }
'''

replacement_drain = civic_methods + '\n\n  initGroundAndRoads() {'
if target_after_drain in content:
    content = content.replace(target_after_drain, replacement_drain, 1)
    print("Added createPotholeTexture, createPuddleTexture, createBadgeSprite, initCivicInfrastructure")
else:
    print("Could not find target_after_drain!")
    exit(1)

# 3. Add dynamic animations & vehicle speed damping in update(sim)
target_update_end = '''    // 6. Crosswalk Scramble Color
    const isScramble = Boolean(sim.scrambleActive || (sim.pedestrians && sim.pedestrians.isScrambleActive));
    if (this.crosswalkGroup) {
      this.crosswalkGroup.children.forEach(stripe => {
        stripe.material.color.setHex(isScramble ? 0x22c55e : 0xf8fafc);
      });
    }

    // 7. Render 3D Scene
    this.renderer.render(this.scene, this.camera);'''

replacement_update_end = '''    // 6. Crosswalk Scramble Color
    const isScramble = Boolean(sim.scrambleActive || (sim.pedestrians && sim.pedestrians.isScrambleActive));
    if (this.crosswalkGroup) {
      this.crosswalkGroup.children.forEach(stripe => {
        stripe.material.color.setHex(isScramble ? 0x22c55e : 0xf8fafc);
      });
    }

    // 6b. Civic & Sustainable Infrastructure Dynamic Pulse & Vehicle Damping
    if (this.civicGroup) {
      const pulse = 0.7 + Math.sin(Date.now() * 0.006) * 0.3;
      if (this.pothole1 && this.pothole1.userData.halo) {
        this.pothole1.userData.halo.material.opacity = pulse;
        this.pothole1.userData.halo.scale.setScalar(0.95 + pulse * 0.1);
      }
      if (this.pothole2 && this.pothole2.userData.halo) {
        this.pothole2.userData.halo.material.opacity = pulse * 0.8;
      }
      if (this.puddle && this.puddle.userData.ripple) {
        const rip = (Date.now() * 0.002) % 1;
        this.puddle.userData.ripple.scale.setScalar(0.7 + rip * 0.6);
        this.puddle.userData.ripple.material.opacity = 0.8 * (1 - rip);
      }
      if (this.smartPole && this.smartPole.userData.strobeRing) {
        const isAlert = sim.situationMode === 'POTHOLE_ALERT' || sim.situationMode === 'CIVIC_FULL';
        const isEmerg = sim.situationMode === 'AMBULANCE' || sim.situationMode === 'SEVERE_ACCIDENT';
        if (isEmerg) {
          const isRed = Math.sin(Date.now() * 0.015) > 0;
          this.smartPole.userData.strobeRing.material.color.setHex(isRed ? 0xef4444 : 0x3b82f6);
        } else if (isAlert) {
          this.smartPole.userData.strobeRing.material.color.setHex(pulse > 0.8 ? 0xf59e0b : 0x78350f);
        } else {
          this.smartPole.userData.strobeRing.material.color.setHex(0x10b981);
        }
      }
    }

    // 7. Render 3D Scene
    this.renderer.render(this.scene, this.camera);'''

if target_update_end in content:
    content = content.replace(target_update_end, replacement_update_end, 1)
    print("Added civic animation updates in update(sim)")
else:
    print("Could not find target_update_end!")
    exit(1)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("ThreeScene.js successfully updated with Civic 3D Infrastructure!")
