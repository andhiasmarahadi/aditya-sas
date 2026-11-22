import * as THREE from 'three';

let cachedToonRamp: THREE.DataTexture | null = null;

export function getToonGradientMap(): THREE.DataTexture {
  if (cachedToonRamp) return cachedToonRamp;
  // 4-step Genshin-like cel-shading ramp: soft shadow -> mid -> lit -> bright rim
  const bands = new Uint8Array([92, 168, 224, 255]);
  const tex = new THREE.DataTexture(bands, 4, 1, THREE.RedFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  cachedToonRamp = tex;
  return tex;
}

export function createOutfitFabricTexture(
  primaryHex: string,
  secondaryHex: string,
  goldHex: string
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, primaryHex);
  grad.addColorStop(0.65, secondaryHex);
  grad.addColorStop(1, primaryHex);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Subtle diagonal anime cloth weave
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 2;
  for (let i = -512; i < 1024; i += 24) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 512, 512);
    ctx.stroke();
  }

  // Ornate gold filigree trim bands top & bottom
  ctx.strokeStyle = goldHex;
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 36, 496, 440);
  ctx.lineWidth = 4;
  ctx.beginPath();
  for (let x = 0; x <= 512; x += 64) {
    ctx.moveTo(x, 450);
    ctx.quadraticCurveTo(x + 32, 412, x + 64, 450);
  }
  ctx.stroke();

  // Diamond embroidery motifs
  ctx.fillStyle = goldHex;
  for (let x = 48; x < 512; x += 96) {
    ctx.save();
    ctx.translate(x, 256);
    ctx.rotate(Math.PI / 4);
    ctx.globalAlpha = 0.38;
    ctx.fillRect(-10, -10, 20, 20);
    ctx.restore();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createHilichurlMaskTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#efe6d5';
  ctx.fillRect(0, 0, 256, 256);

  // Bone weathering lines
  ctx.strokeStyle = 'rgba(110, 90, 70, 0.25)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 16; i++) {
    ctx.beginPath();
    ctx.moveTo(Math.random() * 256, Math.random() * 256);
    ctx.lineTo(Math.random() * 256, Math.random() * 256);
    ctx.stroke();
  }

  // Tribal red/ochre forehead emblem & cheek markings
  ctx.strokeStyle = '#991b1b';
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(128, 88, 32, 0.2 * Math.PI, 0.8 * Math.PI);
  ctx.moveTo(128, 36);
  ctx.lineTo(128, 76);
  ctx.stroke();

  // Eye cutouts
  ctx.fillStyle = '#140f1a';
  ctx.beginPath();
  ctx.ellipse(86, 134, 22, 16, -0.2, 0, Math.PI * 2);
  ctx.ellipse(170, 134, 22, 16, 0.2, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createRuinRuneTexture(accentHex: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#333645';
  ctx.fillRect(0, 0, 256, 256);

  // Riveted bronze armor seams
  ctx.strokeStyle = '#1e202b';
  ctx.lineWidth = 6;
  ctx.strokeRect(12, 12, 232, 232);

  // Etched glowing elemental circuit lines
  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(32, 64);
  ctx.lineTo(96, 64);
  ctx.lineTo(128, 96);
  ctx.lineTo(160, 64);
  ctx.lineTo(224, 64);
  ctx.moveTo(128, 96);
  ctx.lineTo(128, 192);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(128, 128, 42, 0, Math.PI * 2);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createSlashArcTexture(colorHex: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 256, 256);

  const grad = ctx.createRadialGradient(128, 128, 52, 128, 128, 122);
  grad.addColorStop(0, 'rgba(255,255,255,0)');
  grad.addColorStop(0.55, colorHex);
  grad.addColorStop(0.82, '#ffffff');
  grad.addColorStop(1, 'rgba(255,255,255,0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(128, 128, 122, -Math.PI * 0.65, Math.PI * 0.65);
  ctx.arc(110, 128, 88, Math.PI * 0.6, -Math.PI * 0.6, true);
  ctx.closePath();
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

let cachedParticleTex: THREE.CanvasTexture | null = null;
export function getSoftParticleTexture(): THREE.CanvasTexture {
  if (cachedParticleTex) return cachedParticleTex;
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.45, 'rgba(255, 255, 255, 0.75)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  cachedParticleTex = tex;
  return tex;
}

export function createAnimeFaceTexture(eyeColorHex: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 512, 512);

  // Soft anime cheek blush & nose dot shadow
  ctx.fillStyle = 'rgba(244, 128, 140, 0.32)';
  ctx.beginPath();
  ctx.ellipse(134, 316, 38, 16, 0, 0, Math.PI * 2);
  ctx.ellipse(378, 316, 38, 16, 0, 0, Math.PI * 2);
  ctx.fill();

  // Subtle nose bridge highlight/shadow
  ctx.fillStyle = 'rgba(180, 110, 95, 0.45)';
  ctx.beginPath();
  ctx.ellipse(256, 304, 4, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  const drawEye = (cx: number, isLeft: boolean) => {
    const dir = isLeft ? 1 : -1;

    // Upper eyelid crease
    ctx.strokeStyle = 'rgba(120, 75, 65, 0.55)';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, 250, 56, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();

    // Sclera with soft top shadow
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, 266, 46, 47, 0, 0, Math.PI * 2);
    ctx.clip();

    const scleraGrad = ctx.createLinearGradient(cx, 220, cx, 312);
    scleraGrad.addColorStop(0, '#cfd8e8');
    scleraGrad.addColorStop(0.28, '#ffffff');
    scleraGrad.addColorStop(1, '#f8fafc');
    ctx.fillStyle = scleraGrad;
    ctx.fillRect(cx - 52, 215, 104, 102);

    // Rich multi-stop Genshin-style anime iris
    const irisGrad = ctx.createLinearGradient(cx, 224, cx, 310);
    irisGrad.addColorStop(0, '#0f1021');
    irisGrad.addColorStop(0.35, eyeColorHex);
    irisGrad.addColorStop(0.78, '#fff7ed');
    irisGrad.addColorStop(1, eyeColorHex);
    ctx.fillStyle = irisGrad;
    ctx.beginPath();
    ctx.ellipse(cx, 268, 31, 40, 0, 0, Math.PI * 2);
    ctx.fill();

    // Iris inner glowing ring + star sparkle
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, 276, 18, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();

    // Pupil
    ctx.fillStyle = '#0d0e1c';
    ctx.beginPath();
    ctx.ellipse(cx, 266, 13, 17, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Thick stylized upper eyelash with winged outer tip
    ctx.strokeStyle = '#1d1828';
    ctx.lineWidth = 13;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - 48 * dir, 250);
    ctx.quadraticCurveTo(cx, 210, cx + 50 * dir, 258);
    ctx.stroke();

    // Lower lash subtle line
    ctx.strokeStyle = 'rgba(45, 35, 50, 0.58)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, 272, 36, 0.22 * Math.PI, 0.78 * Math.PI);
    ctx.stroke();

    // Crisp multi-point anime catchlights
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx - 12, 248, 10.5, 0, Math.PI * 2);
    ctx.arc(cx + 12, 282, 5.5, 0, Math.PI * 2);
    ctx.arc(cx - 18, 274, 3, 0, Math.PI * 2);
    ctx.fill();
  };

  drawEye(154, true);
  drawEye(358, false);

  // Expressive tapered eyebrows
  ctx.strokeStyle = '#3a2b22';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(106, 190);
  ctx.quadraticCurveTo(154, 174, 198, 192);
  ctx.moveTo(314, 192);
  ctx.quadraticCurveTo(358, 174, 406, 190);
  ctx.stroke();

  // Gentle natural anime mouth
  ctx.strokeStyle = '#a85358';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(256, 344, 24, 0.18 * Math.PI, 0.82 * Math.PI);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createSlimeFaceTexture(isBoss = false): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 256, 256);

  const drawSlimeEye = (cx: number, flip: number) => {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(cx, 126, 21, 25, flip * 0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = isBoss ? '#ef4444' : '#111827';
    ctx.beginPath();
    ctx.ellipse(cx, 128, 10.5, 14.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx - 4, 120, 4.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 7.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - 21 * flip, 94);
    ctx.lineTo(cx + 19 * flip, 108);
    ctx.stroke();
  };

  drawSlimeEye(82, 1);
  drawSlimeEye(174, -1);

  ctx.strokeStyle = '#111827';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(114, 166);
  ctx.lineTo(128, 158);
  ctx.lineTo(142, 166);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createGroundTexture(
  primaryHex: string,
  secondaryHex: string,
  maxAnisotropy = 4
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = primaryHex;
  ctx.fillRect(0, 0, 512, 512);

  // Soft stylized Teyvat meadow patches
  for (let i = 0; i < 720; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = 8 + Math.random() * 26;
    ctx.fillStyle = i % 3 === 0 ? secondaryHex : primaryHex;
    ctx.globalAlpha = 0.14 + Math.random() * 0.18;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.65, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Stylized grass blade strokes & tiny wildflowers
  for (let i = 0; i < 460; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (Math.random() - 0.5) * 7, y - 6 - Math.random() * 7);
    ctx.stroke();

    if (i % 18 === 0) {
      ctx.fillStyle = 'rgba(255, 250, 210, 0.35)';
      ctx.beginPath();
      ctx.arc(x, y - 6, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(20, 20);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, 'rgba(10, 15, 28, 0.62)');
  grad.addColorStop(0.55, 'rgba(10, 15, 28, 0.28)');
  grad.addColorStop(1, 'rgba(10, 15, 28, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createRuneCircleTexture(accentHex: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 256, 256);

  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(128, 128, 114, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(128, 128, 92, 0, Math.PI * 2);
  ctx.stroke();

  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    ctx.beginPath();
    ctx.moveTo(128 + Math.cos(a) * 44, 128 + Math.sin(a) * 44);
    ctx.lineTo(128 + Math.cos(a) * 114, 128 + Math.sin(a) * 114);
    ctx.stroke();
  }

  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    const x = 128 + Math.cos(a) * 92;
    const y = 128 + Math.sin(a) * 92;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
