/**
 * Hand Gesture 3D - Computer Vision & Three.js Web Application
 * Real-time Hand Tracking via MediaPipe & Interactive 3D Rendering via Three.js
 */

// ==========================================
// 1. GLOBAL STATE & CONFIGURATION
// ==========================================
const CONFIG = {
  colors: {
    cyan: 0x00f0ff,
    magenta: 0xff007f,
    purple: 0x9d00ff,
    emerald: 0x00ffa3,
    gold: 0xffb700
  },
  defaultColor: 0x00f0ff,
  cameraZ: 5,
  minScale: 0.4,
  maxScale: 2.8,
  lerpSpeed: 0.12
};

const STATE = {
  activeFingerCount: 1,
  activeShapeType: 'cube', // 'cube', 'pyramid', 'cylinder', 'sphere', 'torus', 'frozen'
  isFrozen: false,
  isWireframe: false,
  isAutoRotate: true,
  currentColor: CONFIG.defaultColor,
  cameraMode: 'pip', // 'pip', 'transparent', 'dark'
  handDetected: false,
  targetPos: { x: 0, y: 0, z: 0 },
  targetRotation: { x: 0, y: 0, z: 0 },
  targetScale: 1.0,
  pinchActive: false,
  pinchDistance: 0,
  fps: 0
};

// Shape Definitions
const SHAPES_CONFIG = {
  0: { id: 'fist', name: 'Musht (Qulflangan)', subtitle: '0 barmoq: Harakat to\'xtatildi', color: 0xff3366 },
  1: { id: 'cube', name: 'Kub (Cube)', subtitle: '1 barmoq: Ko\'rsatkich', color: 0x00f0ff },
  2: { id: 'pyramid', name: 'Piramida (Pyramid)', subtitle: '2 barmoq: Victory', color: 0xff007f },
  3: { id: 'cylinder', name: 'Silindr (Cylinder)', subtitle: '3 barmoq: Uchlik', color: 0x00ffa3 },
  4: { id: 'sphere', name: 'Sfera (Sphere)', subtitle: '4 barmoq: To\'rtlik', color: 0xffb700 },
  5: { id: 'torus', name: 'Torus (Halqa)', subtitle: '5 barmoq: Ochiq kaft', color: 0x9d00ff }
};

// ==========================================
// 2. AUDIO SYNTHESIZER (Sci-Fi Sound FX)
// ==========================================
class SoundFX {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playMorphSound(freq = 440) {
    if (!this.enabled) return;
    this.init();
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      
      const now = this.ctx.currentTime;
      osc.frequency.setValueAtTime(freq * 0.7, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.15);
      
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(now);
      osc.stop(now + 0.25);
    } catch (e) {}
  }

  playPinchTick() {
    if (!this.enabled) return;
    this.init();
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      const now = this.ctx.currentTime;
      osc.frequency.setValueAtTime(800, now);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    } catch (e) {}
  }
}

const sfx = new SoundFX();

// ==========================================
// 3. THREE.JS 3D SCENE MANAGER
// ==========================================
class Scene3D {
  constructor() {
    this.container = document.getElementById('three-canvas');
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.container,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    // Scene & Camera
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, this.width / this.height, 0.1, 100);
    this.camera.position.z = CONFIG.cameraZ;

    // Groups
    this.shapesGroup = new THREE.Group();
    this.scene.add(this.shapesGroup);

    // Dynamic Lights
    this.setupLighting();

    // Background Particle Field
    this.setupParticles();

    // Cache of 3D Shape Objects
    this.shapes = {};
    this.currentMesh = null;
    this.createAllShapes();

    // Initial shape
    this.setShape(1);

    // Event listeners
    window.addEventListener('resize', () => this.onResize());
  }

  setupLighting() {
    // Ambient soft blue light
    const ambientLight = new THREE.AmbientLight(0x223355, 1.2);
    this.scene.add(ambientLight);

    // Main Key Light
    this.dirLight1 = new THREE.DirectionalLight(0xffffff, 1.8);
    this.dirLight1.position.set(5, 5, 5);
    this.scene.add(this.dirLight1);

    // Rim / Back light
    this.dirLight2 = new THREE.DirectionalLight(CONFIG.defaultColor, 2.0);
    this.dirLight2.position.set(-5, -5, -2);
    this.scene.add(this.dirLight2);

    // Object Center Glowing Point Light
    this.pointLight = new THREE.PointLight(CONFIG.defaultColor, 3, 10);
    this.pointLight.position.set(0, 0, 0);
    this.scene.add(this.pointLight);
  }

  setupParticles() {
    const particleCount = 600;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const color1 = new THREE.Color(0x00f0ff);
    const color2 = new THREE.Color(0xff007f);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20;

      const mixed = color1.clone().lerp(color2, Math.random());
      colors[i * 3] = mixed.r;
      colors[i * 3 + 1] = mixed.g;
      colors[i * 3 + 2] = mixed.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });

    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);
  }

  getMaterial(color, isWireframe = false) {
    return new THREE.MeshPhysicalMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.15,
      metalness: 0.7,
      roughness: 0.2,
      clearcoat: 0.9,
      clearcoatRoughness: 0.1,
      wireframe: isWireframe,
      transparent: true,
      opacity: isWireframe ? 0.9 : 0.92
    });
  }

  createWireframeEdges(geometry, color) {
    const edges = new THREE.EdgesGeometry(geometry);
    const line = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: color, linewidth: 2, transparent: true, opacity: 0.85 })
    );
    return line;
  }

  createAllShapes() {
    const baseColor = STATE.currentColor;

    // 1: Cube
    const cubeGeo = new THREE.BoxGeometry(1.4, 1.4, 1.4);
    const cubeMesh = new THREE.Mesh(cubeGeo, this.getMaterial(baseColor));
    cubeMesh.add(this.createWireframeEdges(cubeGeo, 0xffffff));
    this.shapes[1] = cubeMesh;

    // 2: Pyramid (Cone with 4 radial segments)
    const pyrGeo = new THREE.ConeGeometry(1.2, 1.8, 4);
    const pyrMesh = new THREE.Mesh(pyrGeo, this.getMaterial(baseColor));
    pyrMesh.add(this.createWireframeEdges(pyrGeo, 0xffffff));
    pyrMesh.rotation.y = Math.PI / 4;
    this.shapes[2] = pyrMesh;

    // 3: Cylinder
    const cylGeo = new THREE.CylinderGeometry(0.8, 0.8, 1.8, 32);
    const cylMesh = new THREE.Mesh(cylGeo, this.getMaterial(baseColor));
    cylMesh.add(this.createWireframeEdges(cylGeo, 0xffffff));
    this.shapes[3] = cylMesh;

    // 4: Sphere (Icosahedron high-poly)
    const sphGeo = new THREE.IcosahedronGeometry(1.1, 4);
    const sphMesh = new THREE.Mesh(sphGeo, this.getMaterial(baseColor));
    sphMesh.add(this.createWireframeEdges(new THREE.IcosahedronGeometry(1.1, 1), 0xffffff));
    this.shapes[4] = sphMesh;

    // 5: Torus (Halqa / Donut)
    const torGeo = new THREE.TorusGeometry(0.9, 0.35, 24, 48);
    const torMesh = new THREE.Mesh(torGeo, this.getMaterial(baseColor));
    torMesh.add(this.createWireframeEdges(torGeo, 0xffffff));
    this.shapes[5] = torMesh;

    // 0: Fist / Star Crystal (Octahedron with inner core)
    const octGeo = new THREE.OctahedronGeometry(1.2, 0);
    const octMesh = new THREE.Mesh(octGeo, this.getMaterial(0xff3366));
    octMesh.add(this.createWireframeEdges(octGeo, 0xffffff));
    this.shapes[0] = octMesh;
  }

  setShape(fingerCount) {
    const targetMesh = this.shapes[fingerCount] || this.shapes[1];
    if (this.currentMesh === targetMesh) return;

    // Sound effect
    const freqs = [320, 440, 520, 600, 700, 840];
    sfx.playMorphSound(freqs[fingerCount] || 440);

    // Remove old
    if (this.currentMesh) {
      this.shapesGroup.remove(this.currentMesh);
    }

    this.currentMesh = targetMesh;
    this.shapesGroup.add(this.currentMesh);

    // Initial pop scale effect
    this.currentMesh.scale.set(0.2, 0.2, 0.2);

    // Update lights color to match
    const info = SHAPES_CONFIG[fingerCount] || SHAPES_CONFIG[1];
    this.updateColors(info.color);
  }

  updateColors(newColor) {
    STATE.currentColor = newColor;
    this.pointLight.color.setHex(newColor);
    this.dirLight2.color.setHex(newColor);

    Object.values(this.shapes).forEach(mesh => {
      if (mesh.material) {
        mesh.material.color.setHex(newColor);
        mesh.material.emissive.setHex(newColor);
      }
    });
  }

  setWireframe(enabled) {
    STATE.isWireframe = enabled;
    Object.values(this.shapes).forEach(mesh => {
      if (mesh.material) {
        mesh.material.wireframe = enabled;
      }
    });
  }

  update(delta) {
    // Rotate background particles slowly
    if (this.particles) {
      this.particles.rotation.y += 0.001;
      this.particles.rotation.x += 0.0005;
    }

    if (!this.currentMesh) return;

    // Smooth position interpolation (LERP)
    this.currentMesh.position.x += (STATE.targetPos.x - this.currentMesh.position.x) * CONFIG.lerpSpeed;
    this.currentMesh.position.y += (STATE.targetPos.y - this.currentMesh.position.y) * CONFIG.lerpSpeed;
    this.currentMesh.position.z += (STATE.targetPos.z - this.currentMesh.position.z) * CONFIG.lerpSpeed;

    // Smooth scale interpolation
    const curScale = this.currentMesh.scale.x;
    const nextScale = curScale + (STATE.targetScale - curScale) * CONFIG.lerpSpeed;
    this.currentMesh.scale.set(nextScale, nextScale, nextScale);

    // Rotation logic
    if (STATE.isFrozen) {
      // Keep static when frozen / fist gesture
    } else {
      if (STATE.handDetected) {
        // Blend hand tilt + subtle continuous spin
        this.currentMesh.rotation.z += (STATE.targetRotation.z - this.currentMesh.rotation.z) * 0.1;
        if (STATE.isAutoRotate) {
          this.currentMesh.rotation.y += 0.015;
          this.currentMesh.rotation.x += 0.008;
        }
      } else {
        // Idle floating animation
        if (STATE.isAutoRotate) {
          this.currentMesh.rotation.y += 0.02;
          this.currentMesh.rotation.x += 0.01;
        }
        // Return to center slowly
        STATE.targetPos.x += (0 - STATE.targetPos.x) * 0.05;
        STATE.targetPos.y += (Math.sin(Date.now() * 0.002) * 0.2 - STATE.targetPos.y) * 0.05;
      }
    }

    // Keep point light synced with shape position
    this.pointLight.position.copy(this.currentMesh.position);

    // Render frame
    this.renderer.render(this.scene, this.camera);
  }

  onResize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
  }
}

// ==========================================
// 4. MEDIAPIPE HAND TRACKING & VISION
// ==========================================
class HandTracker {
  constructor(onResultsCallback) {
    this.videoElement = document.getElementById('webcam-video');
    this.overlayCanvas = document.getElementById('camera-overlay-canvas');
    this.overlayCtx = this.overlayCanvas.getContext('2d');

    this.pipCanvas = document.getElementById('pip-canvas');
    this.pipCtx = this.pipCanvas.getContext('2d');

    this.onResultsCallback = onResultsCallback;
    this.hands = null;
    this.camera = null;

    this.lastFrameTime = performance.now();
    this.frameCount = 0;

    this.initMediaPipe();
    window.addEventListener('resize', () => this.resizeCanvas());
    this.resizeCanvas();
  }

  resizeCanvas() {
    this.overlayCanvas.width = window.innerWidth;
    this.overlayCanvas.height = window.innerHeight;
    this.pipCanvas.width = 320;
    this.pipCanvas.height = 240;
  }

  initMediaPipe() {
    // @mediapipe/hands
    this.hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    this.hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.65,
      minTrackingConfidence: 0.65
    });

    this.hands.onResults((results) => this.handleResults(results));

    // Initialize Camera
    this.camera = new Camera(this.videoElement, {
      onFrame: async () => {
        await this.hands.send({ image: this.videoElement });
      },
      width: 1280,
      height: 720
    });

    this.camera.start()
      .then(() => {
        const loader = document.getElementById('loading-overlay');
        if (loader) {
          loader.style.opacity = '0';
          setTimeout(() => loader.style.display = 'none', 500);
        }
        document.getElementById('status-indicator').classList.add('connected');
        document.getElementById('camera-status-text').innerText = 'Kamera faol';
      })
      .catch((err) => {
        console.error('Camera Access Error:', err);
        const sub = document.getElementById('loading-subtext');
        if (sub) {
          sub.innerText = 'Kameraga ruxsat berilmadi yoki xatolik yuz berdi. Iltimos brauzer ruxsatlarini tekshiring.';
          sub.style.color = '#ff3366';
        }
      });
  }

  handleResults(results) {
    // Measure FPS
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFrameTime >= 1000) {
      STATE.fps = Math.round((this.frameCount * 1000) / (now - this.lastFrameTime));
      this.frameCount = 0;
      this.lastFrameTime = now;
      document.getElementById('fps-value').innerText = STATE.fps;
    }

    // Clear Canvas Overlays
    this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
    this.pipCtx.clearRect(0, 0, this.pipCanvas.width, this.pipCanvas.height);

    // Draw PiP video feed
    if (results.image) {
      this.pipCtx.drawImage(results.image, 0, 0, this.pipCanvas.width, this.pipCanvas.height);
    }

    // Fullscreen transparent webcam feed if enabled
    if (STATE.cameraMode === 'transparent' && results.image) {
      this.overlayCtx.save();
      this.overlayCtx.globalAlpha = 0.25;
      this.overlayCtx.translate(this.overlayCanvas.width, 0);
      this.overlayCtx.scale(-1, 1);
      this.overlayCtx.drawImage(results.image, 0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
      this.overlayCtx.restore();
    }

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      STATE.handDetected = true;
      const primaryLandmarks = results.multiHandLandmarks[0];

      // Draw skeleton & landmarks
      this.drawHandOverlay(primaryLandmarks, this.overlayCtx, this.overlayCanvas.width, this.overlayCanvas.height);
      this.drawHandOverlay(primaryLandmarks, this.pipCtx, this.pipCanvas.width, this.pipCanvas.height);

      // Gesture Recognition & Metric computation
      const metrics = this.analyzeHand(primaryLandmarks, results.multiHandLandmarks);

      // Forward metrics to callback
      if (this.onResultsCallback) {
        this.onResultsCallback(metrics);
      }
    } else {
      STATE.handDetected = false;
      if (this.onResultsCallback) {
        this.onResultsCallback(null);
      }
    }
  }

  drawHandOverlay(landmarks, ctx, width, height) {
    ctx.save();
    
    // Connections from MediaPipe
    const connections = [
      [0,1],[1,2],[2,3],[3,4],       // Thumb
      [0,5],[5,6],[6,7],[7,8],       // Index
      [5,9],[9,10],[10,11],[11,12],  // Middle
      [9,13],[13,14],[14,15],[15,16],// Ring
      [13,17],[17,18],[18,19],[19,20],// Pinky
      [0,17]                         // Palm base
    ];

    // Mirroring horizontal X coordinates
    const toScreen = (lm) => ({
      x: (1 - lm.x) * width,
      y: lm.y * height
    });

    // Draw Neon Connection Lines
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.7)';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 10;

    connections.forEach(([i, j]) => {
      const p1 = toScreen(landmarks[i]);
      const p2 = toScreen(landmarks[j]);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    });

    // Draw Landmark Glowing Nodes
    landmarks.forEach((lm, idx) => {
      const pt = toScreen(lm);
      ctx.beginPath();
      const isTip = [4, 8, 12, 16, 20].includes(idx);
      const radius = isTip ? 6 : 4;
      ctx.arc(pt.x, pt.y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = isTip ? '#ff007f' : '#00f0ff';
      ctx.shadowColor = isTip ? '#ff007f' : '#00f0ff';
      ctx.shadowBlur = 8;
      ctx.fill();
    });

    // Draw Laser line between Thumb and Index if Pinching
    if (STATE.pinchActive) {
      const thumb = toScreen(landmarks[4]);
      const index = toScreen(landmarks[8]);
      ctx.beginPath();
      ctx.moveTo(thumb.x, thumb.y);
      ctx.lineTo(index.x, index.y);
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#ffff00';
      ctx.shadowColor = '#ffff00';
      ctx.shadowBlur = 15;
      ctx.stroke();
    }

    ctx.restore();
  }

  // Distance helper
  euclideanDist(p1, p2) {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const dz = (p1.z || 0) - (p2.z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  analyzeHand(landmarks, allHands) {
    const wrist = landmarks[0];

    // Rotation-invariant finger extension calculation
    // Compare tip distance from wrist vs pip distance from wrist
    const isFingerOpen = (tipIdx, pipIdx) => {
      const dTip = this.euclideanDist(landmarks[tipIdx], wrist);
      const dPip = this.euclideanDist(landmarks[pipIdx], wrist);
      return dTip > dPip * 1.15;
    };

    // Thumb check: distance to pinky base (17) vs thumb IP (3) to 17
    const thumbTipToPinky = this.euclideanDist(landmarks[4], landmarks[17]);
    const thumbIPToPinky = this.euclideanDist(landmarks[3], landmarks[17]);
    const isThumbOpen = thumbTipToPinky > thumbIPToPinky * 1.18;

    const indexOpen = isFingerOpen(8, 6);
    const middleOpen = isFingerOpen(12, 10);
    const ringOpen = isFingerOpen(16, 14);
    const pinkyOpen = isFingerOpen(20, 18);

    // Count open fingers
    let count = 0;
    if (isThumbOpen) count++;
    if (indexOpen) count++;
    if (middleOpen) count++;
    if (ringOpen) count++;
    if (pinkyOpen) count++;

    // Calculate Pinch between Thumb(4) and Index(8)
    const pinchDist = this.euclideanDist(landmarks[4], landmarks[8]);
    const isPinch = pinchDist < 0.08;

    // Hand Center (Mean of wrist and MCPs)
    const handCenter = {
      x: (wrist.x + landmarks[5].x + landmarks[17].x) / 3,
      y: (wrist.y + landmarks[5].y + landmarks[17].y) / 3
    };

    // Hand orientation angle (wrist 0 to middle MCP 9)
    const angleRad = Math.atan2(landmarks[9].y - wrist.y, (1 - landmarks[9].x) - (1 - wrist.x));

    // Two hands distance calculation for multi-hand scale
    let twoHandScale = null;
    if (allHands.length >= 2) {
      const h1 = allHands[0][0]; // wrist 1
      const h2 = allHands[1][0]; // wrist 2
      twoHandScale = this.euclideanDist(h1, h2);
    }

    return {
      fingerCount: count,
      openFingers: {
        thumb: isThumbOpen,
        index: indexOpen,
        middle: middleOpen,
        ring: ringOpen,
        pinky: pinkyOpen
      },
      pinchDist: pinchDist,
      isPinch: isPinch,
      handCenter: handCenter,
      angle: angleRad - Math.PI / 2, // normalized upright
      twoHandScale: twoHandScale
    };
  }
}

// ==========================================
// 5. APPLICATION CONTROLLER & UI BINDINGS
// ==========================================
class AppController {
  constructor() {
    this.scene3d = new Scene3D();
    this.tracker = new HandTracker((metrics) => this.onHandMetrics(metrics));

    this.fingerPills = [
      document.getElementById('pill-thumb'),
      document.getElementById('pill-index'),
      document.getElementById('pill-middle'),
      document.getElementById('pill-ring'),
      document.getElementById('pill-pinky')
    ];

    this.setupUIEvents();
    this.animate();
  }

  onHandMetrics(metrics) {
    if (!metrics) {
      document.getElementById('hand-detect-status').innerText = 'Qo\'l qidirilmoqda...';
      document.getElementById('hand-detect-status').style.color = 'var(--text-muted)';
      this.updateFingerPills({});
      return;
    }

    document.getElementById('hand-detect-status').innerText = 'Qo\'l aniqlandi';
    document.getElementById('hand-detect-status').style.color = 'var(--primary-emerald)';

    // Update Finger Count & Shape
    const count = metrics.fingerCount;
    if (count !== STATE.activeFingerCount) {
      STATE.activeFingerCount = count;
      this.onShapeChange(count);
    }

    // Update UI Elements
    this.updateFingerPills(metrics.openFingers);
    document.getElementById('finger-count-number').innerText = count;

    // Handle Fist / Freeze
    if (count === 0) {
      STATE.isFrozen = true;
      document.getElementById('gesture-name').innerText = 'Harakat qulflandi';
    } else {
      STATE.isFrozen = false;
    }

    // 3D Object Tracking: Map normalized 2D hand center to 3D Scene space
    // FOV 50, z = 5 -> visible height at z=0 is 2 * tan(25 deg) * 5 ≈ 4.66
    const visibleHeight = 4.66;
    const visibleWidth = visibleHeight * (window.innerWidth / window.innerHeight);

    // Mirrored X mapping
    const normX = ((1 - metrics.handCenter.x) - 0.5) * 2;
    const normY = -(metrics.handCenter.y - 0.5) * 2;

    STATE.targetPos.x = normX * (visibleWidth / 2) * 1.1;
    STATE.targetPos.y = normY * (visibleHeight / 2) * 1.1;

    // Hand Roll Tilt
    STATE.targetRotation.z = -metrics.angle * 1.2;

    // Scale calculation via Pinch distance or Two Hands
    STATE.pinchActive = metrics.isPinch;
    if (metrics.twoHandScale !== null) {
      // 2-hand gesture scaling
      const mappedScale = THREE.MathUtils.clamp(metrics.twoHandScale * 3.5, CONFIG.minScale, CONFIG.maxScale);
      STATE.targetScale = mappedScale;
      document.getElementById('scale-value').innerText = `${mappedScale.toFixed(2)}x (2 qo'l)`;
    } else if (metrics.isPinch) {
      // Pinch scaling (fine control)
      sfx.playPinchTick();
      const pinchFactor = THREE.MathUtils.clamp((metrics.pinchDist - 0.02) * 18, CONFIG.minScale, CONFIG.maxScale);
      STATE.targetScale = pinchFactor;
      document.getElementById('scale-value').innerText = `${pinchFactor.toFixed(2)}x (Pinch)`;
      document.getElementById('gesture-name').innerText = 'Pinch (Masshtablash)';
    } else {
      document.getElementById('scale-value').innerText = `${STATE.targetScale.toFixed(2)}x`;
    }

    // Update Pinch Meter
    const pinchPercent = Math.min(Math.max((metrics.pinchDist / 0.25) * 100, 0), 100);
    document.getElementById('pinch-fill').style.width = `${pinchPercent}%`;

    // Rotation telemetry display
    const rotDeg = Math.round((STATE.targetRotation.z * 180) / Math.PI);
    document.getElementById('rot-value').innerText = `${rotDeg}°`;
  }

  onShapeChange(fingerCount) {
    const shapeInfo = SHAPES_CONFIG[fingerCount] || SHAPES_CONFIG[1];
    this.scene3d.setShape(fingerCount);

    // Update UI Labels
    document.getElementById('shape-name-badge').innerText = shapeInfo.name;
    document.getElementById('shape-desc-badge').innerText = shapeInfo.subtitle;
    document.getElementById('gesture-name').innerText = shapeInfo.name;

    // Highlight gesture guide list
    document.querySelectorAll('.guide-item').forEach(item => {
      item.classList.remove('highlighted');
    });
    const activeGuideItem = document.getElementById(`guide-shape-${fingerCount}`);
    if (activeGuideItem) {
      activeGuideItem.classList.add('highlighted');
    }
  }

  updateFingerPills(openFingers) {
    const fingers = ['thumb', 'index', 'middle', 'ring', 'pinky'];
    fingers.forEach((f, i) => {
      if (openFingers && openFingers[f]) {
        this.fingerPills[i].classList.add('active');
      } else {
        this.fingerPills[i].classList.remove('active');
      }
    });
  }

  setupUIEvents() {
    // Wireframe toggle
    const btnWireframe = document.getElementById('btn-wireframe');
    btnWireframe.addEventListener('click', () => {
      STATE.isWireframe = !STATE.isWireframe;
      this.scene3d.setWireframe(STATE.isWireframe);
      btnWireframe.classList.toggle('active', STATE.isWireframe);
    });

    // Auto-rotate toggle
    const btnRotate = document.getElementById('btn-autorotate');
    btnRotate.addEventListener('click', () => {
      STATE.isAutoRotate = !STATE.isAutoRotate;
      btnRotate.classList.toggle('active', STATE.isAutoRotate);
    });

    // Sound toggle
    const btnSound = document.getElementById('btn-sound');
    btnSound.addEventListener('click', () => {
      sfx.enabled = !sfx.enabled;
      btnSound.classList.toggle('active', sfx.enabled);
      btnSound.innerText = sfx.enabled ? '🔊 Ovoz' : '🔇 Ovoz';
    });

    // Camera Mode toggle (PiP -> Transparent -> Off)
    const btnCameraMode = document.getElementById('btn-camera-mode');
    btnCameraMode.addEventListener('click', () => {
      if (STATE.cameraMode === 'pip') {
        STATE.cameraMode = 'transparent';
        btnCameraMode.innerText = '📷 Fon: Shaffof';
      } else if (STATE.cameraMode === 'transparent') {
        STATE.cameraMode = 'dark';
        btnCameraMode.innerText = '📷 Fon: Qorong\'u';
      } else {
        STATE.cameraMode = 'pip';
        btnCameraMode.innerText = '📷 Fon: PiP';
      }
    });

    // Color picker dots
    document.querySelectorAll('.color-dot').forEach(dot => {
      dot.addEventListener('click', (e) => {
        document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
        dot.classList.add('active');
        const colorHex = parseInt(dot.getAttribute('data-color'), 16);
        this.scene3d.updateColors(colorHex);
      });
    });

    // Fullscreen toggle
    const btnFullscreen = document.getElementById('btn-fullscreen');
    btnFullscreen.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      }
    });

    // Modal Guide
    const btnHelp = document.getElementById('btn-help');
    const modal = document.getElementById('guide-modal');
    const modalClose = document.getElementById('modal-close');

    btnHelp.addEventListener('click', () => modal.classList.add('open'));
    modalClose.addEventListener('click', () => modal.classList.remove('open'));
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('open');
    });

    // Keyboard shortcuts
    window.addEventListener('keydown', (e) => {
      const num = parseInt(e.key);
      if (!isNaN(num) && num >= 0 && num <= 5) {
        this.onShapeChange(num);
      }
    });
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.scene3d.update();
  }
}

// Start application when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  window.app = new AppController();
});
