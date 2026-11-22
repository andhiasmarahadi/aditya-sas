import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { CharacterDef, RegionDef } from '../types/game';
import {
  buildEnemyModel,
  buildHeroModel,
  EnemyRig,
  HeroRig,
} from '../three/models';
import { updateEnemyAnimation, updateHeroAnimation } from '../three/animateRig';
import {
  buildRegionEnvironment,
  CAMP_SPOTS,
  groundHeightAt,
} from '../three/environment';
import { createSlashArcTexture, getSoftParticleTexture } from '../three/textures';
import {
  afterDraw,
  createConfiguredRenderer,
  detectSoftwareGl,
  setupStudioEnvironment,
} from '../three/webglUtils';
import { soundEngine } from '../utils/audio';

export interface CombatAnimationEvent {
  id: number;
  kind: 'hero-attack' | 'hero-burst' | 'enemy-attack' | 'heal' | 'victory';
  amountText?: string;
}

interface FloatingDmg {
  id: number;
  text: string;
  color: string;
  isCrit: boolean;
  xPct: number;
  yPct: number;
}

interface WorldScene3DProps {
  region: RegionDef;
  character: CharacterDef;
  weaponSkinId: string;
  wingsId: string;
  unlockedLevel: number;
  levelStars: [number, number, number];
  activeBattleLevel: number | null;
  combatEvent: CombatAnimationEvent | null;
  autoMoveTargetLevel: number | null;
  virtualPad: { x: number; y: number; jump: boolean; dash: boolean };
  onNearbyEnemyChange: (level: number | null) => void;
  onSelectEnemyCamp: (level: number) => void;
  onAutoMoveArrived: () => void;
}

const _vecA = new THREE.Vector3();
const _vecB = new THREE.Vector3();
const _camGoal = new THREE.Vector3();
const _lookGoal = new THREE.Vector3();
const _projVec = new THREE.Vector3();

interface ParticleBurst {
  points: THREE.Points;
  velocities: Float32Array;
  life: number;
  maxLife: number;
}

interface SlashVfx {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
  rotSpeed: number;
  scaleStart: number;
  scaleEnd: number;
}

export function WorldScene3D({
  region,
  character,
  weaponSkinId,
  wingsId,
  unlockedLevel,
  levelStars,
  activeBattleLevel,
  combatEvent,
  autoMoveTargetLevel,
  virtualPad,
  onNearbyEnemyChange,
  onSelectEnemyCamp,
  onAutoMoveArrived,
}: WorldScene3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [dmgPopups, setDmgPopups] = useState<FloatingDmg[]>([]);

  const propsRef = useRef({
    unlockedLevel,
    levelStars,
    activeBattleLevel,
    autoMoveTargetLevel,
    virtualPad,
    onNearbyEnemyChange,
    onSelectEnemyCamp,
    onAutoMoveArrived,
  });
  propsRef.current = {
    unlockedLevel,
    levelStars,
    activeBattleLevel,
    autoMoveTargetLevel,
    virtualPad,
    onNearbyEnemyChange,
    onSelectEnemyCamp,
    onAutoMoveArrived,
  };

  const sceneControllerRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    heroRig: HeroRig;
    enemyRigs: Map<number, EnemyRig>;
    chestMeshes: Map<number, THREE.Group>;
    heroPos: THREE.Vector3;
    heroAttackTimer: number;
    heroBurstTimer: number;
    heroHitTimer: number;
    enemyAttackTimer: number;
    enemyHitTimer: number;
    pendingEnemyHitDelay: number;
    pendingHeroHitDelay: number;
    shakeIntensity: number;
    spawnBurst: (origin: THREE.Vector3, colorHex: string, count?: number, size?: number) => void;
    spawnProjectile: (from: THREE.Vector3, to: THREE.Vector3, colorHex: string, size?: number) => void;
    spawnSlashArc: (pos: THREE.Vector3, yaw: number, colorHex: string, scale?: number, tilt?: number) => void;
    spawnShockwave: (pos: THREE.Vector3, colorHex: string, scaleEnd?: number) => void;
  } | null>(null);

  // Project 3D position into viewport percentage for anime DMG popups
  const showFloatingDmg = (worldPos: THREE.Vector3, text: string, color: string, isCrit = false) => {
    const ctrl = sceneControllerRef.current;
    const container = mountRef.current;
    if (!ctrl || !container) return;
    _projVec.copy(worldPos).project(ctrl.camera);
    const xPct = THREE.MathUtils.clamp((_projVec.x * 0.5 + 0.5) * 100, 14, 86);
    const yPct = THREE.MathUtils.clamp((-_projVec.y * 0.5 + 0.5) * 100, 14, 72);
    const id = Date.now() + Math.random();
    setDmgPopups((prev) => [...prev.slice(-4), { id, text, color, isCrit, xPct, yPct }]);
    window.setTimeout(() => {
      setDmgPopups((prev) => prev.filter((p) => p.id !== id));
    }, 1150);
  };

  // Trigger dramatic 3D combat choreography when BattleQuizPanel emits a combatEvent
  useEffect(() => {
    if (!combatEvent || !sceneControllerRef.current) return;
    const ctrl = sceneControllerRef.current;
    const battleLvl = propsRef.current.activeBattleLevel;
    if (!battleLvl) return;
    const enemyRig = ctrl.enemyRigs.get(battleLvl);
    const enemyBase = enemyRig
      ? enemyRig.group.position.clone()
      : ctrl.heroPos.clone().add(new THREE.Vector3(0, 0, -4));
    const enemyCenter = enemyBase.clone().add(new THREE.Vector3(0, battleLvl === 3 ? 1.7 : 1.15, 0));
    const heroCenter = ctrl.heroPos.clone().add(new THREE.Vector3(0, 1.15, 0));
    const dx = enemyBase.x - ctrl.heroPos.x;
    const dz = enemyBase.z - ctrl.heroPos.z;
    const facingYaw = Math.atan2(dx, dz);

    if (combatEvent.kind === 'hero-attack') {
      ctrl.heroAttackTimer = 0.95;
      ctrl.pendingEnemyHitDelay = 0.28;
      ctrl.spawnProjectile(heroCenter, enemyCenter, character.colors.elementHex, 0.3);
      window.setTimeout(() => {
        if (!sceneControllerRef.current) return;
        ctrl.spawnSlashArc(enemyCenter, facingYaw, character.colors.elementHex, 2.5, 0.45);
        ctrl.spawnSlashArc(enemyCenter, facingYaw, '#ffffff', 2.0, -0.4);
        ctrl.spawnShockwave(enemyBase, character.colors.elementHex, 3.6);
        ctrl.spawnBurst(enemyCenter, character.colors.elementHex, 34, 0.48);
        ctrl.shakeIntensity = 0.16;
        showFloatingDmg(
          enemyCenter.clone().add(new THREE.Vector3(0, 0.9, 0)),
          combatEvent.amountText || '-240',
          character.colors.elementHex,
          false
        );
      }, 260);
    } else if (combatEvent.kind === 'hero-burst') {
      ctrl.heroBurstTimer = 1.25;
      ctrl.pendingEnemyHitDelay = 0.46;
      ctrl.spawnBurst(heroCenter, character.colors.elementHex, 26, 0.45);
      window.setTimeout(() => {
        if (!sceneControllerRef.current) return;
        ctrl.spawnSlashArc(enemyCenter, facingYaw, '#fde047', 3.4, 0.25);
        ctrl.spawnSlashArc(enemyCenter, facingYaw, character.colors.elementHex, 3.2, -0.55);
        ctrl.spawnShockwave(enemyBase, '#fde047', 5.2);
        ctrl.spawnShockwave(enemyBase, character.colors.elementHex, 3.8);
        ctrl.spawnBurst(enemyCenter, '#fde047', 52, 0.62);
        ctrl.spawnBurst(enemyCenter, character.colors.elementHex, 40, 0.52);
        ctrl.shakeIntensity = 0.34;
        showFloatingDmg(
          enemyCenter.clone().add(new THREE.Vector3(0, 1.15, 0)),
          combatEvent.amountText || 'BURST -580!',
          '#fde047',
          true
        );
      }, 450);
    } else if (combatEvent.kind === 'enemy-attack') {
      ctrl.enemyAttackTimer = 0.75;
      ctrl.pendingHeroHitDelay = 0.28;
      ctrl.spawnProjectile(enemyCenter, heroCenter, '#ef4444', 0.34);
      window.setTimeout(() => {
        if (!sceneControllerRef.current) return;
        ctrl.spawnShockwave(ctrl.heroPos, '#ef4444', 3.0);
        ctrl.spawnBurst(heroCenter, '#ef4444', 28, 0.45);
        ctrl.shakeIntensity = 0.22;
        showFloatingDmg(
          heroCenter.clone().add(new THREE.Vector3(0, 0.85, 0)),
          combatEvent.amountText || '-12 HP',
          '#fb7185',
          false
        );
      }, 280);
    } else if (combatEvent.kind === 'heal') {
      ctrl.spawnShockwave(ctrl.heroPos, '#4ade80', 2.8);
      ctrl.spawnBurst(heroCenter, '#4ade80', 32, 0.48);
      showFloatingDmg(
        heroCenter.clone().add(new THREE.Vector3(0, 0.9, 0)),
        combatEvent.amountText || '+40 HP',
        '#4ade80',
        false
      );
    } else if (combatEvent.kind === 'victory') {
      ctrl.heroBurstTimer = 1.1;
      ctrl.spawnShockwave(enemyBase, '#facc15', 5.4);
      ctrl.spawnBurst(enemyCenter, '#facc15', 65, 0.62);
      ctrl.shakeIntensity = 0.28;
    }
  }, [combatEvent, character.colors.elementHex]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareGl();
    const renderer = createConfiguredRenderer(container, isSoftwareGl);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const envTex = setupStudioEnvironment(renderer, scene);

    const camera = new THREE.PerspectiveCamera(
      54,
      container.clientWidth / Math.max(container.clientHeight, 1),
      0.1,
      260
    );

    const hemi = new THREE.HemisphereLight('#d6efff', '#3b4a3a', 0.92);
    scene.add(hemi);

    const sunLight = new THREE.DirectionalLight('#fff5db', 1.55);
    sunLight.position.set(24, 42, 18);
    sunLight.castShadow = !isSoftwareGl;
    sunLight.shadow.mapSize.set(2048, 2048);
    sunLight.shadow.camera.left = -45;
    sunLight.shadow.camera.right = 45;
    sunLight.shadow.camera.top = 45;
    sunLight.shadow.camera.bottom = -45;
    sunLight.shadow.camera.near = 2;
    sunLight.shadow.camera.far = 110;
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.normalBias = 0.02;
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(region.colors.accent, 0.55);
    rimLight.position.set(-20, 14, -60);
    scene.add(rimLight);

    const envObjects = buildRegionEnvironment(scene, region, renderer, isSoftwareGl);

    const heroRig = buildHeroModel(character, weaponSkinId, wingsId);
    const startY = groundHeightAt(0, 0, region.biome);
    heroRig.group.position.set(0, startY, 0);
    heroRig.group.rotation.y = Math.PI;
    scene.add(heroRig.group);

    const enemyRigs = new Map<number, EnemyRig>();
    const chestMeshes = new Map<number, THREE.Group>();
    const clickTargets: THREE.Object3D[] = [];

    region.levels.forEach((lvlDef, idx) => {
      const camp = CAMP_SPOTS[idx];
      const cy = groundHeightAt(camp.x, camp.z, region.biome);

      const rig = buildEnemyModel(
        lvlDef.archetype,
        region.colors.accent,
        lvlDef.level
      );
      rig.group.position.set(camp.x, cy, camp.z);
      scene.add(rig.group);
      enemyRigs.set(lvlDef.level, rig);

      const proxy = new THREE.Mesh(
        new THREE.CylinderGeometry(1.75, 1.75, 3.4, 8),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      proxy.position.set(camp.x, cy + 1.7, camp.z);
      proxy.userData.enemyLevel = lvlDef.level;
      scene.add(proxy);
      clickTargets.push(proxy);

      // Genshin Exquisite Chest
      const chest = new THREE.Group();
      chest.position.set(camp.x, cy, camp.z);
      const chestBase = new THREE.Mesh(
        new THREE.BoxGeometry(1.15, 0.56, 0.8),
        new THREE.MeshStandardMaterial({ color: '#854d0e', roughness: 0.52, metalness: 0.25 })
      );
      chestBase.position.y = 0.28;
      chestBase.castShadow = true;
      chest.add(chestBase);

      const chestLid = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.4, 1.16, 12, 1, false, 0, Math.PI),
        new THREE.MeshStandardMaterial({ color: '#eab308', roughness: 0.24, metalness: 0.88 })
      );
      chestLid.rotation.z = Math.PI / 2;
      chestLid.position.y = 0.56;
      chest.add(chestLid);

      const chestGem = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.18, 0),
        new THREE.MeshStandardMaterial({
          color: region.colors.accent,
          emissive: region.colors.accent,
          emissiveIntensity: 0.9,
        })
      );
      chestGem.position.set(0, 0.56, 0.43);
      chest.add(chestGem);

      chest.visible = false;
      scene.add(chest);
      chestMeshes.set(lvlDef.level, chest);
    });

    const bursts: ParticleBurst[] = [];
    const slashes: SlashVfx[] = [];
    const projectiles: {
      mesh: THREE.Mesh;
      from: THREE.Vector3;
      to: THREE.Vector3;
      t: number;
    }[] = [];

    const particleTex = getSoftParticleTexture();

    const spawnBurst = (
      origin: THREE.Vector3,
      colorHex: string,
      count = 28,
      size = 0.42
    ) => {
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(count * 3);
      const vel = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        pos[i * 3] = origin.x;
        pos[i * 3 + 1] = origin.y;
        pos[i * 3 + 2] = origin.z;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        const spd = 2.8 + Math.random() * 5.6;
        vel[i * 3] = Math.sin(phi) * Math.cos(theta) * spd;
        vel[i * 3 + 1] = Math.abs(Math.cos(phi)) * spd + 1.8;
        vel[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * spd;
      }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({
        map: particleTex,
        color: colorHex,
        size,
        transparent: true,
        opacity: 1,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const pts = new THREE.Points(geo, mat);
      scene.add(pts);
      bursts.push({ points: pts, velocities: vel, life: 0, maxLife: 0.8 });
    };

    const spawnProjectile = (
      from: THREE.Vector3,
      to: THREE.Vector3,
      colorHex: string,
      size = 0.3
    ) => {
      const orb = new THREE.Mesh(
        new THREE.OctahedronGeometry(size, 1),
        new THREE.MeshBasicMaterial({ color: colorHex })
      );
      orb.position.copy(from);
      scene.add(orb);
      projectiles.push({ mesh: orb, from: from.clone(), to: to.clone(), t: 0 });
    };

    const spawnSlashArc = (
      pos: THREE.Vector3,
      yaw: number,
      colorHex: string,
      scale = 2.4,
      tilt = 0.4
    ) => {
      const tex = createSlashArcTexture(colorHex);
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(scale, scale),
        new THREE.MeshBasicMaterial({
          map: tex,
          transparent: true,
          opacity: 0.95,
          side: THREE.DoubleSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      );
      mesh.position.copy(pos);
      mesh.rotation.set(Math.PI * 0.42 + tilt, yaw, tilt * 1.4);
      scene.add(mesh);
      slashes.push({
        mesh,
        life: 0,
        maxLife: 0.34,
        rotSpeed: 8.5,
        scaleStart: 0.72,
        scaleEnd: 1.35,
      });
    };

    const spawnShockwave = (pos: THREE.Vector3, colorHex: string, scaleEnd = 3.8) => {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.55, 0.82, 32),
        new THREE.MeshBasicMaterial({
          color: colorHex,
          transparent: true,
          opacity: 0.9,
          side: THREE.DoubleSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(pos.x, pos.y + 0.08, pos.z);
      scene.add(ring);
      slashes.push({
        mesh: ring,
        life: 0,
        maxLife: 0.48,
        rotSpeed: 1.5,
        scaleStart: 0.4,
        scaleEnd,
      });
    };

    sceneControllerRef.current = {
      scene,
      camera,
      heroRig,
      enemyRigs,
      chestMeshes,
      heroPos: heroRig.group.position,
      heroAttackTimer: 0,
      heroBurstTimer: 0,
      heroHitTimer: 0,
      enemyAttackTimer: 0,
      enemyHitTimer: 0,
      pendingEnemyHitDelay: 0,
      pendingHeroHitDelay: 0,
      shakeIntensity: 0,
      spawnBurst,
      spawnProjectile,
      spawnSlashArc,
      spawnShockwave,
    };

    // Movement & Multi-Touch Camera State
    const keys: Record<string, boolean> = {};
    let cameraYaw = 0;
    let cameraPitch = 0.32;
    let cameraDist = 8.2;
    let heroYaw = Math.PI;
    let verticalVel = 0;
    let isGrounded = true;
    let lastNearby: number | null = null;
    let walkPhase = 0;

    let cameraPointerId: number | null = null;
    let dragDistance = 0;
    let lastMouseX = 0;
    let lastMouseY = 0;

    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      keys[e.code] = true;
      if (e.code === 'Space' && isGrounded && !propsRef.current.activeBattleLevel) {
        verticalVel = 8.6;
        isGrounded = false;
        soundEngine.playJump();
      }
      if ((e.code === 'KeyF' || e.code === 'Enter') && lastNearby !== null && !propsRef.current.activeBattleLevel) {
        propsRef.current.onSelectEnemyCamp(lastNearby);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys[e.code] = false;
    };

    const dom = renderer.domElement;
    const onPointerDown = (e: PointerEvent) => {
      if (cameraPointerId !== null) return;
      cameraPointerId = e.pointerId;
      dragDistance = 0;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerId !== cameraPointerId) return;
      const dx = e.clientX - lastMouseX;
      const dy = e.clientY - lastMouseY;
      dragDistance += Math.abs(dx) + Math.abs(dy);
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      if (!propsRef.current.activeBattleLevel) {
        cameraYaw -= dx * 0.0068;
        cameraPitch = THREE.MathUtils.clamp(cameraPitch + dy * 0.005, 0.12, 0.9);
      }
    };
    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerId !== cameraPointerId) return;
      if (dragDistance < 10 && !propsRef.current.activeBattleLevel) {
        const rect = dom.getBoundingClientRect();
        pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointerNdc, camera);
        const hits = raycaster.intersectObjects(clickTargets, false);
        if (hits.length > 0) {
          const lvl = hits[0].object.userData.enemyLevel as number;
          if (lvl && lvl <= propsRef.current.unlockedLevel) {
            propsRef.current.onSelectEnemyCamp(lvl);
          }
        }
      }
      cameraPointerId = null;
    };
    const onWheel = (e: WheelEvent) => {
      cameraDist = THREE.MathUtils.clamp(cameraDist + e.deltaY * 0.006, 5.2, 13.5);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    dom.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    dom.addEventListener('wheel', onWheel, { passive: true });

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = Math.max(container.clientHeight, 1);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    camera.position.set(0, startY + 3.2, 8.5);
    camera.lookAt(0, startY + 1.2, 0);

    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;

    const wingSpeedBonus =
      wingsId === 'wings_golden' ? 1.2 : wingsId === 'wings_anemo' ? 1.12 : 1.0;

    const tick = () => {
      if (disposed) return;
      const dt = Math.min(clock.getDelta(), 0.08);
      const t = clock.getElapsedTime();
      const state = propsRef.current;
      const ctrl = sceneControllerRef.current!;

      // Delayed impact timers synced to attack dash peaks
      if (ctrl.pendingEnemyHitDelay > 0) {
        ctrl.pendingEnemyHitDelay -= dt;
        if (ctrl.pendingEnemyHitDelay <= 0) {
          ctrl.enemyHitTimer = 0.55;
        }
      }
      if (ctrl.pendingHeroHitDelay > 0) {
        ctrl.pendingHeroHitDelay -= dt;
        if (ctrl.pendingHeroHitDelay <= 0) {
          ctrl.heroHitTimer = 0.55;
        }
      }

      if (ctrl.heroAttackTimer > 0) ctrl.heroAttackTimer = Math.max(0, ctrl.heroAttackTimer - dt);
      if (ctrl.heroBurstTimer > 0) ctrl.heroBurstTimer = Math.max(0, ctrl.heroBurstTimer - dt);
      if (ctrl.heroHitTimer > 0) ctrl.heroHitTimer = Math.max(0, ctrl.heroHitTimer - dt);
      if (ctrl.enemyAttackTimer > 0) ctrl.enemyAttackTimer = Math.max(0, ctrl.enemyAttackTimer - dt);
      if (ctrl.enemyHitTimer > 0) ctrl.enemyHitTimer = Math.max(0, ctrl.enemyHitTimer - dt);
      if (ctrl.shakeIntensity > 0) ctrl.shakeIntensity = Math.max(0, ctrl.shakeIntensity - dt * 1.1);

      // Update enemy camps & chests
      region.levels.forEach((lvlDef, i) => {
        const rig = enemyRigs.get(lvlDef.level);
        const chest = chestMeshes.get(lvlDef.level);
        const cleared = state.levelStars[i] > 0;
        const unlocked = lvlDef.level <= state.unlockedLevel;

        if (rig) {
          rig.group.visible = !cleared || state.activeBattleLevel === lvlDef.level;
          const ringMat = rig.auraRing.material as THREE.MeshBasicMaterial;
          ringMat.opacity = unlocked ? 0.78 : 0.2;

          const isBossBattle = state.activeBattleLevel === lvlDef.level;
          updateEnemyAnimation(
            rig,
            lvlDef.archetype,
            t,
            dt,
            i * 1.1,
            isBossBattle ? ctrl.enemyAttackTimer : 0,
            isBossBattle ? ctrl.enemyHitTimer : 0
          );

          const dx = heroRig.group.position.x - rig.group.position.x;
          const dz = heroRig.group.position.z - rig.group.position.z;
          rig.group.rotation.y = Math.atan2(dx, dz);
        }

        if (chest) {
          chest.visible = cleared && state.activeBattleLevel !== lvlDef.level;
          chest.rotation.y = Math.sin(t * 0.8 + i) * 0.15;
        }
      });

      // Animate landmarks, drifting clouds & elemental particles
      envObjects.waypointCrystal.rotation.y = t * 1.25;
      envObjects.waypointCrystal.position.y = 2.85 + Math.sin(t * 2.2) * 0.12;
      envObjects.campRings.forEach((r, idx) => {
        r.rotation.z = t * (idx % 2 === 0 ? 0.22 : -0.22);
      });
      envObjects.floatingAccents.forEach((obj) => {
        if (obj.userData.baseY !== undefined) {
          obj.position.y = obj.userData.baseY + Math.sin(t * 1.5 + obj.userData.phase) * 0.45;
          obj.rotation.y = t * 0.85;
        } else {
          obj.rotation.z = t * 0.65;
        }
      });
      envObjects.clouds.forEach((c, idx) => {
        c.position.x += dt * (0.45 + (idx % 3) * 0.15);
        if (c.position.x > 65) c.position.x = -65;
      });
      envObjects.ambientParticles.rotation.y = Math.sin(t * 0.15) * 0.08;
      envObjects.ambientParticles.position.y = Math.sin(t * 0.9) * 0.45;

      // Player Movement (when NOT in battle quiz)
      let isMoving = false;
      let isSprinting = false;

      if (state.activeBattleLevel === null) {
        let moveX = 0;
        let moveZ = 0;

        if (keys['KeyW'] || keys['ArrowUp']) moveZ -= 1;
        if (keys['KeyS'] || keys['ArrowDown']) moveZ += 1;
        if (keys['KeyA'] || keys['ArrowLeft']) moveX -= 1;
        if (keys['KeyD'] || keys['ArrowRight']) moveX += 1;

        const padMag = Math.hypot(state.virtualPad.x, state.virtualPad.y);
        if (padMag > 0.08) {
          moveX += state.virtualPad.x;
          moveZ += state.virtualPad.y;
        }
        if (state.virtualPad.jump && isGrounded) {
          verticalVel = 8.6;
          isGrounded = false;
          soundEngine.playJump();
        }

        if (state.autoMoveTargetLevel !== null && moveX === 0 && moveZ === 0) {
          const targetCamp = CAMP_SPOTS[state.autoMoveTargetLevel - 1];
          if (targetCamp) {
            const dx = targetCamp.x - heroRig.group.position.x;
            const dz = targetCamp.z - heroRig.group.position.z;
            const dist = Math.hypot(dx, dz);
            if (dist > 3.6) {
              const speed = 11.5 * wingSpeedBonus;
              heroRig.group.position.x += (dx / dist) * speed * dt;
              heroRig.group.position.z += (dz / dist) * speed * dt;
              heroYaw = Math.atan2(dx, dz);
              isMoving = true;
              isSprinting = true;
            } else {
              state.onAutoMoveArrived();
            }
          }
        } else if (moveX !== 0 || moveZ !== 0) {
          const len = Math.hypot(moveX, moveZ);
          const nx = moveX / len;
          const nz = moveZ / len;

          const sinY = Math.sin(cameraYaw);
          const cosY = Math.cos(cameraYaw);
          const worldDx = nx * cosY + nz * sinY;
          const worldDz = -nx * sinY + nz * cosY;

          // Auto-sprint if pushing mobile joystick far or holding Shift/Dash button
          isSprinting = !!(
            keys['ShiftLeft'] ||
            keys['ShiftRight'] ||
            state.virtualPad.dash ||
            padMag > 0.78
          );
          const speed = (isSprinting ? 11.5 : 7.2) * wingSpeedBonus;

          heroRig.group.position.x += worldDx * speed * dt;
          heroRig.group.position.z += worldDz * speed * dt;
          heroYaw = Math.atan2(worldDx, worldDz);
          isMoving = true;
        }

        heroRig.group.position.x = THREE.MathUtils.clamp(heroRig.group.position.x, -30, 30);
        heroRig.group.position.z = THREE.MathUtils.clamp(heroRig.group.position.z, -62, 12);

        const floorY = groundHeightAt(
          heroRig.group.position.x,
          heroRig.group.position.z,
          region.biome
        );
        if (!isGrounded) {
          verticalVel -= 22 * dt;
          heroRig.group.position.y += verticalVel * dt;
          if (heroRig.group.position.y <= floorY) {
            heroRig.group.position.y = floorY;
            verticalVel = 0;
            isGrounded = true;
          }
        } else {
          heroRig.group.position.y = THREE.MathUtils.damp(
            heroRig.group.position.y,
            floorY,
            18,
            dt
          );
          if (isMoving) {
            soundEngine.playFootstep(isSprinting);
          }
        }

        let nearby: number | null = null;
        for (const camp of CAMP_SPOTS) {
          if (camp.level > state.unlockedLevel) continue;
          const d = Math.hypot(
            heroRig.group.position.x - camp.x,
            heroRig.group.position.z - camp.z
          );
          if (d < 5.2) {
            nearby = camp.level;
            break;
          }
        }
        if (nearby !== lastNearby) {
          lastNearby = nearby;
          state.onNearbyEnemyChange(nearby);
        }

        // Smooth Third-Person Genshin Follow Camera
        const hx = heroRig.group.position.x;
        const hy = heroRig.group.position.y;
        const hz = heroRig.group.position.z;

        const horizDist = Math.cos(cameraPitch) * cameraDist;
        const vertDist = Math.sin(cameraPitch) * cameraDist + 1.3;
        _camGoal.set(
          hx + Math.sin(cameraYaw) * horizDist,
          hy + vertDist,
          hz + Math.cos(cameraYaw) * horizDist
        );
        _lookGoal.set(hx, hy + 1.35, hz);

        camera.position.lerp(_camGoal, 1 - Math.exp(-10 * dt));
        camera.lookAt(_lookGoal);
      } else {
        // Dynamic Cinematic RPG Battle Choreography Camera!
        const camp = CAMP_SPOTS[state.activeBattleLevel - 1];
        if (camp) {
          const cy = groundHeightAt(camp.x, camp.z, region.biome);
          _vecA.set(camp.x - 1.75, cy, camp.z + 4.35);
          heroRig.group.position.lerp(_vecA, 1 - Math.exp(-9 * dt));
          const dx = camp.x - heroRig.group.position.x;
          const dz = camp.z - heroRig.group.position.z;
          heroYaw = Math.atan2(dx, dz);

          if (ctrl.heroBurstTimer > 0) {
            // Sweeping low-angle Genshin Burst camera
            _camGoal.set(camp.x + 5.2, cy + 1.85, camp.z + 5.1);
            _lookGoal.set(camp.x - 0.4, cy + 1.35, camp.z + 1.1);
          } else if (ctrl.heroAttackTimer > 0) {
            // Dynamic close-in action strike shot
            _camGoal.set(camp.x + 4.2, cy + 1.95, camp.z + 5.6);
            _lookGoal.set(camp.x - 0.4, cy + 1.15, camp.z + 1.2);
          } else if (ctrl.enemyAttackTimer > 0) {
            // Enemy lunge counter-angle
            _camGoal.set(camp.x - 4.4, cy + 2.3, camp.z + 6.4);
            _lookGoal.set(camp.x - 0.6, cy + 1.1, camp.z + 1.8);
          } else {
            // Balanced heroic face-off duel framing (both combatants crisp in upper-center viewport)
            _camGoal.set(camp.x + 4.7, cy + 2.25, camp.z + 6.7);
            _lookGoal.set(camp.x - 0.55, cy + 1.05, camp.z + 1.75);
          }

          camera.position.lerp(_camGoal, 1 - Math.exp(-8 * dt));
          if (ctrl.shakeIntensity > 0) {
            camera.position.x += (Math.random() - 0.5) * ctrl.shakeIntensity;
            camera.position.y += (Math.random() - 0.5) * ctrl.shakeIntensity;
          }
          camera.lookAt(_lookGoal);
        }
      }

      let angleDiff = heroYaw - heroRig.group.rotation.y;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      heroRig.group.rotation.y += angleDiff * Math.min(1, dt * 14);

      if (isMoving) {
        walkPhase += dt * (isSprinting ? 14 : 9.5);
      }

      updateHeroAnimation(heroRig, {
        t,
        dt,
        isMoving,
        isSprinting,
        isGrounded,
        walkPhase,
        attackTimer: ctrl.heroAttackTimer,
        burstTimer: ctrl.heroBurstTimer,
        hitTimer: ctrl.heroHitTimer,
        battleMode: state.activeBattleLevel !== null,
      });

      // Update Slash Arcs & Ground Shockwave Rings
      for (let i = slashes.length - 1; i >= 0; i--) {
        const s = slashes[i];
        s.life += dt;
        const p = s.life / s.maxLife;
        if (p >= 1) {
          scene.remove(s.mesh);
          s.mesh.geometry.dispose();
          const m = s.mesh.material as THREE.MeshBasicMaterial;
          m.map?.dispose();
          m.dispose();
          slashes.splice(i, 1);
        } else {
          const sc = THREE.MathUtils.lerp(s.scaleStart, s.scaleEnd, p);
          s.mesh.scale.setScalar(sc);
          s.mesh.rotation.z += dt * s.rotSpeed;
          (s.mesh.material as THREE.MeshBasicMaterial).opacity = 1 - p * p;
        }
      }

      // Update Projectiles
      for (let i = projectiles.length - 1; i >= 0; i--) {
        const pr = projectiles[i];
        pr.t += dt * 4.4;
        if (pr.t >= 1) {
          scene.remove(pr.mesh);
          pr.mesh.geometry.dispose();
          (pr.mesh.material as THREE.Material).dispose();
          projectiles.splice(i, 1);
        } else {
          _vecB.lerpVectors(pr.from, pr.to, pr.t);
          _vecB.y += Math.sin(pr.t * Math.PI) * 0.72;
          pr.mesh.position.copy(_vecB);
          pr.mesh.rotation.y += dt * 12;
        }
      }

      // Update Soft Glowing Particle Bursts
      for (let i = bursts.length - 1; i >= 0; i--) {
        const b = bursts[i];
        b.life += dt;
        if (b.life >= b.maxLife) {
          scene.remove(b.points);
          b.points.geometry.dispose();
          (b.points.material as THREE.Material).dispose();
          bursts.splice(i, 1);
        } else {
          const pAttr = b.points.geometry.attributes.position as THREE.BufferAttribute;
          const arr = pAttr.array as Float32Array;
          for (let j = 0; j < arr.length; j += 3) {
            arr[j] += b.velocities[j] * dt;
            arr[j + 1] += b.velocities[j + 1] * dt;
            arr[j + 2] += b.velocities[j + 2] * dt;
            b.velocities[j + 1] -= 9.5 * dt;
          }
          pAttr.needsUpdate = true;
          (b.points.material as THREE.PointsMaterial).opacity = 1 - b.life / b.maxLife;
        }
      }

      renderer.render(scene, camera);
      if (isSoftwareGl) {
        afterDraw(renderer, tick, (id) => {
          frameId = id;
        });
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      dom.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      dom.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', onResize);
      envTex.dispose();
      renderer.dispose();
      if (dom.parentNode === container) {
        container.removeChild(dom);
      }
    };
  }, [region, character, weaponSkinId, wingsId]);

  return (
    <div className="relative w-full h-full">
      <div
        ref={mountRef}
        className="w-full h-full touch-none-canvas cursor-grab active:cursor-grabbing"
        aria-label={`Dunia 3D ${region.fantasyName}`}
      />

      {/* 3D-Projected Floating Anime RPG Damage Numbers */}
      <div className="pointer-events-none fixed inset-0 z-20 overflow-hidden">
        {dmgPopups.map((pop) => (
          <div
            key={pop.id}
            style={{
              left: `${pop.xPct}%`,
              top: `${pop.yPct}%`,
              color: pop.color,
              textShadow: '0 2px 10px rgba(0,0,0,0.92), 0 0 2px #000',
            }}
            className={`absolute font-display font-extrabold whitespace-nowrap animate-dmg-pop ${
              pop.isCrit ? 'text-2xl md:text-4xl' : 'text-lg md:text-2xl'
            }`}
          >
            {pop.text}
          </div>
        ))}
      </div>
    </div>
  );
}
