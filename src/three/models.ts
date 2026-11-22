import * as THREE from 'three';
import { CharacterDef, EnemyArchetype } from '../types/game';
import { SHOP_ITEMS } from '../data/characters';
import {
  createAnimeFaceTexture,
  createContactShadowTexture,
  createHilichurlMaskTexture,
  createOutfitFabricTexture,
  createRuinRuneTexture,
  createSlimeFaceTexture,
  getToonGradientMap,
} from './textures';

export interface HeroRig {
  group: THREE.Group;
  actorOffset: THREE.Group; // For forward dash lunge, knockback & leap height
  pelvisPivot: THREE.Group;
  waistPivot: THREE.Group;
  chestPivot: THREE.Group;
  neckPivot: THREE.Group;
  leftShoulderPivot: THREE.Group;
  rightShoulderPivot: THREE.Group;
  leftElbowPivot: THREE.Group;
  rightElbowPivot: THREE.Group;
  leftHipPivot: THREE.Group;
  rightHipPivot: THREE.Group;
  leftKneePivot: THREE.Group;
  rightKneePivot: THREE.Group;
  capeTopPivot: THREE.Group;
  capeMidPivot: THREE.Group;
  coatTailPivot: THREE.Group;
  hairBackPivot: THREE.Group;
  leftSideHairPivot: THREE.Group;
  rightSideHairPivot: THREE.Group;
  eyelidsGroup: THREE.Group;
  wingsPivot: THREE.Group | null;
  leftWingPivot: THREE.Group | null;
  rightWingPivot: THREE.Group | null;
  weaponPivot: THREE.Group;
  visionOrb: THREE.Mesh;
  visionHalo: THREE.Mesh;
}

export interface EnemyRig {
  group: THREE.Group;
  bodyPivot: THREE.Group;
  leftShoulderPivot?: THREE.Group;
  rightShoulderPivot?: THREE.Group;
  leftElbowPivot?: THREE.Group;
  rightElbowPivot?: THREE.Group;
  leftHipPivot?: THREE.Group;
  rightHipPivot?: THREE.Group;
  leftKneePivot?: THREE.Group;
  rightKneePivot?: THREE.Group;
  haloRing?: THREE.Mesh;
  auraRing: THREE.Mesh;
  coreMesh?: THREE.Mesh;
}

function getWeaponColor(weaponSkinId: string, defaultColor: string): string {
  const item = SHOP_ITEMS.find((i) => i.id === weaponSkinId);
  if (!item || item.id === 'weapon_default') return defaultColor;
  return item.colorHex;
}

function createLatheContour(
  profile: [number, number][],
  segments = 18
): THREE.LatheGeometry {
  const pts = profile.map(([r, y]) => new THREE.Vector2(r, y));
  const geo = new THREE.LatheGeometry(pts, segments);
  geo.computeVertexNormals();
  return geo;
}

// Inverted-hull dark anime ink outline for crisp Genshin silhouette readability
function addAnimeOutline(
  parent: THREE.Object3D,
  mesh: THREE.Mesh,
  thickness = 1.04,
  inkColor = '#1a1528'
) {
  const outlineMat = new THREE.MeshBasicMaterial({
    color: inkColor,
    side: THREE.BackSide,
  });
  const outline = new THREE.Mesh(mesh.geometry, outlineMat);
  outline.position.copy(mesh.position);
  outline.rotation.copy(mesh.rotation);
  outline.scale.set(
    mesh.scale.x * thickness,
    mesh.scale.y * thickness,
    mesh.scale.z * thickness
  );
  parent.add(outline);
}

function createHairStrandMesh(
  length: number,
  width: number,
  curveOut: number,
  mat: THREE.Material
): THREE.Mesh {
  const shape = new THREE.Shape();
  shape.moveTo(-width * 0.5, 0);
  shape.quadraticCurveTo(-width * 0.62, -length * 0.45, 0, -length);
  shape.quadraticCurveTo(width * 0.62, -length * 0.45, width * 0.5, 0);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: width * 0.34,
    bevelEnabled: true,
    bevelThickness: width * 0.14,
    bevelSize: width * 0.12,
    bevelSegments: 2,
    curveSegments: 8,
  });

  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const t = Math.abs(y) / Math.max(length, 0.01);
    pos.setZ(i, pos.getZ(i) + Math.sin(t * Math.PI * 0.85) * curveOut);
  }
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  return mesh;
}

export function buildHeroModel(
  char: CharacterDef,
  weaponSkinId = 'weapon_default',
  wingsId = 'wings_none'
): HeroRig {
  const group = new THREE.Group();
  const actorOffset = new THREE.Group();
  group.add(actorOffset);

  const toonRamp = getToonGradientMap();

  // Contact shadow disc
  const shadowTex = createContactShadowTexture();
  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(1.55, 1.55),
    new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
    })
  );
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = 0.02;
  actorOffset.add(shadowPlane);

  const fabricTex = createOutfitFabricTexture(
    char.colors.outfitPrimary,
    char.colors.outfitSecondary,
    char.colors.goldTrim
  );

  // Genshin Anime-Cel + Metallic PBR Material Palette
  const skinMat = new THREE.MeshToonMaterial({
    color: char.colors.skin,
    gradientMap: toonRamp,
  });
  const hairMat = new THREE.MeshToonMaterial({
    color: char.colors.hair,
    gradientMap: toonRamp,
  });
  const hairAccentMat = new THREE.MeshToonMaterial({
    color: char.colors.hairAccent,
    gradientMap: toonRamp,
  });
  const outfitPrimaryMat = new THREE.MeshToonMaterial({
    map: fabricTex,
    gradientMap: toonRamp,
  });
  const outfitSecondaryMat = new THREE.MeshToonMaterial({
    color: char.colors.outfitSecondary,
    gradientMap: toonRamp,
  });
  const capeMat = new THREE.MeshToonMaterial({
    color: char.colors.cape,
    gradientMap: toonRamp,
    side: THREE.DoubleSide,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: char.colors.goldTrim,
    roughness: 0.16,
    metalness: 0.92,
  });
  const leatherMat = new THREE.MeshStandardMaterial({
    color: '#251e29',
    roughness: 0.44,
    metalness: 0.22,
  });
  const elementGlowMat = new THREE.MeshStandardMaterial({
    color: char.colors.elementHex,
    emissive: char.colors.elementHex,
    emissiveIntensity: 1.05,
    roughness: 0.12,
    metalness: 0.38,
  });

  // =========================================================================
  // 1. PELVIS & ARTICULATED 2-SEGMENT LEGS (Hip + Knee + Sculpted Boots)
  // =========================================================================
  const pelvisPivot = new THREE.Group();
  pelvisPivot.position.set(0, 0.92, 0);
  actorOffset.add(pelvisPivot);

  const pelvisMesh = new THREE.Mesh(
    createLatheContour(
      [
        [0.01, -0.09],
        [0.185, -0.05],
        [0.205, 0.06],
        [0.15, 0.14],
        [0.01, 0.15],
      ],
      18
    ),
    outfitPrimaryMat
  );
  pelvisMesh.scale.set(1.06, 1, 0.78);
  pelvisMesh.castShadow = true;
  pelvisPivot.add(pelvisMesh);
  addAnimeOutline(pelvisPivot, pelvisMesh, 1.035);

  const belt = new THREE.Mesh(
    new THREE.TorusGeometry(0.185, 0.025, 10, 24),
    goldMat
  );
  belt.rotation.x = Math.PI / 2;
  belt.scale.set(1.06, 0.82, 1);
  belt.position.y = 0.12;
  pelvisPivot.add(belt);

  const beltBuckle = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.048, 0),
    elementGlowMat
  );
  beltBuckle.position.set(0, 0.12, 0.175);
  pelvisPivot.add(beltBuckle);

  // Side hip tassets (layered Genshin skirt flaps)
  [-0.19, 0.19].forEach((tx, idx) => {
    const tasset = new THREE.Mesh(
      createHairStrandMesh(0.42, 0.15, -0.04, outfitPrimaryMat).geometry,
      outfitPrimaryMat
    );
    tasset.position.set(tx, 0.1, 0.01);
    tasset.rotation.z = idx === 0 ? -0.18 : 0.18;
    tasset.rotation.y = idx === 0 ? -0.5 : 0.5;
    pelvisPivot.add(tasset);
  });

  // Flowing back coat-tail
  const coatTailPivot = new THREE.Group();
  coatTailPivot.position.set(0, 0.08, -0.1);
  const tailShape = new THREE.Shape();
  tailShape.moveTo(-0.18, 0);
  tailShape.lineTo(0.18, 0);
  tailShape.quadraticCurveTo(0.29, -0.34, 0.25, -0.58);
  tailShape.lineTo(0, -0.47);
  tailShape.lineTo(-0.25, -0.58);
  tailShape.quadraticCurveTo(-0.29, -0.34, -0.18, 0);
  const tailGeo = new THREE.ExtrudeGeometry(tailShape, {
    depth: 0.018,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.008,
  });
  const tailMesh = new THREE.Mesh(tailGeo, outfitPrimaryMat);
  tailMesh.rotation.x = 0.22;
  tailMesh.castShadow = true;
  coatTailPivot.add(tailMesh);
  pelvisPivot.add(coatTailPivot);

  const buildArticulatedLeg = (xOffset: number) => {
    const hipPivot = new THREE.Group();
    hipPivot.position.set(xOffset, -0.02, 0);

    const thighGeo = createLatheContour(
      [
        [0.066, -0.4],
        [0.082, -0.25],
        [0.105, -0.08],
        [0.095, 0.02],
        [0.01, 0.04],
      ],
      16
    );
    const thigh = new THREE.Mesh(thighGeo, outfitSecondaryMat);
    thigh.castShadow = true;
    hipPivot.add(thigh);
    addAnimeOutline(hipPivot, thigh, 1.03);

    const kneePivot = new THREE.Group();
    kneePivot.position.set(0, -0.42, 0);
    hipPivot.add(kneePivot);

    const kneeCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.072, 12, 10),
      goldMat
    );
    kneeCap.scale.set(0.95, 0.85, 0.9);
    kneePivot.add(kneeCap);

    const shinGeo = createLatheContour(
      [
        [0.056, -0.4],
        [0.062, -0.28],
        [0.084, -0.14],
        [0.078, -0.02],
        [0.065, 0.02],
      ],
      16
    );
    const boot = new THREE.Mesh(shinGeo, leatherMat);
    boot.castShadow = true;
    kneePivot.add(boot);
    addAnimeOutline(kneePivot, boot, 1.03);

    const bootCuff = new THREE.Mesh(
      new THREE.TorusGeometry(0.084, 0.016, 8, 16),
      goldMat
    );
    bootCuff.rotation.x = Math.PI / 2;
    bootCuff.position.y = -0.06;
    kneePivot.add(bootCuff);

    const footGroup = new THREE.Group();
    footGroup.position.set(0, -0.42, 0.045);
    const sole = new THREE.Mesh(
      new THREE.BoxGeometry(0.115, 0.06, 0.24),
      leatherMat
    );
    sole.castShadow = true;
    footGroup.add(sole);

    const toeCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.058, 10, 8),
      goldMat
    );
    toeCap.scale.set(0.95, 0.55, 1.15);
    toeCap.position.set(0, -0.005, 0.1);
    footGroup.add(toeCap);

    kneePivot.add(footGroup);
    return { hipPivot, kneePivot };
  };

  const leftLeg = buildArticulatedLeg(-0.115);
  const rightLeg = buildArticulatedLeg(0.115);
  pelvisPivot.add(leftLeg.hipPivot, rightLeg.hipPivot);

  // =========================================================================
  // 2. WAIST, CHEST, COLLAR, ELEMENTAL VISION HALO & FLOWING CAPE
  // =========================================================================
  const waistPivot = new THREE.Group();
  waistPivot.position.set(0, 0.14, 0);
  pelvisPivot.add(waistPivot);

  const chestPivot = new THREE.Group();
  chestPivot.position.set(0, 0.04, 0);
  waistPivot.add(chestPivot);

  const torsoGeo = createLatheContour(
    [
      [0.01, -0.04],
      [0.135, 0.0],
      [0.16, 0.14],
      [0.215, 0.34],
      [0.19, 0.44],
      [0.09, 0.48],
      [0.01, 0.48],
    ],
    18
  );
  const torso = new THREE.Mesh(torsoGeo, outfitPrimaryMat);
  torso.scale.set(1.06, 1, 0.72);
  torso.castShadow = true;
  chestPivot.add(torso);
  addAnimeOutline(chestPivot, torso, 1.035);

  const vestGeo = createLatheContour(
    [
      [0.145, 0.04],
      [0.168, 0.16],
      [0.222, 0.34],
      [0.16, 0.43],
    ],
    16
  );
  const vest = new THREE.Mesh(vestGeo, outfitSecondaryMat);
  vest.scale.set(1.04, 1, 0.75);
  chestPivot.add(vest);

  // Collar scarf + gold clasp
  const collar = new THREE.Mesh(
    new THREE.TorusGeometry(0.118, 0.032, 8, 20),
    capeMat
  );
  collar.rotation.x = Math.PI / 2 + 0.18;
  collar.position.set(0, 0.44, 0.02);
  chestPivot.add(collar);

  const visionBezel = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.068, 0),
    goldMat
  );
  visionBezel.position.set(0, 0.33, 0.17);
  visionBezel.scale.set(1, 1.15, 0.4);
  chestPivot.add(visionBezel);

  const visionOrb = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.05, 1),
    elementGlowMat
  );
  visionOrb.position.set(0, 0.33, 0.19);
  chestPivot.add(visionOrb);

  // Subtle floating Elemental Vision Halo behind upper back (Genshin iconic flair)
  const visionHalo = new THREE.Mesh(
    new THREE.TorusGeometry(0.28, 0.014, 8, 28),
    elementGlowMat
  );
  visionHalo.position.set(0, 0.34, -0.26);
  chestPivot.add(visionHalo);

  // 2-Segment Flowing Cape
  const capeTopPivot = new THREE.Group();
  capeTopPivot.position.set(0, 0.42, -0.14);
  chestPivot.add(capeTopPivot);

  const capeUpperShape = new THREE.Shape();
  capeUpperShape.moveTo(-0.18, 0);
  capeUpperShape.lineTo(0.18, 0);
  capeUpperShape.lineTo(0.27, -0.45);
  capeUpperShape.lineTo(-0.27, -0.45);
  capeUpperShape.closePath();
  const capeUpper = new THREE.Mesh(
    new THREE.ExtrudeGeometry(capeUpperShape, {
      depth: 0.015,
      bevelEnabled: true,
      bevelThickness: 0.006,
      bevelSize: 0.006,
    }),
    capeMat
  );
  capeUpper.castShadow = true;
  capeTopPivot.add(capeUpper);

  const capeMidPivot = new THREE.Group();
  capeMidPivot.position.set(0, -0.44, 0);
  capeTopPivot.add(capeMidPivot);

  const capeLowerShape = new THREE.Shape();
  capeLowerShape.moveTo(-0.27, 0);
  capeLowerShape.lineTo(0.27, 0);
  capeLowerShape.lineTo(0.38, -0.48);
  capeLowerShape.lineTo(0, -0.6);
  capeLowerShape.lineTo(-0.38, -0.48);
  capeLowerShape.closePath();
  const capeLower = new THREE.Mesh(
    new THREE.ExtrudeGeometry(capeLowerShape, {
      depth: 0.014,
      bevelEnabled: true,
      bevelThickness: 0.006,
      bevelSize: 0.006,
    }),
    capeMat
  );
  capeLower.castShadow = true;
  capeMidPivot.add(capeLower);

  // Optional Articulated 3D Glider Wings
  let wingsPivot: THREE.Group | null = null;
  let leftWingPivot: THREE.Group | null = null;
  let rightWingPivot: THREE.Group | null = null;
  if (wingsId !== 'wings_none') {
    wingsPivot = new THREE.Group();
    wingsPivot.position.set(0, 0.36, -0.17);
    const wingColor = wingsId === 'wings_golden' ? '#facc15' : '#38bdf8';
    const wingMat = new THREE.MeshStandardMaterial({
      color: wingColor,
      emissive: wingColor,
      emissiveIntensity: 0.35,
      roughness: 0.2,
      metalness: 0.68,
      side: THREE.DoubleSide,
    });
    const wShape = new THREE.Shape();
    wShape.moveTo(0, 0);
    wShape.quadraticCurveTo(0.62, 0.4, 1.1, 0.16);
    wShape.quadraticCurveTo(0.78, -0.22, 0.4, -0.44);
    wShape.lineTo(0, -0.15);
    wShape.closePath();
    const wGeo = new THREE.ExtrudeGeometry(wShape, {
      depth: 0.018,
      bevelEnabled: true,
      bevelThickness: 0.008,
      bevelSize: 0.008,
    });

    rightWingPivot = new THREE.Group();
    rightWingPivot.position.set(0.06, 0, 0);
    rightWingPivot.add(new THREE.Mesh(wGeo, wingMat));

    leftWingPivot = new THREE.Group();
    leftWingPivot.position.set(-0.06, 0, 0);
    const lWing = new THREE.Mesh(wGeo, wingMat);
    lWing.scale.x = -1;
    leftWingPivot.add(lWing);

    wingsPivot.add(leftWingPivot, rightWingPivot);
    chestPivot.add(wingsPivot);
  }

  // =========================================================================
  // 3. NECK, SCULPTED ANIME HEAD, BLINKING EYELIDS & LAYERED HAIR
  // =========================================================================
  const neckPivot = new THREE.Group();
  neckPivot.position.set(0, 0.48, 0);
  chestPivot.add(neckPivot);

  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.074, 0.12, 12),
    skinMat
  );
  neck.position.y = 0.04;
  neckPivot.add(neck);

  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.22, 0.01);
  neckPivot.add(headGroup);

  const cranium = new THREE.Mesh(
    new THREE.SphereGeometry(0.21, 26, 22),
    skinMat
  );
  cranium.scale.set(0.98, 1.02, 0.94);
  cranium.castShadow = true;
  headGroup.add(cranium);
  addAnimeOutline(headGroup, cranium, 1.032);

  const chin = new THREE.Mesh(
    new THREE.ConeGeometry(0.142, 0.14, 18),
    skinMat
  );
  chin.rotation.x = Math.PI;
  chin.scale.set(1.02, 1, 0.78);
  chin.position.set(0, -0.14, 0.04);
  headGroup.add(chin);

  [-0.2, 0.2].forEach((ex) => {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 8), skinMat);
    ear.scale.set(0.45, 1.1, 0.7);
    ear.position.set(ex, -0.02, -0.02);
    headGroup.add(ear);
  });

  const faceTex = createAnimeFaceTexture(char.colors.elementHex);
  const facePlane = new THREE.Mesh(
    new THREE.CylinderGeometry(0.213, 0.186, 0.3, 22, 1, true, -0.66, 1.32),
    new THREE.MeshBasicMaterial({
      map: faceTex,
      transparent: true,
    })
  );
  facePlane.position.set(0, -0.015, 0.009);
  headGroup.add(facePlane);

  const eyelidsGroup = new THREE.Group();
  eyelidsGroup.position.set(0, 0.02, 0.198);
  eyelidsGroup.scale.y = 0.01;
  eyelidsGroup.visible = false;
  [-0.075, 0.075].forEach((lx) => {
    const lid = new THREE.Mesh(
      new THREE.BoxGeometry(0.078, 0.05, 0.03),
      skinMat
    );
    lid.position.x = lx;
    eyelidsGroup.add(lid);
  });
  headGroup.add(eyelidsGroup);

  const hairCrown = new THREE.Mesh(
    new THREE.SphereGeometry(0.228, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.62),
    hairMat
  );
  hairCrown.position.set(0, 0.03, -0.015);
  hairCrown.rotation.x = -0.18;
  hairCrown.castShadow = true;
  headGroup.add(hairCrown);
  addAnimeOutline(headGroup, hairCrown, 1.03);

  // Signature anime curved ahoge tuft on top
  const ahoge = createHairStrandMesh(0.14, 0.045, 0.04, hairAccentMat);
  ahoge.position.set(0, 0.25, 0.02);
  ahoge.rotation.x = -2.4;
  ahoge.rotation.z = 0.25;
  headGroup.add(ahoge);

  for (let i = -2; i <= 2; i++) {
    const bang = createHairStrandMesh(
      0.22 - Math.abs(i) * 0.015,
      0.084,
      0.035,
      i === 0 ? hairAccentMat : hairMat
    );
    bang.position.set(i * 0.068, 0.19, 0.156 - Math.abs(i) * 0.028);
    bang.rotation.y = i * 0.24;
    bang.rotation.z = -i * 0.12;
    headGroup.add(bang);
  }

  const leftSideHairPivot = new THREE.Group();
  leftSideHairPivot.position.set(-0.185, 0.12, 0.09);
  leftSideHairPivot.add(createHairStrandMesh(0.4, 0.082, 0.04, hairMat));
  headGroup.add(leftSideHairPivot);

  const rightSideHairPivot = new THREE.Group();
  rightSideHairPivot.position.set(0.185, 0.12, 0.09);
  rightSideHairPivot.add(createHairStrandMesh(0.4, 0.082, 0.04, hairMat));
  headGroup.add(rightSideHairPivot);

  const hairBackPivot = new THREE.Group();
  hairBackPivot.position.set(0, 0.1, -0.17);
  headGroup.add(hairBackPivot);

  if (char.hairStyle === 'braid') {
    for (let i = 0; i < 6; i++) {
      const seg = new THREE.Mesh(
        new THREE.SphereGeometry(0.062 - i * 0.007, 10, 10),
        i % 2 === 0 ? hairMat : hairAccentMat
      );
      seg.position.set(0, -i * 0.095, -0.02 - i * 0.012);
      seg.castShadow = true;
      hairBackPivot.add(seg);
    }
  } else if (char.hairStyle === 'twintails') {
    [-0.17, 0.17].forEach((tx, idx) => {
      const tail = createHairStrandMesh(0.64, 0.125, -0.08, hairMat);
      tail.position.set(tx, 0.06, 0.03);
      tail.rotation.z = idx === 0 ? -0.26 : 0.26;
      hairBackPivot.add(tail);

      const ribbon = new THREE.Mesh(new THREE.OctahedronGeometry(0.044, 0), goldMat);
      ribbon.position.set(tx * 0.9, 0.08, 0.04);
      hairBackPivot.add(ribbon);
    });
  } else if (char.hairStyle === 'bob') {
    for (let i = -2; i <= 2; i++) {
      const lock = createHairStrandMesh(0.35, 0.115, -0.03, hairMat);
      lock.position.set(i * 0.075, 0.06, 0.02 - Math.abs(i) * 0.02);
      lock.rotation.y = i * 0.25;
      hairBackPivot.add(lock);
    }
  } else {
    for (let i = -2; i <= 2; i++) {
      const spike = createHairStrandMesh(0.32, 0.105, -0.07, i % 2 === 0 ? hairMat : hairAccentMat);
      spike.position.set(i * 0.07, 0.12, 0.02);
      spike.rotation.x = -0.35;
      spike.rotation.y = i * 0.22;
      hairBackPivot.add(spike);
    }
  }

  // =========================================================================
  // 4. ARTICULATED 2-SEGMENT ARMS & SIGNATURE GENSHIN WEAPON
  // =========================================================================
  const buildArticulatedArm = (xOffset: number) => {
    const shoulderPivot = new THREE.Group();
    shoulderPivot.position.set(xOffset, 0.41, 0);

    const pauldron = new THREE.Mesh(
      new THREE.SphereGeometry(0.082, 14, 10),
      goldMat
    );
    pauldron.scale.set(1.15, 0.72, 0.95);
    shoulderPivot.add(pauldron);

    const upperArmGeo = createLatheContour(
      [
        [0.046, -0.24],
        [0.056, -0.12],
        [0.062, -0.02],
        [0.04, 0.02],
      ],
      12
    );
    const upperArm = new THREE.Mesh(upperArmGeo, outfitSecondaryMat);
    upperArm.castShadow = true;
    shoulderPivot.add(upperArm);

    const elbowPivot = new THREE.Group();
    elbowPivot.position.set(0, -0.25, 0);
    shoulderPivot.add(elbowPivot);

    elbowPivot.add(
      new THREE.Mesh(new THREE.SphereGeometry(0.046, 10, 10), outfitPrimaryMat)
    );

    const forearmGeo = createLatheContour(
      [
        [0.036, -0.22],
        [0.046, -0.1],
        [0.05, -0.02],
        [0.04, 0.01],
      ],
      12
    );
    const forearm = new THREE.Mesh(forearmGeo, leatherMat);
    forearm.castShadow = true;
    elbowPivot.add(forearm);

    const hand = new THREE.Mesh(
      new THREE.SphereGeometry(0.044, 10, 10),
      skinMat
    );
    hand.scale.set(0.88, 1.1, 0.85);
    hand.position.y = -0.25;
    elbowPivot.add(hand);

    return { shoulderPivot, elbowPivot };
  };

  const leftArm = buildArticulatedArm(-0.245);
  const rightArm = buildArticulatedArm(0.245);
  chestPivot.add(leftArm.shoulderPivot, rightArm.shoulderPivot);

  const weaponPivot = new THREE.Group();
  weaponPivot.position.set(0, -0.26, 0.04);
  rightArm.elbowPivot.add(weaponPivot);

  const wColor = getWeaponColor(weaponSkinId, char.colors.elementHex);
  const bladeMat = new THREE.MeshStandardMaterial({
    color: wColor,
    emissive: wColor,
    emissiveIntensity: 0.52,
    roughness: 0.14,
    metalness: 0.88,
  });

  if (char.weaponType === 'sword' || char.weaponType === 'claymore') {
    const isClaymore = char.weaponType === 'claymore';
    const hilt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.022, 0.26, 10),
      leatherMat
    );
    hilt.rotation.x = Math.PI / 2;
    weaponPivot.add(hilt);

    const pommel = new THREE.Mesh(new THREE.OctahedronGeometry(0.038, 0), goldMat);
    pommel.position.z = -0.14;
    weaponPivot.add(pommel);

    const guard = new THREE.Mesh(
      new THREE.BoxGeometry(isClaymore ? 0.36 : 0.24, 0.042, 0.06),
      goldMat
    );
    guard.position.z = 0.12;
    weaponPivot.add(guard);

    const bladeCore = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.038, 0),
      elementGlowMat
    );
    bladeCore.position.z = 0.16;
    weaponPivot.add(bladeCore);

    const bladeShape = new THREE.Shape();
    const bw = isClaymore ? 0.088 : 0.048;
    const bl = isClaymore ? 1.28 : 1.02;
    bladeShape.moveTo(-bw, 0);
    bladeShape.lineTo(bw, 0);
    bladeShape.lineTo(bw * 0.72, bl * 0.84);
    bladeShape.lineTo(0, bl);
    bladeShape.lineTo(-bw * 0.72, bl * 0.84);
    bladeShape.closePath();

    const blade = new THREE.Mesh(
      new THREE.ExtrudeGeometry(bladeShape, {
        depth: 0.016,
        bevelEnabled: true,
        bevelThickness: 0.008,
        bevelSize: 0.006,
      }),
      bladeMat
    );
    blade.rotation.x = Math.PI / 2;
    blade.position.set(0, 0.008, 0.14);
    blade.castShadow = true;
    weaponPivot.add(blade);
  } else if (char.weaponType === 'polearm') {
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 1.85, 10),
      goldMat
    );
    shaft.rotation.x = Math.PI / 2;
    shaft.position.z = 0.34;
    weaponPivot.add(shaft);

    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.42, 6), bladeMat);
    tip.rotation.x = Math.PI / 2;
    tip.position.z = 1.42;
    weaponPivot.add(tip);

    const crescent = new THREE.Mesh(
      new THREE.TorusGeometry(0.11, 0.018, 6, 14, Math.PI),
      goldMat
    );
    crescent.rotation.x = Math.PI / 2;
    crescent.position.z = 1.18;
    weaponPivot.add(crescent);
  } else {
    // Floating Open Hydro Catalyst Tome + Orbiting Halo Ring
    const tomeCover = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 0.32, 0.05),
      outfitPrimaryMat
    );
    tomeCover.position.set(0.16, 0.18, 0.28);
    tomeCover.rotation.y = 0.45;
    weaponPivot.add(tomeCover);

    const tomeCore = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.095, 0),
      bladeMat
    );
    tomeCore.position.set(0.16, 0.18, 0.36);
    weaponPivot.add(tomeCore);

    const tomeRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.22, 0.012, 8, 24),
      goldMat
    );
    tomeRing.position.set(0.16, 0.18, 0.32);
    weaponPivot.add(tomeRing);
  }

  return {
    group,
    actorOffset,
    pelvisPivot,
    waistPivot,
    chestPivot,
    neckPivot,
    leftShoulderPivot: leftArm.shoulderPivot,
    rightShoulderPivot: rightArm.shoulderPivot,
    leftElbowPivot: leftArm.elbowPivot,
    rightElbowPivot: rightArm.elbowPivot,
    leftHipPivot: leftLeg.hipPivot,
    rightHipPivot: rightLeg.hipPivot,
    leftKneePivot: leftLeg.kneePivot,
    rightKneePivot: rightLeg.kneePivot,
    capeTopPivot,
    capeMidPivot,
    coatTailPivot,
    hairBackPivot,
    leftSideHairPivot,
    rightSideHairPivot,
    eyelidsGroup,
    wingsPivot,
    leftWingPivot,
    rightWingPivot,
    weaponPivot,
    visionOrb,
    visionHalo,
  };
}

export function buildEnemyModel(
  archetype: EnemyArchetype,
  elementHex: string,
  level: 1 | 2 | 3
): EnemyRig {
  const group = new THREE.Group();
  const bodyPivot = new THREE.Group();
  group.add(bodyPivot);

  const toonRamp = getToonGradientMap();

  const shadowTex = createContactShadowTexture();
  const shadowSize = level === 3 ? 3.2 : level === 2 ? 2.1 : 1.75;
  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(shadowSize, shadowSize),
    new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
    })
  );
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = 0.02;
  group.add(shadowPlane);

  const auraRing = new THREE.Mesh(
    new THREE.RingGeometry(shadowSize * 0.42, shadowSize * 0.5, 32),
    new THREE.MeshBasicMaterial({
      color: elementHex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7,
    })
  );
  auraRing.rotation.x = -Math.PI / 2;
  auraRing.position.y = 0.03;
  group.add(auraRing);

  const elemMat = new THREE.MeshStandardMaterial({
    color: elementHex,
    emissive: elementHex,
    emissiveIntensity: 0.55,
    roughness: 0.16,
    metalness: 0.3,
  });
  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: '#2c3042',
    roughness: 0.34,
    metalness: 0.8,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: '#eab308',
    roughness: 0.2,
    metalness: 0.9,
  });

  if (archetype === 'slime') {
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.74, 26, 20),
      new THREE.MeshToonMaterial({
        color: elementHex,
        gradientMap: toonRamp,
        transparent: true,
        opacity: 0.86,
      })
    );
    dome.scale.set(1.14, 0.86, 1.14);
    dome.position.y = 0.6;
    dome.castShadow = true;
    bodyPivot.add(dome);
    addAnimeOutline(bodyPivot, dome, 1.035);

    const coreMesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.32, 1),
      elemMat
    );
    coreMesh.position.y = 0.58;
    bodyPivot.add(coreMesh);

    const slimeFaceTex = createSlimeFaceTexture(false);
    const facePlane = new THREE.Mesh(
      new THREE.CylinderGeometry(0.81, 0.8, 0.56, 18, 1, true, -0.55, 1.1),
      new THREE.MeshBasicMaterial({ map: slimeFaceTex, transparent: true })
    );
    facePlane.position.y = 0.62;
    bodyPivot.add(facePlane);

    [-0.28, 0.28].forEach((hx, i) => {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.38, 6), goldMat);
      horn.position.set(hx, 1.24, 0.06);
      horn.rotation.z = i === 0 ? 0.32 : -0.32;
      bodyPivot.add(horn);
    });

    return { group, bodyPivot, auraRing, coreMesh };
  }

  if (archetype === 'hilichurl') {
    const skinMat = new THREE.MeshToonMaterial({
      color: '#2b2435',
      gradientMap: toonRamp,
    });
    const maskTex = createHilichurlMaskTexture();
    const maskMat = new THREE.MeshToonMaterial({
      map: maskTex,
      gradientMap: toonRamp,
    });

    const buildJointedLimb = (x: number, y: number, r: number, upperLen: number, lowerLen: number) => {
      const p = new THREE.Group();
      p.position.set(x, y, 0);
      const upper = new THREE.Mesh(new THREE.CapsuleGeometry(r, upperLen, 6, 12), skinMat);
      upper.position.y = -upperLen * 0.55;
      upper.castShadow = true;
      p.add(upper);

      const lowerPivot = new THREE.Group();
      lowerPivot.position.set(0, -upperLen * 1.05, 0);
      const lower = new THREE.Mesh(new THREE.CapsuleGeometry(r * 0.88, lowerLen, 6, 12), skinMat);
      lower.position.y = -lowerLen * 0.55;
      lower.castShadow = true;
      lowerPivot.add(lower);
      p.add(lowerPivot);
      return { p, lowerPivot };
    };

    const lLeg = buildJointedLimb(-0.19, 0.78, 0.095, 0.28, 0.28);
    const rLeg = buildJointedLimb(0.19, 0.78, 0.095, 0.28, 0.28);
    bodyPivot.add(lLeg.p, rLeg.p);

    const torso = new THREE.Mesh(
      createLatheContour(
        [
          [0.01, 0.72],
          [0.2, 0.78],
          [0.26, 1.08],
          [0.34, 1.4],
          [0.16, 1.5],
          [0.01, 1.52],
        ],
        16
      ),
      skinMat
    );
    torso.castShadow = true;
    bodyPivot.add(torso);
    addAnimeOutline(bodyPivot, torso, 1.035);

    const mane = new THREE.Mesh(
      new THREE.TorusGeometry(0.31, 0.12, 8, 18),
      new THREE.MeshToonMaterial({ color: '#61516e', gradientMap: toonRamp })
    );
    mane.rotation.x = Math.PI / 2;
    mane.position.y = 1.44;
    bodyPivot.add(mane);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 18, 14), skinMat);
    head.position.y = 1.66;
    bodyPivot.add(head);

    const mask = new THREE.Mesh(new THREE.CylinderGeometry(0.275, 0.235, 0.08, 16), maskMat);
    mask.rotation.x = Math.PI / 2;
    mask.position.set(0, 1.66, 0.24);
    bodyPivot.add(mask);

    [-0.09, 0.09].forEach((ex) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.048, 8, 8), elemMat);
      eye.position.set(ex, 1.68, 0.29);
      bodyPivot.add(eye);
    });

    [-0.22, 0.22].forEach((hx, i) => {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.38, 7), maskMat);
      horn.position.set(hx, 1.96, 0.15);
      horn.rotation.z = i === 0 ? 0.45 : -0.45;
      bodyPivot.add(horn);
    });

    const lArm = buildJointedLimb(-0.4, 1.38, 0.085, 0.24, 0.24);
    const rArm = buildJointedLimb(0.4, 1.38, 0.085, 0.24, 0.24);
    bodyPivot.add(lArm.p, rArm.p);

    // Tribal Wooden Shield on Left Arm
    const shield = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.32, 0.06, 12),
      new THREE.MeshToonMaterial({ color: '#7c4a2d', gradientMap: toonRamp })
    );
    shield.rotation.z = Math.PI / 2;
    shield.position.set(-0.1, -0.2, 0.15);
    lArm.lowerPivot.add(shield);

    const shieldBoss = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), elemMat);
    shieldBoss.position.set(-0.15, -0.2, 0.15);
    lArm.lowerPivot.add(shieldBoss);

    // Elemental Spiked Club on Right Arm
    const club = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.04, 0.98, 8),
      darkMetalMat
    );
    club.rotation.x = Math.PI / 2;
    club.position.set(0, -0.32, 0.38);
    rArm.lowerPivot.add(club);

    const clubGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.15, 0), elemMat);
    clubGem.position.set(0, -0.32, 0.9);
    rArm.lowerPivot.add(clubGem);

    return {
      group,
      bodyPivot,
      leftShoulderPivot: lArm.p,
      rightShoulderPivot: rArm.p,
      leftElbowPivot: lArm.lowerPivot,
      rightElbowPivot: rArm.lowerPivot,
      leftHipPivot: lLeg.p,
      rightHipPivot: rLeg.p,
      leftKneePivot: lLeg.lowerPivot,
      rightKneePivot: rLeg.lowerPivot,
      auraRing,
      coreMesh: clubGem,
    };
  }

  // LEVEL 3 BOSS: Towering Genshin Ruin Guardian Overlord
  const ruinTex = createRuinRuneTexture(elementHex);
  const armorMat = new THREE.MeshStandardMaterial({
    map: ruinTex,
    roughness: 0.35,
    metalness: 0.72,
  });

  const buildBossLeg = (x: number) => {
    const p = new THREE.Group();
    p.position.set(x, 1.08, 0);
    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.18, 0.54, 10), armorMat);
    thigh.position.y = -0.27;
    thigh.castShadow = true;
    p.add(thigh);

    const kneePivot = new THREE.Group();
    kneePivot.position.y = -0.54;
    kneePivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 10), goldMat));
    const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 0.52, 10), darkMetalMat);
    shin.position.y = -0.26;
    shin.castShadow = true;
    kneePivot.add(shin);
    p.add(kneePivot);
    return { p, kneePivot };
  };

  const bLLeg = buildBossLeg(-0.38);
  const bRLeg = buildBossLeg(0.38);
  bodyPivot.add(bLLeg.p, bRLeg.p);

  const chest = new THREE.Mesh(
    createLatheContour(
      [
        [0.01, 1.05],
        [0.42, 1.15],
        [0.62, 1.72],
        [0.68, 2.08],
        [0.36, 2.22],
        [0.01, 2.24],
      ],
      14
    ),
    armorMat
  );
  chest.castShadow = true;
  bodyPivot.add(chest);
  addAnimeOutline(bodyPivot, chest, 1.03);

  const coreMesh = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.28, 0),
    elemMat
  );
  coreMesh.position.set(0, 1.66, 0.6);
  bodyPivot.add(coreMesh);

  const haloRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.05, 0.055, 10, 36),
    elemMat
  );
  haloRing.position.set(0, 2.08, -0.48);
  bodyPivot.add(haloRing);

  const helm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.36, 0.48, 8),
    armorMat
  );
  helm.position.y = 2.46;
  bodyPivot.add(helm);

  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 12), elemMat);
  visor.position.set(0, 2.46, 0.3);
  bodyPivot.add(visor);

  [-0.38, 0.38].forEach((hx, i) => {
    const crownHorn = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.58, 6), goldMat);
    crownHorn.position.set(hx, 2.75, 0);
    crownHorn.rotation.z = i === 0 ? 0.35 : -0.35;
    bodyPivot.add(crownHorn);
  });

  const buildBossArm = (x: number) => {
    const p = new THREE.Group();
    p.position.set(x, 2.0, 0);
    p.add(new THREE.Mesh(new THREE.DodecahedronGeometry(0.3, 0), goldMat));
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.14, 0.5, 8), armorMat);
    upper.position.y = -0.26;
    upper.castShadow = true;
    p.add(upper);

    const elbowPivot = new THREE.Group();
    elbowPivot.position.y = -0.52;
    const fore = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.46, 8), darkMetalMat);
    fore.position.y = -0.22;
    elbowPivot.add(fore);
    p.add(elbowPivot);
    return { p, elbowPivot };
  };
  const bLArm = buildBossArm(-0.78);
  const bRArm = buildBossArm(0.78);
  bodyPivot.add(bLArm.p, bRArm.p);

  const staff = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 2.55, 8),
    goldMat
  );
  staff.rotation.x = Math.PI / 2;
  staff.position.set(0, -0.38, 0.58);
  bRArm.elbowPivot.add(staff);

  const axeHead = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.32, 0),
    elemMat
  );
  axeHead.scale.set(0.45, 1.35, 1.15);
  axeHead.position.set(0, -0.38, 1.75);
  bRArm.elbowPivot.add(axeHead);

  return {
    group,
    bodyPivot,
    leftShoulderPivot: bLArm.p,
    rightShoulderPivot: bRArm.p,
    leftElbowPivot: bLArm.elbowPivot,
    rightElbowPivot: bRArm.elbowPivot,
    leftHipPivot: bLLeg.p,
    rightHipPivot: bRLeg.p,
    leftKneePivot: bLLeg.kneePivot,
    rightKneePivot: bRLeg.kneePivot,
    haloRing,
    auraRing,
    coreMesh,
  };
}
