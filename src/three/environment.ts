import * as THREE from 'three';
import { BiomeType, RegionDef } from '../types/game';
import {
  createGroundTexture,
  createRuneCircleTexture,
  getSoftParticleTexture,
} from './textures';

export interface CampSpot {
  level: 1 | 2 | 3;
  x: number;
  z: number;
}

export const CAMP_SPOTS: CampSpot[] = [
  { level: 1, x: -11, z: -15 },
  { level: 2, x: 12, z: -30 },
  { level: 3, x: 0, z: -48 },
];

export function groundHeightAt(x: number, z: number, biome?: BiomeType): number {
  const dSpawn = Math.hypot(x, z);
  let flatMask = THREE.MathUtils.smoothstep(dSpawn, 5, 12);

  for (const camp of CAMP_SPOTS) {
    const dc = Math.hypot(x - camp.x, z - camp.z);
    flatMask *= THREE.MathUtils.smoothstep(dc, 4.8, 10.5);
  }

  const distFromTrail = Math.max(0, Math.abs(x) - 18) * 0.08;
  const hill =
    (Math.sin(x * 0.07) * Math.cos(z * 0.07) * 1.45 +
      Math.sin(x * 0.035 + 1.2) * 1.9) *
    flatMask;

  const perimeterRise = Math.pow(distFromTrail, 1.65) * 0.95;
  const peakBoost = biome === 'sacred-peak' ? 0.35 : 0;
  return hill + perimeterRise + peakBoost * flatMask;
}

export function buildRegionEnvironment(
  scene: THREE.Scene,
  region: RegionDef,
  renderer: THREE.WebGLRenderer,
  isSoftwareGl: boolean
): {
  waypointCrystal: THREE.Mesh;
  campRings: THREE.Mesh[];
  floatingAccents: THREE.Object3D[];
  clouds: THREE.Group[];
  ambientParticles: THREE.Points;
} {
  const { colors, biome } = region;

  // Sky & atmospheric fog matched to horizon
  scene.background = new THREE.Color(colors.skyHorizon);
  scene.fog = new THREE.FogExp2(colors.fog, 0.0095);

  // Gradient Sky Dome
  const skyGeo = new THREE.SphereGeometry(165, 28, 18);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color(colors.skyTop) },
      bottomColor: { value: new THREE.Color(colors.skyHorizon) },
    },
    vertexShader: `
      varying vec3 vWorldPos;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      varying vec3 vWorldPos;
      void main() {
        float h = normalize(vWorldPos).y;
        float t = clamp(pow(max(h, 0.0), 0.62), 0.0, 1.0);
        gl_FragColor = vec4(mix(bottomColor, topColor, t), 1.0);
      }
    `,
  });
  scene.add(new THREE.Mesh(skyGeo, skyMat));

  // Sun / Celestia Halo Disc
  const sunMesh = new THREE.Mesh(
    new THREE.SphereGeometry(5.2, 18, 18),
    new THREE.MeshBasicMaterial({ color: '#fff8db' })
  );
  sunMesh.position.set(38, 56, -85);
  scene.add(sunMesh);

  // Stylized Drifting Teyvat Clouds
  const clouds: THREE.Group[] = [];
  const cloudMat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    roughness: 0.95,
    metalness: 0,
    transparent: true,
    opacity: 0.88,
  });
  for (let c = 0; c < 10; c++) {
    const cloud = new THREE.Group();
    const puffs = 3 + (c % 3);
    for (let p = 0; p < puffs; p++) {
      const puff = new THREE.Mesh(
        new THREE.DodecahedronGeometry(2.4 + (p % 2) * 1.1, 1),
        cloudMat
      );
      puff.position.set((p - 1.2) * 2.5, (p % 2) * 0.6, ((p + c) % 2) * 1.1);
      puff.scale.set(1.4, 0.65, 1.1);
      cloud.add(puff);
    }
    cloud.position.set(-55 + c * 13, 28 + (c % 3) * 4.5, -20 - (c % 5) * 18);
    scene.add(cloud);
    clouds.push(cloud);
  }

  // Terrain Mesh
  const maxAniso = isSoftwareGl ? 1 : renderer.capabilities.getMaxAnisotropy();
  const groundTex = createGroundTexture(colors.groundPrimary, colors.groundSecondary, maxAniso);
  const terrainGeo = new THREE.PlaneGeometry(190, 190, 74, 74);
  terrainGeo.rotateX(-Math.PI / 2);
  const posAttr = terrainGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const vx = posAttr.getX(i);
    const vz = posAttr.getZ(i);
    posAttr.setY(i, groundHeightAt(vx, vz, biome));
  }
  terrainGeo.computeVertexNormals();

  const terrainMat = new THREE.MeshStandardMaterial({
    map: groundTex,
    roughness: 0.92,
    metalness: 0.02,
  });
  const terrain = new THREE.Mesh(terrainGeo, terrainMat);
  terrain.receiveShadow = true;
  scene.add(terrain);

  // Distant Mountain Ridge Ring so horizon looks vast like Genshin Teyvat
  const mountainMat = new THREE.MeshStandardMaterial({
    color: colors.skyTop,
    roughness: 0.95,
    metalness: 0.05,
  });
  for (let m = 0; m < 18; m++) {
    const angle = (m / 18) * Math.PI * 2;
    const rad = 84 + (m % 3) * 8;
    const h = 18 + (m % 4) * 7;
    const peak = new THREE.Mesh(
      new THREE.ConeGeometry(16 + (m % 3) * 4, h, 7),
      mountainMat
    );
    peak.position.set(Math.cos(angle) * rad, h * 0.42, -25 + Math.sin(angle) * rad);
    peak.rotation.y = m * 0.5;
    scene.add(peak);
  }

  // Shimmering Harbor Water for Liyue/Fontaine Harbor Biome
  if (biome === 'liyue-harbor') {
    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(190, 190),
      new THREE.MeshStandardMaterial({
        color: '#0ea5e9',
        roughness: 0.1,
        metalness: 0.65,
        transparent: true,
        opacity: 0.74,
      })
    );
    water.rotation.x = -Math.PI / 2;
    water.position.y = -0.35;
    scene.add(water);
  }

  // Adventure Stepping Stones + Glowing Stone Lanterns along path
  const pathPoints = [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(-11, 0, -15),
    new THREE.Vector3(12, 0, -30),
    new THREE.Vector3(0, 0, -48),
  ];
  const stoneMat = new THREE.MeshStandardMaterial({
    color: '#e6d7b9',
    roughness: 0.72,
    metalness: 0.08,
  });
  const lanternGlowMat = new THREE.MeshStandardMaterial({
    color: colors.accent,
    emissive: colors.accent,
    emissiveIntensity: 0.9,
    roughness: 0.2,
  });

  for (let s = 0; s < pathPoints.length - 1; s++) {
    const a = pathPoints[s];
    const b = pathPoints[s + 1];
    const steps = 9;
    for (let k = 1; k < steps; k++) {
      const t = k / steps;
      const px = THREE.MathUtils.lerp(a.x, b.x, t);
      const pz = THREE.MathUtils.lerp(a.z, b.z, t);
      const py = groundHeightAt(px, pz, biome);
      const stone = new THREE.Mesh(
        new THREE.CylinderGeometry(0.78, 0.9, 0.14, 8),
        stoneMat
      );
      stone.position.set(px, py + 0.03, pz);
      stone.receiveShadow = true;
      scene.add(stone);

      // Trail side stone lantern every 3 stones
      if (k % 3 === 0) {
        const lx = px + (s % 2 === 0 ? 1.85 : -1.85);
        const ly = groundHeightAt(lx, pz, biome);
        const post = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.18, 1.35, 6),
          stoneMat
        );
        post.position.set(lx, ly + 0.67, pz);
        post.castShadow = true;
        scene.add(post);

        const lamp = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), lanternGlowMat);
        lamp.position.set(lx, ly + 1.5, pz);
        scene.add(lamp);
      }
    }
  }

  // Teleport Waypoint Statue at Spawn (0, 0, 3.8)
  const wpGroup = new THREE.Group();
  wpGroup.position.set(0, groundHeightAt(0, 3.8, biome), 3.8);
  const wpBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.95, 1.3, 0.55, 8),
    new THREE.MeshStandardMaterial({ color: '#cbd5e1', roughness: 0.48, metalness: 0.25 })
  );
  wpBase.position.y = 0.27;
  wpBase.castShadow = true;
  wpGroup.add(wpBase);

  const wpPillar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.38, 1.9, 6),
    new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.38, metalness: 0.38 })
  );
  wpPillar.position.y = 1.35;
  wpPillar.castShadow = true;
  wpGroup.add(wpPillar);

  const waypointCrystal = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.42, 0),
    new THREE.MeshStandardMaterial({
      color: colors.accent,
      emissive: colors.accent,
      emissiveIntensity: 0.95,
      roughness: 0.14,
      metalness: 0.45,
    })
  );
  waypointCrystal.position.y = 2.85;
  wpGroup.add(waypointCrystal);
  scene.add(wpGroup);

  // Camp Rune Circles on ground for the 3 Levels
  const runeTex = createRuneCircleTexture(colors.accent);
  const campRings: THREE.Mesh[] = [];
  CAMP_SPOTS.forEach((camp) => {
    const cy = groundHeightAt(camp.x, camp.z, biome);
    const ringMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(7.2, 7.2),
      new THREE.MeshBasicMaterial({
        map: runeTex,
        transparent: true,
        depthWrite: false,
        opacity: 0.8,
      })
    );
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.set(camp.x, cy + 0.03, camp.z);
    scene.add(ringMesh);
    campRings.push(ringMesh);
  });

  // =========================================================================
  // ICONIC GENSHIN LANDMARKS FOR ALL 9 BIOMES
  // =========================================================================
  const floatingAccents: THREE.Object3D[] = [];
  const goldMat = new THREE.MeshStandardMaterial({ color: '#eab308', roughness: 0.22, metalness: 0.88 });
  const stoneMat2 = new THREE.MeshStandardMaterial({ color: '#94a3b8', roughness: 0.68, metalness: 0.12 });
  const crimsonWoodMat = new THREE.MeshStandardMaterial({ color: '#b91c1c', roughness: 0.55, metalness: 0.1 });
  const obsidianMat = new THREE.MeshStandardMaterial({ color: '#1e1b2e', roughness: 0.42, metalness: 0.45 });
  const accentMat = new THREE.MeshStandardMaterial({
    color: colors.accent,
    emissive: colors.accent,
    emissiveIntensity: 0.65,
    roughness: 0.2,
  });

  if (biome === 'bali-temple' || biome === 'golden-citadel' || biome === 'sacred-peak') {
    // Grand Split Gate (Candi Bentar / Imperial Gate) + Tiered Shrine behind Boss Camp
    [-3.2, 3.2].forEach((gx) => {
      const gateGroup = new THREE.Group();
      const gz = -57;
      gateGroup.position.set(gx, groundHeightAt(gx, gz, biome), gz);
      for (let tier = 0; tier < 6; tier++) {
        const w = 2.2 - tier * 0.28;
        const block = new THREE.Mesh(
          new THREE.BoxGeometry(w, 1.35, w * 0.82),
          tier === 5 ? goldMat : stoneMat2
        );
        block.position.y = 0.68 + tier * 1.3;
        block.castShadow = true;
        gateGroup.add(block);
      }
      scene.add(gateGroup);
    });
  } else if (biome === 'mondstadt-meadow') {
    // Iconic Mondstadt Windmill Tower
    const wm = new THREE.Group();
    wm.position.set(-16, groundHeightAt(-16, -54, biome), -54);
    const tower = new THREE.Mesh(
      new THREE.CylinderGeometry(1.7, 2.8, 12, 12),
      new THREE.MeshStandardMaterial({ color: '#f1e8d9', roughness: 0.7 })
    );
    tower.position.y = 6;
    tower.castShadow = true;
    wm.add(tower);
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(2.3, 3.4, 12),
      crimsonWoodMat
    );
    roof.position.y = 13.4;
    wm.add(roof);

    const bladesPivot = new THREE.Group();
    bladesPivot.position.set(0, 10.2, 2.2);
    for (let b = 0; b < 4; b++) {
      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 4.6, 0.08),
        new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.45 })
      );
      blade.rotation.z = (b * Math.PI) / 2;
      blade.position.set(
        Math.cos((b * Math.PI) / 2 + Math.PI / 2) * 2.3,
        Math.sin((b * Math.PI) / 2 + Math.PI / 2) * 2.3,
        0
      );
      bladesPivot.add(blade);
    }
    wm.add(bladesPivot);
    floatingAccents.push(bladesPivot);
    scene.add(wm);
  } else if (biome === 'inazuma-crystal' || biome === 'sakura-garden') {
    // Grand Inazuma / Narukami Shrine Torii Gate behind Boss
    const torii = new THREE.Group();
    const tz = -57;
    torii.position.set(0, groundHeightAt(0, tz, biome), tz);
    [-3.4, 3.4].forEach((px) => {
      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.38, 0.48, 8.5, 12),
        crimsonWoodMat
      );
      pillar.position.set(px, 4.25, 0);
      pillar.castShadow = true;
      torii.add(pillar);
    });
    const topBeam = new THREE.Mesh(new THREE.BoxGeometry(9.8, 0.65, 0.9), crimsonWoodMat);
    topBeam.position.y = 8.4;
    torii.add(topBeam);
    const roofCap = new THREE.Mesh(new THREE.BoxGeometry(10.8, 0.4, 1.15), obsidianMat);
    roofCap.position.y = 8.85;
    torii.add(roofCap);
    const subBeam = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.42, 0.6), crimsonWoodMat);
    subBeam.position.y = 6.9;
    torii.add(subBeam);
    const emblem = new THREE.Mesh(new THREE.OctahedronGeometry(0.6, 0), goldMat);
    emblem.position.set(0, 7.65, 0.35);
    torii.add(emblem);
    scene.add(torii);
  } else if (biome === 'liyue-harbor') {
    // Liyue Harbor Upturned Pavilion behind Boss
    const pav = new THREE.Group();
    pav.position.set(0, groundHeightAt(0, -58, biome), -58);
    [-3, 3].forEach((px) => {
      [-2, 2].forEach((pz) => {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 6, 10), crimsonWoodMat);
        col.position.set(px, 3, pz);
        col.castShadow = true;
        pav.add(col);
      });
    });
    const roof1 = new THREE.Mesh(new THREE.ConeGeometry(5.8, 2.2, 4), goldMat);
    roof1.rotation.y = Math.PI / 4;
    roof1.position.y = 6.8;
    pav.add(roof1);
    const roof2 = new THREE.Mesh(new THREE.ConeGeometry(3.8, 2.0, 4), crimsonWoodMat);
    roof2.rotation.y = Math.PI / 4;
    roof2.position.y = 8.6;
    pav.add(roof2);
    scene.add(pav);
  } else if (biome === 'sumeru-forest') {
    // Colossal Sumeru World Tree & Glowing Dendro Mushrooms
    const worldTree = new THREE.Group();
    worldTree.position.set(0, groundHeightAt(0, -60, biome), -60);
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(2.0, 3.6, 14, 12),
      new THREE.MeshStandardMaterial({ color: '#4d3524', roughness: 0.9 })
    );
    trunk.position.y = 7;
    trunk.castShadow = true;
    worldTree.add(trunk);
    const canopy = new THREE.Mesh(
      new THREE.DodecahedronGeometry(7.2, 1),
      new THREE.MeshStandardMaterial({ color: '#10b981', roughness: 0.72 })
    );
    canopy.scale.set(1.4, 0.72, 1.2);
    canopy.position.y = 14.5;
    worldTree.add(canopy);
    scene.add(worldTree);
  } else if (biome === 'natlan-arena') {
    // Obsidian Pyro Totem Pillars with Eternal Flame Crystals
    [-4.5, 4.5].forEach((px) => {
      const totem = new THREE.Group();
      totem.position.set(px, groundHeightAt(px, -56, biome), -56);
      const col = new THREE.Mesh(new THREE.BoxGeometry(1.6, 8, 1.6), obsidianMat);
      col.position.y = 4;
      col.castShadow = true;
      totem.add(col);
      const flame = new THREE.Mesh(new THREE.OctahedronGeometry(0.95, 0), accentMat);
      flame.position.y = 9.2;
      flame.userData.baseY = 9.2;
      flame.userData.phase = px;
      totem.add(flame);
      floatingAccents.push(flame);
      scene.add(totem);
    });
  }

  // Floating Elemental Monoliths around the Arena
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const rx = Math.cos(a) * 19;
    const rz = -30 + Math.sin(a) * 26;
    const ry = groundHeightAt(rx, rz, biome) + 3.4;

    const crystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.9, 0),
      accentMat
    );
    crystal.scale.set(0.7, 1.65, 0.7);
    crystal.position.set(rx, ry, rz);
    crystal.userData.baseY = ry;
    crystal.userData.phase = i * 1.1;
    scene.add(crystal);
    floatingAccents.push(crystal);
  }

  // Instanced Stylized Grass Tufts (160 lush grass clusters across valley!)
  const grassCount = 160;
  const grassGeo = new THREE.ConeGeometry(0.24, 0.55, 4);
  grassGeo.translate(0, 0.27, 0);
  const grassMat = new THREE.MeshStandardMaterial({
    color: colors.groundSecondary,
    roughness: 0.85,
  });
  const grassInst = new THREE.InstancedMesh(grassGeo, grassMat, grassCount);
  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();

  for (let i = 0; i < grassCount; i++) {
    const gx = ((i * 73) % 52) - 26;
    const gz = -((i * 41) % 64) + 6;
    const gy = groundHeightAt(gx, gz, biome);
    dummy.position.set(gx, gy - 0.04, gz);
    dummy.rotation.y = i * 1.1;
    const sc = 0.7 + (i % 4) * 0.28;
    dummy.scale.set(sc, sc * (0.9 + (i % 3) * 0.25), sc);
    dummy.updateMatrix();
    grassInst.setMatrixAt(i, dummy.matrix);
    tint.set(colors.groundSecondary).offsetHSL(0, 0, ((i % 3) - 1) * 0.06);
    grassInst.setColorAt(i, tint);
  }
  grassInst.computeBoundingSphere();
  scene.add(grassInst);

  // Instanced Stylized Trees & Rocks around the perimeter (48 trees, 32 rocks)
  const treeCount = 48;
  const trunkGeo = new THREE.CylinderGeometry(0.24, 0.42, 2.8, 7);
  trunkGeo.translate(0, 1.4, 0);
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#5c4033', roughness: 0.9 });
  const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
  trunkInst.castShadow = true;

  const crownColor =
    biome === 'sakura-garden'
      ? '#f9a8d4'
      : biome === 'inazuma-crystal'
      ? '#a855f7'
      : biome === 'sacred-peak'
      ? '#bfdbfe'
      : biome === 'natlan-arena'
      ? '#fb923c'
      : '#22c55e';
  const crownGeo = new THREE.DodecahedronGeometry(1.75, 1);
  crownGeo.translate(0, 3.6, 0);
  const crownMat = new THREE.MeshStandardMaterial({ color: crownColor, roughness: 0.75 });
  const crownInst = new THREE.InstancedMesh(crownGeo, crownMat, treeCount);
  crownInst.castShadow = true;

  for (let i = 0; i < treeCount; i++) {
    const angle = (i / treeCount) * Math.PI * 2 + (i % 3) * 0.14;
    const radius = 22 + (i % 5) * 6.8;
    const tx = Math.cos(angle) * radius;
    const tz = -24 + Math.sin(angle) * (radius * 1.18);
    const ty = groundHeightAt(tx, tz, biome);
    const sc = 0.85 + (i % 4) * 0.22;

    dummy.position.set(tx, ty - 0.1, tz);
    dummy.rotation.y = i * 0.7;
    dummy.scale.set(sc, sc, sc);
    dummy.updateMatrix();
    trunkInst.setMatrixAt(i, dummy.matrix);
    crownInst.setMatrixAt(i, dummy.matrix);

    tint.set(crownColor).offsetHSL((i % 3 - 1) * 0.02, 0, (i % 2 - 0.5) * 0.08);
    crownInst.setColorAt(i, tint);
  }
  trunkInst.computeBoundingSphere();
  crownInst.computeBoundingSphere();
  scene.add(trunkInst, crownInst);

  const rockCount = 32;
  const rockGeo = new THREE.DodecahedronGeometry(1.15, 0);
  const rockMat = new THREE.MeshStandardMaterial({ color: '#64748b', roughness: 0.85 });
  const rockInst = new THREE.InstancedMesh(rockGeo, rockMat, rockCount);
  for (let i = 0; i < rockCount; i++) {
    const angle = (i / rockCount) * Math.PI * 2 + 0.3;
    const radius = 19 + (i % 4) * 7.2;
    const rx = Math.cos(angle) * radius;
    const rz = -22 + Math.sin(angle) * (radius * 1.15);
    const ry = groundHeightAt(rx, rz, biome);
    const sc = 0.75 + (i % 3) * 0.35;
    dummy.position.set(rx, ry + sc * 0.35, rz);
    dummy.rotation.set(i * 0.4, i * 0.9, 0);
    dummy.scale.set(sc * 1.2, sc * 0.8, sc);
    dummy.updateMatrix();
    rockInst.setMatrixAt(i, dummy.matrix);
  }
  rockInst.computeBoundingSphere();
  scene.add(rockInst);

  // Atmospheric Ambient Elemental Motes / Petals / Snowflakes
  const moteCount = 90;
  const motePos = new Float32Array(moteCount * 3);
  for (let i = 0; i < moteCount; i++) {
    motePos[i * 3] = (Math.random() - 0.5) * 58;
    motePos[i * 3 + 1] = 1.2 + Math.random() * 14;
    motePos[i * 3 + 2] = -Math.random() * 64 + 6;
  }
  const moteGeo = new THREE.BufferGeometry();
  moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
  const moteMat = new THREE.PointsMaterial({
    map: getSoftParticleTexture(),
    color: biome === 'sakura-garden' ? '#fbcfe8' : colors.accent,
    size: biome === 'sakura-garden' ? 0.55 : 0.42,
    transparent: true,
    opacity: 0.78,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const ambientParticles = new THREE.Points(moteGeo, moteMat);
  scene.add(ambientParticles);

  return { waypointCrystal, campRings, floatingAccents, clouds, ambientParticles };
}
