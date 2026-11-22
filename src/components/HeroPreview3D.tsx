import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { CharacterDef } from '../types/game';
import { buildHeroModel, HeroRig } from '../three/models';
import { updateHeroAnimation } from '../three/animateRig';
import { createRuneCircleTexture } from '../three/textures';
import {
  afterDraw,
  createConfiguredRenderer,
  detectSoftwareGl,
  setupStudioEnvironment,
} from '../three/webglUtils';

interface HeroPreview3DProps {
  character: CharacterDef;
  weaponSkinId?: string;
  wingsId?: string;
  triggerPoseKey?: number;
}

export function HeroPreview3D({
  character,
  weaponSkinId = 'weapon_default',
  wingsId = 'wings_none',
  triggerPoseKey = 0,
}: HeroPreview3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneDataRef = useRef<{
    scene: THREE.Scene;
    heroRig: HeroRig | null;
    pedestalRing: THREE.Mesh;
    accentLight: THREE.PointLight;
    poseTimer: number;
    yawOffset: number;
  } | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareGl();
    const renderer = createConfiguredRenderer(container, isSoftwareGl);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#111829');
    scene.fog = new THREE.FogExp2('#111829', 0.045);

    const envTex = setupStudioEnvironment(renderer, scene);

    const camera = new THREE.PerspectiveCamera(
      40,
      container.clientWidth / Math.max(container.clientHeight, 1),
      0.1,
      60
    );
    camera.position.set(0, 1.55, 4.35);
    camera.lookAt(0, 1.05, 0);

    // 3-point Genshin showcase lighting
    const hemi = new THREE.HemisphereLight('#bfe2ff', '#1e293b', 0.85);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight('#fff5e0', 1.6);
    keyLight.position.set(3.5, 6, 4.5);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight('#7dd3fc', 0.9);
    rimLight.position.set(-4, 3.5, -4);
    scene.add(rimLight);

    const accentLight = new THREE.PointLight(character.colors.elementHex, 2.2, 8);
    accentLight.position.set(0, 1.8, 1.8);
    scene.add(accentLight);

    // Stone & Gold Pedestal
    const pedestalGroup = new THREE.Group();
    const baseStone = new THREE.Mesh(
      new THREE.CylinderGeometry(1.35, 1.55, 0.28, 32),
      new THREE.MeshStandardMaterial({
        color: '#222b42',
        roughness: 0.45,
        metalness: 0.35,
      })
    );
    baseStone.position.y = -0.14;
    baseStone.receiveShadow = true;
    pedestalGroup.add(baseStone);

    const trimRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.36, 0.035, 10, 48),
      new THREE.MeshStandardMaterial({
        color: '#e5b84b',
        roughness: 0.22,
        metalness: 0.88,
      })
    );
    trimRing.rotation.x = Math.PI / 2;
    trimRing.position.y = 0.01;
    pedestalGroup.add(trimRing);

    const runeTex = createRuneCircleTexture(character.colors.elementHex);
    const pedestalRing = new THREE.Mesh(
      new THREE.PlaneGeometry(3.2, 3.2),
      new THREE.MeshBasicMaterial({
        map: runeTex,
        transparent: true,
        depthWrite: false,
        opacity: 0.8,
      })
    );
    pedestalRing.rotation.x = -Math.PI / 2;
    pedestalRing.position.y = 0.02;
    pedestalGroup.add(pedestalRing);
    scene.add(pedestalGroup);

    // Floating Starlight Motes
    const moteCount = 48;
    const motePos = new Float32Array(moteCount * 3);
    for (let i = 0; i < moteCount; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 1.0 + Math.random() * 1.8;
      motePos[i * 3] = Math.cos(a) * r;
      motePos[i * 3 + 1] = 0.2 + Math.random() * 2.4;
      motePos[i * 3 + 2] = Math.sin(a) * r;
    }
    const moteGeo = new THREE.BufferGeometry();
    moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
    const moteMat = new THREE.PointsMaterial({
      color: '#fde68a',
      size: 0.06,
      transparent: true,
      opacity: 0.85,
    });
    const motes = new THREE.Points(moteGeo, moteMat);
    scene.add(motes);

    const initialRig = buildHeroModel(character, weaponSkinId, wingsId);
    scene.add(initialRig.group);

    sceneDataRef.current = {
      scene,
      heroRig: initialRig,
      pedestalRing,
      accentLight,
      poseTimer: 0,
      yawOffset: 0.25,
    };

    // Drag to rotate hero 360 degrees
    let dragging = false;
    let lastX = 0;
    const onPointerDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging || !sceneDataRef.current) return;
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      sceneDataRef.current.yawOffset += dx * 0.012;
    };
    const onPointerUp = () => {
      dragging = false;
    };

    const dom = renderer.domElement;
    dom.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = Math.max(container.clientHeight, 1);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);
    const resizeObs = new ResizeObserver(onResize);
    resizeObs.observe(container);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;

    const tick = () => {
      if (disposed) return;
      const dt = Math.min(clock.getDelta(), 0.08);
      const t = clock.getElapsedTime();
      const data = sceneDataRef.current;

      if (data?.heroRig) {
        const rig = data.heroRig;
        if (!dragging) {
          data.yawOffset += dt * 0.35;
        }
        rig.group.rotation.y = data.yawOffset;

        if (data.poseTimer > 0) {
          data.poseTimer = Math.max(0, data.poseTimer - dt);
        }

        updateHeroAnimation(rig, {
          t,
          dt,
          isMoving: false,
          isSprinting: false,
          isGrounded: true,
          walkPhase: 0,
          attackTimer: data.poseTimer,
          burstTimer: 0,
          battleMode: false,
        });
      }

      pedestalRing.rotation.z = t * 0.25;
      motes.rotation.y = -t * 0.18;

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
      dom.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      window.removeEventListener('resize', onResize);
      resizeObs.disconnect();
      envTex.dispose();
      moteGeo.dispose();
      moteMat.dispose();
      renderer.dispose();
      if (dom.parentNode === container) {
        container.removeChild(dom);
      }
    };
  }, []);

  // Swap 3D character model smoothly when selection changes
  useEffect(() => {
    const data = sceneDataRef.current;
    if (!data) return;

    if (data.heroRig) {
      data.scene.remove(data.heroRig.group);
    }
    const nextRig = buildHeroModel(character, weaponSkinId, wingsId);
    data.scene.add(nextRig.group);
    data.heroRig = nextRig;
    data.accentLight.color.set(character.colors.elementHex);

    const nextRune = createRuneCircleTexture(character.colors.elementHex);
    const mat = data.pedestalRing.material as THREE.MeshBasicMaterial;
    mat.map?.dispose();
    mat.map = nextRune;
    mat.needsUpdate = true;
  }, [character, weaponSkinId, wingsId]);

  useEffect(() => {
    if (triggerPoseKey > 0 && sceneDataRef.current) {
      sceneDataRef.current.poseTimer = 0.95;
    }
  }, [triggerPoseKey]);

  return (
    <div
      ref={mountRef}
      className="w-full h-full cursor-grab active:cursor-grabbing touch-none-canvas"
      aria-label={`Pratinjau 3D karakter ${character.name}`}
    />
  );
}
