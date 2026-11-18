import re

with open('frontend/js/rendering/ThreeScene.js', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Update init() to create the SkyDome and adjust fog
init_fog_target = """    // 1. Scene & Atmosphere
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a101d);
    this.scene.fog = new THREE.FogExp2(0x0a101d, 0.0008);"""

init_fog_repl = """    // 1. Scene & Atmospheric Celestial Environment
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a1428);
    this.scene.fog = new THREE.FogExp2(0x0d1a33, 0.00062);
    this.createSkyDome();"""

assert init_fog_target in code, "init_fog_target not found"
code = code.replace(init_fog_target, init_fog_repl, 1)

# 2. Update initLighting
lighting_target = """  initLighting() {
    // Ambient City Light
    const ambientLight = new THREE.AmbientLight(0x38bdf8, 0.7);
    this.scene.add(ambientLight);

    // Hemisphere Light
    const hemiLight = new THREE.HemisphereLight(0x60a5fa, 0x0f172a, 0.75);
    this.scene.add(hemiLight);

    // Directional Sunlight (Optimized without heavy shadow maps)
    const sunLight = new THREE.DirectionalLight(0xffedd5, 1.7);
    sunLight.position.set(-280, 550, -200);
    sunLight.castShadow = false;
    this.scene.add(sunLight);
  }"""

lighting_repl = """  initLighting() {
    // Soft Ambient Atmospheric Fill
    const ambientLight = new THREE.AmbientLight(0x94a3b8, 0.85);
    this.scene.add(ambientLight);

    // Realistic Hemisphere Light (Cool Sky Dome to Dark Ground Asphalt)
    const hemiLight = new THREE.HemisphereLight(0x7dd3fc, 0x0f172a, 0.9);
    this.scene.add(hemiLight);

    // Directional Sun/Moonlight with Crisp Specular Highlights
    const sunLight = new THREE.DirectionalLight(0xfff1e6, 1.95);
    sunLight.position.set(-320, 580, -240);
    sunLight.castShadow = false;
    this.scene.add(sunLight);
  }"""

assert lighting_target in code, "lighting_target not found"
code = code.replace(lighting_target, lighting_repl, 1)

# 3. Add createSkyDome, createSolarPanelTexture, createCardboardTexture, createTrafficCone methods
new_methods = """  // Creates Celestial Skydome with Horizon Atmosphere & Distant Skyline Silhouette
  createSkyDome() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Smooth Atmospheric Zenith-to-Horizon Gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0.0, '#020617'); // Space zenith
    grad.addColorStop(0.3, '#081226'); // High twilight indigo
    grad.addColorStop(0.65, '#0f2244'); // Deep atmospheric navy
    grad.addColorStop(0.85, '#1e3860'); // Warm horizon dusk band
    grad.addColorStop(0.96, '#2a4875'); // Skyline haze
    grad.addColorStop(1.0, '#0f1c30'); // Ground blend
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 512);

    // Subtle Celestial Star Clusters in upper celestial hemisphere
    for (let i = 0; i < 320; i++) {
      const sx = Math.random() * 1024;
      const sy = Math.random() * 240; // Upper sky only
      const r = 0.5 + Math.random() * 1.3;
      const alpha = 0.35 + Math.random() * 0.65;
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Distant City Skyline Silhouettes along the Horizon (440 - 485px)
    ctx.fillStyle = 'rgba(7, 13, 26, 0.85)';
    let bx = 0;
    while (bx < 1024) {
      const bw = 14 + Math.random() * 32;
      const bh = 18 + Math.random() * 45;
      ctx.fillRect(bx, 485 - bh, bw, bh);

      // Micro illuminated window slits on distant skyline towers
      if (Math.random() > 0.35) {
        ctx.fillStyle = 'rgba(254, 240, 138, 0.45)';
        for (let wy = 485 - bh + 5; wy < 480; wy += 7) {
          if (Math.random() > 0.45) ctx.fillRect(bx + 4, wy, 2.5, 3.5);
          if (Math.random() > 0.45 && bw > 22) ctx.fillRect(bx + bw - 6, wy, 2.5, 3.5);
        }
        ctx.fillStyle = 'rgba(7, 13, 26, 0.85)';
      }
      bx += bw + (Math.random() * 6);
    }

    const tex = new THREE.CanvasTexture(canvas);
    const skyGeo = new THREE.SphereGeometry(2400, 32, 16);
    const skyMat = new THREE.MeshBasicMaterial({
      map: tex,
      side: THREE.BackSide,
      fog: false
    });
    const skyMesh = new THREE.Mesh(skyGeo, skyMat);
    skyMesh.userData.dynamic = false;
    this.scene.add(skyMesh);
    this.skyMesh = skyMesh;
  }

  // Creates Realistic Monocrystalline Solar PV Panel Texture with Silver Busbars
  createSolarPanelTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Dark polycrystalline deep indigo base
    ctx.fillStyle = '#081a33';
    ctx.fillRect(0, 0, 512, 512);

    // 6x6 Photovoltaic cells
    const cSize = 512 / 6;
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        const x = c * cSize;
        const y = r * cSize;

        const cellGrad = ctx.createLinearGradient(x, y, x + cSize, y + cSize);
        cellGrad.addColorStop(0, '#10335e');
        cellGrad.addColorStop(0.5, '#0b2344');
        cellGrad.addColorStop(1, '#07172f');
        ctx.fillStyle = cellGrad;
        ctx.fillRect(x + 2, y + 2, cSize - 4, cSize - 4);

        // Silver micro-grid fingers
        ctx.strokeStyle = 'rgba(203, 213, 225, 0.32)';
        ctx.lineWidth = 1;
        for (let gx = x + 7; gx < x + cSize - 4; gx += 7) {
          ctx.beginPath();
          ctx.moveTo(gx, y + 2);
          ctx.lineTo(gx, y + cSize - 2);
          ctx.stroke();
        }

        // Main primary silver busbars
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(x + cSize * 0.33, y + 2);
        ctx.lineTo(x + cSize * 0.33, y + cSize - 2);
        ctx.moveTo(x + cSize * 0.67, y + 2);
        ctx.lineTo(x + cSize * 0.67, y + cSize - 2);
        ctx.stroke();

        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, cSize, cSize);
      }
    }

    // Outer anodized aluminum frame
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 8;
    ctx.strokeRect(0, 0, 512, 512);

    return new THREE.CanvasTexture(canvas);
  }

  // Creates Realistic Corrugated Shipping Cardboard Parcel Texture
  createCardboardTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#b47e43';
    ctx.fillRect(0, 0, 256, 256);

    const img = ctx.getImageData(0, 0, 256, 256);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() - 0.5) * 22;
      d[i] = Math.max(120, Math.min(215, d[i] + n));
      d[i + 1] = Math.max(80, Math.min(165, d[i + 1] + n * 0.8));
      d[i + 2] = Math.max(40, Math.min(105, d[i + 2] + n * 0.5));
    }
    ctx.putImageData(img, 0, 0);

    // Amber packaging packing tape
    ctx.fillStyle = 'rgba(217, 119, 6, 0.75)';
    ctx.fillRect(0, 110, 256, 36);

    // White shipping label with barcode
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(45, 42, 85, 52);
    ctx.fillStyle = '#000000';
    for (let bx = 52; bx < 122; bx += 4) {
      ctx.fillRect(bx, 50, Math.random() > 0.4 ? 2.5 : 1.5, 26);
    }
    ctx.font = 'bold 8px monospace';
    ctx.fillText('MUNICIPAL SWM', 50, 86);

    return new THREE.CanvasTexture(canvas);
  }

  // Creates Municipal High-Visibility PWD Traffic Safety Cone
  createTrafficCone() {
    const group = new THREE.Group();
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(4.4, 0.6, 4.4),
      new THREE.MeshLambertMaterial({ color: 0x111827 })
    );
    base.position.y = 0.3;
    group.add(base);

    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(1.6, 7.8, 14),
      new THREE.MeshLambertMaterial({ color: 0xf97316 })
    );
    cone.position.y = 4.2;
    group.add(cone);

    const collar = new THREE.Mesh(
      new THREE.CylinderGeometry(1.0, 1.28, 2.2, 14),
      new THREE.MeshBasicMaterial({ color: 0xf8fafc })
    );
    collar.position.y = 4.4;
    group.add(collar);

    return group;
  }
"""

method_target = "  // Creates procedural aggregate asphalt texture with tire-wear tracks & bituminous grain"
assert method_target in code, "method_target not found"
code = code.replace(method_target, new_methods + "\n" + method_target, 1)

# 4. Upgrade addHeadlights to add forward volumetric light cones and road illumination
headlight_target = """  // Helper: Adds dual front LED headlights
  addHeadlights(group, x, y, z) {
    const hl1 = new THREE.Mesh(this.geoPool.headlight, this.matPool.headlight);
    hl1.position.set(x, y, z);
    const hl2 = new THREE.Mesh(this.geoPool.headlight, this.matPool.headlight);
    hl2.position.set(x, y, -z);
    group.add(hl1);
    group.add(hl2);
  }"""

headlight_repl = """  // Helper: Adds dual front LED headlights with realistic forward light beam cones & ground illumination
  addHeadlights(group, x, y, z) {
    const hl1 = new THREE.Mesh(this.geoPool.headlight, this.matPool.headlight);
    hl1.position.set(x, y, z);
    const hl2 = new THREE.Mesh(this.geoPool.headlight, this.matPool.headlight);
    hl2.position.set(x, y, -z);
    group.add(hl1);
    group.add(hl2);

    if (!this.geoPool.headlightBeam) {
      this.geoPool.headlightBeam = new THREE.CylinderGeometry(0.9, 7.5, 34, 10, 1, true).rotateZ(-Math.PI / 2);
      this.matPool.headlightBeam = new THREE.MeshBasicMaterial({
        color: 0xfff7ed,
        transparent: true,
        opacity: 0.12,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      this.geoPool.headlightSpot = new THREE.PlaneGeometry(14, 28);
      this.matPool.headlightSpot = new THREE.MeshBasicMaterial({
        color: 0xffedd5,
        transparent: true,
        opacity: 0.16,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
    }

    const beam1 = new THREE.Mesh(this.geoPool.headlightBeam, this.matPool.headlightBeam);
    beam1.position.set(x + 17, y - 1.0, z);
    beam1.rotation.y = -0.05;
    group.add(beam1);

    const beam2 = new THREE.Mesh(this.geoPool.headlightBeam, this.matPool.headlightBeam);
    beam2.position.set(x + 17, y - 1.0, -z);
    beam2.rotation.y = 0.05;
    group.add(beam2);

    const spot = new THREE.Mesh(this.geoPool.headlightSpot, this.matPool.headlightSpot);
    spot.rotation.x = -Math.PI / 2;
    spot.rotation.z = Math.PI / 2;
    spot.position.set(x + 30, 0.32, 0);
    group.add(spot);
  }"""

assert headlight_target in code, "headlight_target not found"
code = code.replace(headlight_target, headlight_repl, 1)

with open('frontend/js/rendering/ThreeScene.js', 'w', encoding='utf-8') as f:
    code = f.write(code)

print("Part 1: SkyDome, Lighting, and Headlight Volumetric Beams updated successfully!")
