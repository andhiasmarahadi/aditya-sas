import * as THREE from 'three';
import { EnemyRig, HeroRig } from './models';

export interface HeroAnimInput {
  t: number;
  dt: number;
  isMoving: boolean;
  isSprinting: boolean;
  isGrounded: boolean;
  walkPhase: number;
  attackTimer: number; // Counts down from 0.95 -> 0
  burstTimer: number; // Counts down from 1.25 -> 0
  hitTimer?: number; // Counts down from 0.55 -> 0 when struck by enemy
  battleMode?: boolean;
}

export function updateHeroAnimation(rig: HeroRig, input: HeroAnimInput) {
  const {
    t,
    dt,
    isMoving,
    isSprinting,
    isGrounded,
    walkPhase,
    attackTimer,
    burstTimer,
    hitTimer = 0,
    battleMode = false,
  } = input;

  const damp = (cur: number, target: number, lambda = 14) =>
    THREE.MathUtils.damp(cur, target, lambda, dt);

  // Natural eye blinking every ~3.4 seconds
  const blinkCycle = t % 3.4;
  const isBlinking = blinkCycle > 3.24;
  rig.eyelidsGroup.visible = isBlinking;
  if (isBlinking) {
    rig.eyelidsGroup.scale.y = Math.sin(((blinkCycle - 3.24) / 0.16) * Math.PI);
  }

  rig.visionOrb.rotation.y = t * 2.3;
  rig.visionHalo.rotation.z = -t * 1.1;

  // Root dash / leap / knockback offset along local actor Z/Y
  let offsetZ = 0;
  let offsetY = 0;

  let pelvisY = 0.92;
  let pelvisRotY = 0;
  let pelvisRotZ = 0;
  let waistRotX = 0;
  let waistRotY = 0;
  let chestRotX = 0;
  let chestRotY = 0;
  let neckRotX = 0;
  let neckRotY = 0;

  let lHipX = 0;
  let rHipX = 0;
  let lHipZ = 0.04;
  let rHipZ = -0.04;
  let lKneeX = 0.06;
  let rKneeX = 0.06;

  let lShX = 0.08;
  let rShX = -0.14;
  let lShZ = -0.18;
  let rShZ = 0.18;
  let lElbX = -0.45;
  let rElbX = -0.58;

  let capeTopX = 0.14;
  let capeMidX = 0.08;
  let hairBackX = 0.08;

  if (burstTimer > 0) {
    // GENSHIN ELEMENTAL BURST: Dash forward -> Sky Leap -> Overhead Plunge Slam!
    const prog = 1 - burstTimer / 1.25;
    if (prog < 0.25) {
      // Sprint leap into air
      const p = prog / 0.25;
      offsetZ = p * 2.4;
      offsetY = Math.sin(p * Math.PI * 0.5) * 1.55;
      pelvisY = 0.88;
      waistRotX = -0.25 * p;
      rShX = -2.6 * p;
      lShX = -1.2 * p;
      lHipX = -0.6 * p;
      lKneeX = 1.0 * p;
      capeTopX = 0.85;
      hairBackX = 0.65;
    } else if (prog < 0.62) {
      // Plunge cleave forward onto enemy!
      const p = (prog - 0.25) / 0.37;
      offsetZ = 2.4 + p * 0.8;
      offsetY = (1 - p * p) * 1.55;
      pelvisRotY = Math.sin(p * Math.PI) * 0.5;
      waistRotX = -0.25 + p * 0.85;
      waistRotY = -0.4 + p * 1.1;
      rShX = -2.6 + p * 2.9;
      rShZ = 0.45 - p * 0.7;
      rElbX = -0.15;
      lShX = 0.4;
      lShZ = -0.65;
      lHipX = -0.55;
      rHipX = 0.45;
      lKneeX = 0.75;
      rKneeX = 0.25;
      capeTopX = 0.95;
      capeMidX = 0.45;
      hairBackX = 0.72;
    } else {
      // Agile back-vault landing back to duel spot
      const p = (prog - 0.62) / 0.38;
      offsetZ = (1 - p) * 3.2;
      offsetY = Math.sin(p * Math.PI) * 0.45;
      waistRotX = 0.22 * (1 - p);
      rShX = -0.45;
      lShZ = -0.35;
      capeTopX = 0.65 * (1 - p) + 0.18;
      hairBackX = 0.4 * (1 - p);
    }
  } else if (attackTimer > 0) {
    // REALISTIC 3-PHASE MELEE DASH COMBO:
    // Phase 1 (0..0.24): Explosive dash forward toward enemy
    // Phase 2 (0.24..0.64): Wide diagonal cleave + follow-through spin
    // Phase 3 (0.64..1.0): Agile hop-back recovery
    const prog = 1 - attackTimer / 0.95;
    if (prog < 0.24) {
      const p = prog / 0.24;
      offsetZ = p * 2.85;
      offsetY = Math.sin(p * Math.PI) * 0.22;
      waistRotX = 0.34 * p;
      waistRotY = -0.55 * p;
      rShX = -1.9 * p;
      rShZ = 0.55 * p;
      rElbX = -0.45;
      lShX = 0.45 * p;
      lHipX = -0.45 * p;
      rHipX = 0.42 * p;
      lKneeX = 0.75 * p;
      capeTopX = 0.85;
      hairBackX = 0.6;
    } else if (prog < 0.64) {
      const p = (prog - 0.24) / 0.4;
      const slash = Math.sin(p * Math.PI);
      offsetZ = 2.85 + slash * 0.35;
      pelvisRotY = -0.25 + p * 0.75;
      waistRotY = -0.55 + p * 1.45;
      waistRotX = 0.28 - p * 0.18;
      rShX = -1.9 + p * 2.45;
      rShZ = 0.55 - p * 0.95;
      rElbX = -0.14;
      lShX = 0.35 * slash;
      lShZ = -0.48;
      lElbX = -0.82;
      lHipX = -0.48;
      rHipX = 0.42;
      lKneeX = 0.65;
      rKneeX = 0.2;
      capeTopX = 0.72;
      capeMidX = 0.35;
      hairBackX = 0.55;
    } else {
      const p = (prog - 0.64) / 0.36;
      offsetZ = (1 - p) * 2.85;
      offsetY = Math.sin(p * Math.PI) * 0.35;
      waistRotX = 0.15;
      rShX = -0.52;
      lShZ = -0.3;
      lHipX = -0.25;
      rHipX = 0.25;
      lKneeX = 0.42;
      rKneeX = 0.35;
      capeTopX = 0.48;
      hairBackX = 0.3;
    }
  } else if (hitTimer > 0) {
    // Realistic stagger guard recoil when struck by monster
    const p = Math.sin((hitTimer / 0.55) * Math.PI);
    offsetZ = -p * 0.55;
    waistRotX = -0.25 * p;
    waistRotY = 0.35 * p;
    lShX = -1.1 * p;
    lShZ = 0.35;
    lElbX = -1.25;
    rShX = -0.3;
    lHipX = -0.25;
    rHipX = 0.25;
    lKneeX = 0.45 * p;
    rKneeX = 0.45 * p;
    capeTopX = 0.55 * p;
  } else if (!isGrounded) {
    pelvisY = 0.95;
    waistRotX = 0.12;
    lHipX = -0.58;
    rHipX = -0.22;
    lKneeX = 0.92;
    rKneeX = 0.45;
    lShX = -0.55;
    rShX = -0.45;
    lShZ = -0.62;
    rShZ = 0.62;
    lElbX = -0.35;
    rElbX = -0.35;
    capeTopX = 0.78 + Math.sin(t * 10) * 0.12;
    capeMidX = 0.38 + Math.cos(t * 10) * 0.12;
    hairBackX = 0.55;
  } else if (isMoving) {
    const strideAmp = isSprinting ? 0.82 : 0.54;
    const s = Math.sin(walkPhase);
    const c = Math.cos(walkPhase);

    pelvisY = 0.89 + Math.abs(c) * (isSprinting ? 0.068 : 0.042);
    pelvisRotY = s * 0.13;
    pelvisRotZ = c * 0.042;
    waistRotX = isSprinting ? 0.25 : 0.12;
    waistRotY = -s * 0.17;
    chestRotX = isSprinting ? 0.08 : 0.03;
    neckRotX = isSprinting ? -0.16 : -0.06;

    lHipX = s * strideAmp;
    rHipX = -s * strideAmp;
    lKneeX = Math.max(0.08, -c * 0.9 + 0.32);
    rKneeX = Math.max(0.08, c * 0.9 + 0.32);

    lShX = -s * strideAmp * 0.85;
    rShX = s * strideAmp * 0.75;
    lShZ = -0.16;
    rShZ = 0.16;
    lElbX = -0.8 - Math.max(0, -s) * 0.35;
    rElbX = -0.74 - Math.max(0, s) * 0.35;

    capeTopX = (isSprinting ? 0.76 : 0.46) + Math.sin(walkPhase * 2) * 0.12;
    capeMidX = 0.26 + Math.cos(walkPhase * 2) * 0.16;
    hairBackX = (isSprinting ? 0.48 : 0.26) + Math.sin(walkPhase * 2) * 0.08;
  } else {
    const breathe = Math.sin(t * 2.1);
    const sway = Math.sin(t * 1.15);

    pelvisY = 0.92 + breathe * 0.015;
    pelvisRotZ = battleMode ? 0.03 : sway * 0.025;
    waistRotX = battleMode ? 0.12 : 0.02 + breathe * 0.02;
    waistRotY = battleMode ? -0.32 : sway * 0.04;
    chestRotY = battleMode ? 0.14 : -sway * 0.03;
    neckRotX = battleMode ? -0.06 : breathe * 0.025;
    neckRotY = battleMode ? 0.18 : Math.sin(t * 0.7) * 0.08;

    if (battleMode) {
      lHipX = -0.24;
      rHipX = 0.24;
      lHipZ = 0.1;
      rHipZ = -0.1;
      lKneeX = 0.28;
      rKneeX = 0.22;
      lShX = -0.38;
      lShZ = -0.34;
      lElbX = -0.88;
      rShX = -0.56 + breathe * 0.045;
      rShZ = 0.3;
      rElbX = -0.76;
    } else {
      lHipZ = 0.04;
      rHipZ = -0.04;
      lKneeX = 0.06;
      rKneeX = 0.08;
      lShX = 0.05 + breathe * 0.03;
      rShX = -0.1 + breathe * 0.03;
      lShZ = -0.18 - breathe * 0.02;
      rShZ = 0.18 + breathe * 0.02;
      lElbX = -0.42;
      rElbX = -0.52;
    }

    capeTopX = 0.14 + Math.sin(t * 2.2) * 0.06;
    capeMidX = 0.08 + Math.cos(t * 2.2) * 0.07;
    hairBackX = 0.06 + Math.sin(t * 2.1 + 0.6) * 0.05;
  }

  rig.actorOffset.position.z = damp(rig.actorOffset.position.z, offsetZ, 18);
  rig.actorOffset.position.y = damp(rig.actorOffset.position.y, offsetY, 18);

  rig.pelvisPivot.position.y = damp(rig.pelvisPivot.position.y, pelvisY, 15);
  rig.pelvisPivot.rotation.y = damp(rig.pelvisPivot.rotation.y, pelvisRotY, 15);
  rig.pelvisPivot.rotation.z = damp(rig.pelvisPivot.rotation.z, pelvisRotZ, 15);
  rig.waistPivot.rotation.x = damp(rig.waistPivot.rotation.x, waistRotX, 15);
  rig.waistPivot.rotation.y = damp(rig.waistPivot.rotation.y, waistRotY, 15);
  rig.chestPivot.rotation.x = damp(rig.chestPivot.rotation.x, chestRotX, 15);
  rig.chestPivot.rotation.y = damp(rig.chestPivot.rotation.y, chestRotY, 15);
  rig.neckPivot.rotation.x = damp(rig.neckPivot.rotation.x, neckRotX, 15);
  rig.neckPivot.rotation.y = damp(rig.neckPivot.rotation.y, neckRotY, 10);

  rig.leftHipPivot.rotation.x = damp(rig.leftHipPivot.rotation.x, lHipX, 16);
  rig.rightHipPivot.rotation.x = damp(rig.rightHipPivot.rotation.x, rHipX, 16);
  rig.leftHipPivot.rotation.z = damp(rig.leftHipPivot.rotation.z, lHipZ, 14);
  rig.rightHipPivot.rotation.z = damp(rig.rightHipPivot.rotation.z, rHipZ, 14);
  rig.leftKneePivot.rotation.x = damp(rig.leftKneePivot.rotation.x, lKneeX, 16);
  rig.rightKneePivot.rotation.x = damp(rig.rightKneePivot.rotation.x, rKneeX, 16);

  rig.leftShoulderPivot.rotation.x = damp(rig.leftShoulderPivot.rotation.x, lShX, 16);
  rig.rightShoulderPivot.rotation.x = damp(rig.rightShoulderPivot.rotation.x, rShX, 18);
  rig.leftShoulderPivot.rotation.z = damp(rig.leftShoulderPivot.rotation.z, lShZ, 15);
  rig.rightShoulderPivot.rotation.z = damp(rig.rightShoulderPivot.rotation.z, rShZ, 15);
  rig.leftElbowPivot.rotation.x = damp(rig.leftElbowPivot.rotation.x, lElbX, 16);
  rig.rightElbowPivot.rotation.x = damp(rig.rightElbowPivot.rotation.x, rElbX, 16);

  rig.capeTopPivot.rotation.x = damp(rig.capeTopPivot.rotation.x, capeTopX, 10);
  rig.capeMidPivot.rotation.x = damp(rig.capeMidPivot.rotation.x, capeMidX, 9);
  rig.coatTailPivot.rotation.x = damp(rig.coatTailPivot.rotation.x, capeTopX * 0.45, 10);
  rig.hairBackPivot.rotation.x = damp(rig.hairBackPivot.rotation.x, hairBackX, 10);

  const sideHairSway = Math.sin(t * 2.5) * 0.04 + (isMoving ? 0.14 : 0);
  rig.leftSideHairPivot.rotation.z = damp(rig.leftSideHairPivot.rotation.z, -sideHairSway, 10);
  rig.rightSideHairPivot.rotation.z = damp(rig.rightSideHairPivot.rotation.z, sideHairSway, 10);

  if (rig.wingsPivot && rig.leftWingPivot && rig.rightWingPivot) {
    const spread = !isGrounded || burstTimer > 0 ? 0.56 : isSprinting ? 0.36 : 0.18;
    const flap = Math.sin(t * (!isGrounded ? 9 : 2.8)) * 0.08;
    rig.leftWingPivot.rotation.y = damp(rig.leftWingPivot.rotation.y, spread + flap, 10);
    rig.rightWingPivot.rotation.y = damp(rig.rightWingPivot.rotation.y, -(spread + flap), 10);
  }
}

export function updateEnemyAnimation(
  rig: EnemyRig,
  archetype: string,
  t: number,
  dt: number,
  phaseOffset: number,
  attackTimer: number,
  hitTimer = 0
) {
  rig.auraRing.rotation.z = t * 0.45;
  if (rig.coreMesh) {
    rig.coreMesh.rotation.y = t * 1.9;
  }
  if (rig.haloRing) {
    rig.haloRing.rotation.z = -t * 0.9;
  }

  const damp = (cur: number, target: number, lambda = 14) =>
    THREE.MathUtils.damp(cur, target, lambda, dt);

  if (archetype === 'slime') {
    if (hitTimer > 0) {
      // Squashed knockback recoil
      const p = Math.sin((hitTimer / 0.55) * Math.PI);
      rig.bodyPivot.position.z = damp(rig.bodyPivot.position.z, -p * 0.85, 18);
      rig.bodyPivot.position.y = p * 0.18;
      rig.bodyPivot.scale.set(1.25, 0.72, 1.25);
    } else if (attackTimer > 0) {
      // Airborne lunge slam!
      const p = Math.sin((attackTimer / 0.75) * Math.PI);
      rig.bodyPivot.position.z = damp(rig.bodyPivot.position.z, p * 2.2, 16);
      rig.bodyPivot.position.y = p * 1.1;
      rig.bodyPivot.scale.set(0.92, 1.18, 0.92);
    } else {
      const bounce = Math.abs(Math.sin(t * 3.1 + phaseOffset));
      rig.bodyPivot.position.z = damp(rig.bodyPivot.position.z, 0, 10);
      rig.bodyPivot.position.y = bounce * 0.34;
      const sy = 0.88 + bounce * 0.24;
      const sxz = 1 / Math.sqrt(sy);
      rig.bodyPivot.scale.set(sxz, sy, sxz);
    }
    return;
  }

  // Hilichurl & Ruin Guardian combat / hit animations
  const breathe = Math.sin(t * 2.4 + phaseOffset);
  if (hitTimer > 0) {
    const p = Math.sin((hitTimer / 0.55) * Math.PI);
    rig.bodyPivot.position.z = damp(rig.bodyPivot.position.z, -p * 0.75, 18);
    rig.bodyPivot.rotation.x = damp(rig.bodyPivot.rotation.x, -0.28 * p, 18);
    if (rig.rightShoulderPivot) rig.rightShoulderPivot.rotation.x = damp(rig.rightShoulderPivot.rotation.x, -0.8 * p, 16);
  } else if (attackTimer > 0) {
    const prog = 1 - attackTimer / 0.75;
    const lunge = Math.sin(prog * Math.PI);
    rig.bodyPivot.position.z = damp(rig.bodyPivot.position.z, lunge * 2.1, 16);
    rig.bodyPivot.rotation.x = damp(rig.bodyPivot.rotation.x, lunge * 0.22, 16);
    if (rig.rightShoulderPivot) {
      rig.rightShoulderPivot.rotation.x = damp(rig.rightShoulderPivot.rotation.x, -2.1 + prog * 2.5, 18);
    }
    if (rig.rightElbowPivot) {
      rig.rightElbowPivot.rotation.x = damp(rig.rightElbowPivot.rotation.x, -0.25, 16);
    }
    if (rig.leftShoulderPivot) {
      rig.leftShoulderPivot.rotation.x = damp(rig.leftShoulderPivot.rotation.x, -0.75 * lunge, 16);
    }
  } else {
    rig.bodyPivot.position.y = breathe * 0.04;
    rig.bodyPivot.position.z = damp(rig.bodyPivot.position.z, 0, 10);
    rig.bodyPivot.rotation.x = damp(rig.bodyPivot.rotation.x, 0, 10);
    if (rig.leftShoulderPivot) {
      rig.leftShoulderPivot.rotation.x = damp(rig.leftShoulderPivot.rotation.x, -0.22 + breathe * 0.08, 12);
      rig.leftShoulderPivot.rotation.z = -0.15;
    }
    if (rig.rightShoulderPivot) {
      rig.rightShoulderPivot.rotation.x = damp(rig.rightShoulderPivot.rotation.x, -0.35 - breathe * 0.08, 12);
      rig.rightShoulderPivot.rotation.z = 0.15;
    }
    if (rig.leftElbowPivot) rig.leftElbowPivot.rotation.x = -0.55;
    if (rig.rightElbowPivot) rig.rightElbowPivot.rotation.x = -0.65;
    if (rig.leftKneePivot) rig.leftKneePivot.rotation.x = 0.12;
    if (rig.rightKneePivot) rig.rightKneePivot.rotation.x = 0.12;
  }
}
