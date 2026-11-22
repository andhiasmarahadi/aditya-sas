import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Award,
  Compass,
  Gamepad2,
  Map as MapIcon,
  Menu,
  Music,
  ShoppingBag,
  Sparkles,
  Star,
  Swords,
  UserCheck,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { BattleQuizPanel } from './components/BattleQuizPanel';
import { HeroPreview3D } from './components/HeroPreview3D';
import {
  MobileTouchControls,
  VirtualPadState,
} from './components/MobileTouchControls';
import { ReportCardModal } from './components/ReportCardModal';
import { ShopAndInventoryModal } from './components/ShopAndInventoryModal';
import { WorldMapModal } from './components/WorldMapModal';
import { CombatAnimationEvent, WorldScene3D } from './components/WorldScene3D';
import { CHARACTERS, ELEMENT_STYLES } from './data/characters';
import { REGIONS } from './data/regions';
import { PlayerProgress, ShopItem } from './types/game';
import { MusicMood, soundEngine } from './utils/audio';

const STORAGE_KEY = 'aetheria_nusantara_pas_v1';

function createInitialProgress(): PlayerProgress {
  const unlocked: Record<string, number> = {};
  const stars: Record<string, [number, number, number]> = {};
  const best: Record<string, [number, number, number]> = {};

  REGIONS.forEach((r) => {
    unlocked[r.id] = 1;
    stars[r.id] = [0, 0, 0];
    best[r.id] = [0, 0, 0];
  });

  return {
    playerName: 'Petualang Kelas 4',
    selectedCharacterId: 'sora',
    points: 120,
    crystals: 20,
    xp: 0,
    equippedWeaponId: 'weapon_default',
    equippedWingsId: 'wings_none',
    unlockedItems: ['weapon_default', 'wings_none'],
    foodCount: 2,
    regionUnlockedLevel: unlocked,
    regionStars: stars,
    regionBestCorrect: best,
  };
}

function loadProgress(): PlayerProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialProgress();
    const parsed = JSON.parse(raw) as Partial<PlayerProgress>;
    const base = createInitialProgress();
    return {
      ...base,
      ...parsed,
      regionUnlockedLevel: {
        ...base.regionUnlockedLevel,
        ...(parsed.regionUnlockedLevel || {}),
      },
      regionStars: { ...base.regionStars, ...(parsed.regionStars || {}) },
      regionBestCorrect: {
        ...base.regionBestCorrect,
        ...(parsed.regionBestCorrect || {}),
      },
    };
  } catch {
    return createInitialProgress();
  }
}

export default function App() {
  const [progress, setProgress] = useState<PlayerProgress>(loadProgress);
  const [screen, setScreen] = useState<
    'character-select' | 'world-map' | 'region-3d'
  >('character-select');
  const [currentRegionId, setCurrentRegionId] = useState<string>(REGIONS[0].id);
  const [poseKey, setPoseKey] = useState(0);
  const [muted, setMuted] = useState(false);
  const [bgmOn, setBgmOn] = useState(true);

  // Overlays while in 3D region
  const [showMapOverlay, setShowMapOverlay] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showTouchPad, setShowTouchPad] = useState(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768
    );
  });

  // 3D World Exploration & Battle State
  const [nearbyEnemyLevel, setNearbyEnemyLevel] = useState<number | null>(null);
  const [activeBattleLevel, setActiveBattleLevel] = useState<number | null>(null);
  const [autoMoveTargetLevel, setAutoMoveTargetLevel] = useState<number | null>(
    null
  );
  const [combatEvent, setCombatEvent] = useState<CombatAnimationEvent | null>(
    null
  );
  const combatCounterRef = useRef(0);

  const [virtualPad, setVirtualPad] = useState<VirtualPadState>({
    x: 0,
    y: 0,
    jump: false,
    dash: false,
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {
      // Ignore storage quota errors
    }
  }, [progress]);

  // Unlock Web Audio on first user interaction & pause music when tab hidden
  useEffect(() => {
    const handleFirstGesture = () => {
      soundEngine.unlock();
    };
    const handleVisibility = () => {
      soundEngine.setPausedForVisibility(document.hidden);
    };
    window.addEventListener('pointerdown', handleFirstGesture, { passive: true });
    window.addEventListener('keydown', handleFirstGesture, { passive: true });
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('pointerdown', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const activeCharacter = useMemo(
    () =>
      CHARACTERS.find((c) => c.id === progress.selectedCharacterId) ||
      CHARACTERS[0],
    [progress.selectedCharacterId]
  );

  const activeRegion = useMemo(
    () => REGIONS.find((r) => r.id === currentRegionId) || REGIONS[0],
    [currentRegionId]
  );

  // Adaptive Genshin-style Background Music switcher
  useEffect(() => {
    let mood: MusicMood = 'title';
    if (screen === 'region-3d') {
      if (activeBattleLevel !== null) {
        mood = 'battle';
      } else if (
        activeRegion.biome === 'liyue-harbor' ||
        activeRegion.biome === 'bali-temple' ||
        activeRegion.biome === 'golden-citadel'
      ) {
        mood = 'harbor';
      } else if (
        activeRegion.biome === 'inazuma-crystal' ||
        activeRegion.biome === 'sacred-peak'
      ) {
        mood = 'mystic';
      } else if (activeRegion.biome === 'natlan-arena') {
        mood = 'battle';
      } else {
        mood = 'meadow';
      }
    }
    soundEngine.setMusicMood(mood);
  }, [screen, activeBattleLevel, activeRegion.biome]);

  const weaponBonus = useMemo(() => {
    if (progress.equippedWeaponId === 'weapon_jade') return 5;
    if (progress.equippedWeaponId === 'weapon_solar') return 10;
    if (progress.equippedWeaponId === 'weapon_celestial') return 15;
    return 0;
  }, [progress.equippedWeaponId]);

  const adventureRank = Math.min(30, 1 + Math.floor(progress.xp / 120));

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    soundEngine.setMuted(next);
    if (!next) {
      soundEngine.unlock();
      soundEngine.playClick();
    }
  };

  const toggleBgm = () => {
    const next = !bgmOn;
    setBgmOn(next);
    soundEngine.unlock();
    soundEngine.setBgmEnabled(next);
    soundEngine.playClick();
  };

  const handleCombatEvent = useCallback(
    (kind: CombatAnimationEvent['kind'], amountText?: string) => {
      combatCounterRef.current += 1;
      setCombatEvent({ id: combatCounterRef.current, kind, amountText });
    },
    []
  );

  const handleStartBattle = useCallback(
    (level: number) => {
      const unlocked = progress.regionUnlockedLevel[activeRegion.id] || 1;
      if (level > unlocked) return;
      soundEngine.unlock();
      soundEngine.playEncounter();
      setAutoMoveTargetLevel(null);
      setShowMobileMenu(false);
      setActiveBattleLevel(level);
    },
    [activeRegion.id, progress.regionUnlockedLevel]
  );

  const handleCompleteLevel = useCallback(
    (result: {
      correctCount: number;
      stars: number;
      earnedPoints: number;
      earnedCrystals: number;
    }) => {
      if (!activeBattleLevel) return;
      const lvlIdx = activeBattleLevel - 1;
      setProgress((prev) => {
        const prevStars = [
          ...(prev.regionStars[activeRegion.id] || [0, 0, 0]),
        ] as [number, number, number];
        const prevBest = [
          ...(prev.regionBestCorrect[activeRegion.id] || [0, 0, 0]),
        ] as [number, number, number];
        prevStars[lvlIdx] = Math.max(prevStars[lvlIdx], result.stars);
        prevBest[lvlIdx] = Math.max(prevBest[lvlIdx], result.correctCount);

        const prevUnlocked = prev.regionUnlockedLevel[activeRegion.id] || 1;
        const nextUnlocked =
          result.correctCount >= 5 && activeBattleLevel < 3
            ? Math.max(prevUnlocked, activeBattleLevel + 1)
            : prevUnlocked;

        return {
          ...prev,
          points: prev.points + result.earnedPoints,
          crystals: prev.crystals + result.earnedCrystals,
          xp: prev.xp + result.correctCount * 15,
          regionStars: {
            ...prev.regionStars,
            [activeRegion.id]: prevStars,
          },
          regionBestCorrect: {
            ...prev.regionBestCorrect,
            [activeRegion.id]: prevBest,
          },
          regionUnlockedLevel: {
            ...prev.regionUnlockedLevel,
            [activeRegion.id]: nextUnlocked,
          },
        };
      });
    },
    [activeBattleLevel, activeRegion.id]
  );

  const handleBuyOrEquip = (item: ShopItem) => {
    setProgress((prev) => {
      if (item.category === 'food') {
        if (prev.points < item.price) return prev;
        return {
          ...prev,
          points: prev.points - item.price,
          foodCount: prev.foodCount + 1,
        };
      }

      const alreadyOwned = prev.unlockedItems.includes(item.id);
      if (!alreadyOwned && prev.points < item.price) return prev;

      return {
        ...prev,
        points: alreadyOwned ? prev.points : prev.points - item.price,
        unlockedItems: alreadyOwned
          ? prev.unlockedItems
          : [...prev.unlockedItems, item.id],
        equippedWeaponId:
          item.category === 'weapon' ? item.id : prev.equippedWeaponId,
        equippedWingsId:
          item.category === 'wings' ? item.id : prev.equippedWingsId,
      };
    });
  };

  // =========================================================================
  // SCREEN 1: 3D CHARACTER SELECTION (GENSHIN STYLE, RESPONSIVE MOBILE/DESKTOP)
  // =========================================================================
  if (screen === 'character-select') {
    const elemStyle = ELEMENT_STYLES[activeCharacter.element];

    return (
      <div className="relative w-full h-[100dvh] overflow-hidden bg-[#0e1422] flex flex-col lg:flex-row">
        {/* Top/Left: Interactive 3D Character Stage */}
        <div className="relative h-[40dvh] min-h-[250px] lg:h-full lg:flex-1 shrink-0">
          <HeroPreview3D
            character={activeCharacter}
            weaponSkinId={progress.equippedWeaponId}
            wingsId={progress.equippedWingsId}
            triggerPoseKey={poseKey}
          />

          {/* Top-Left Brand Header */}
          <div className="absolute top-3 left-3 sm:top-5 sm:left-6 z-10 pointer-events-none">
            <div className="text-[10px] sm:text-xs font-semibold tracking-wider text-[#e5b84b]">
              PETUALANGAN PAS SEMESTER 1 · SD KELAS 4
            </div>
            <h1 className="font-display text-xl sm:text-3xl font-extrabold text-[#f7ecd0] tracking-wide mt-0.5">
              Aetheria Nusantara
            </h1>
          </div>

          {/* Top-Right BGM & Mute on Mobile */}
          <div className="lg:hidden absolute top-3 right-3 z-10 flex items-center gap-1.5">
            <button
              onClick={toggleBgm}
              className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl border cursor-pointer ${
                bgmOn && !muted
                  ? 'border-[#d4af37]/60 bg-[#121828]/90 text-[#fde047]'
                  : 'border-white/15 bg-[#121828]/85 text-slate-400'
              }`}
              aria-label="Musik Latar"
            >
              <Music className="w-4 h-4" />
            </button>
            <button
              onClick={toggleMute}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl border border-white/15 bg-[#121828]/85 text-slate-200 cursor-pointer"
              aria-label="Suara"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>

          {/* Bottom-Left 3D Interaction Hint & Pose Button */}
          <div className="absolute bottom-3 left-3 sm:bottom-6 sm:left-6 z-10 flex items-center gap-2.5">
            <button
              onClick={() => {
                soundEngine.playAttack();
                setPoseKey((k) => k + 1);
              }}
              className="min-h-[44px] px-3.5 sm:px-4 py-2 rounded-xl bg-[#161f33]/92 border border-[#d4af37]/45 text-xs font-bold text-[#fde047] hover:bg-[#1e2a45] flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Swords className="w-3.5 h-3.5" />
              <span>Uji Jurus 3D</span>
            </button>
            <span className="hidden sm:inline text-xs text-slate-300 bg-[#0e1422]/85 px-3 py-2 rounded-xl border border-white/10">
              Geser layar untuk memutar karakter 3D 360°
            </span>
          </div>
        </div>

        {/* Bottom/Right Panel: Character Cards + Student Name + Start Button */}
        <div className="flex-1 lg:flex-none w-full lg:w-[440px] bg-[#121828] border-t lg:border-t-0 lg:border-l border-[#d4af37]/30 p-4 sm:p-6 flex flex-col justify-between overflow-y-auto z-20">
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-base sm:text-lg font-bold text-[#f7ecd0]">
                  Pilih Karakter 3D Kamu
                </h2>
                <p className="text-xs text-slate-300">
                  Setiap pahlawan memiliki kekuatan elemen unik di medan ujian
                </p>
              </div>
              <div className="hidden lg:flex items-center gap-1.5 shrink-0">
                <button
                  onClick={toggleBgm}
                  className={`min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg border cursor-pointer ${
                    bgmOn && !muted
                      ? 'border-[#d4af37]/50 bg-[#d4af37]/15 text-[#fde047]'
                      : 'border-white/15 bg-white/5 text-slate-400'
                  }`}
                  aria-label="Musik Latar"
                  title={bgmOn ? 'Matikan Musik Latar' : 'Nyalakan Musik Latar'}
                >
                  <Music className="w-4 h-4" />
                </button>
                <button
                  onClick={toggleMute}
                  className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg border border-white/15 bg-white/5 text-slate-200 hover:bg-white/10 cursor-pointer"
                  aria-label="Suara"
                  title={muted ? 'Nyalakan Semua Suara' : 'Matikan Semua Suara'}
                >
                  {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Student Name Input */}
            <div>
              <label
                htmlFor="student-name"
                className="block text-xs font-semibold text-slate-300 mb-1"
              >
                Nama Petualang (Siswa Kelas 4)
              </label>
              <input
                id="student-name"
                type="text"
                maxLength={24}
                value={progress.playerName}
                onChange={(e) =>
                  setProgress((p) => ({ ...p, playerName: e.target.value }))
                }
                placeholder="Ketik namamu..."
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#1a2236] border border-white/15 text-sm font-medium text-white focus:outline-none focus:border-[#d4af37]"
              />
            </div>

            {/* 4 Character Selector Cards */}
            <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
              {CHARACTERS.map((char) => {
                const selected = char.id === activeCharacter.id;
                const el = ELEMENT_STYLES[char.element];
                return (
                  <button
                    key={char.id}
                    onClick={() => {
                      soundEngine.playClick();
                      setProgress((p) => ({ ...p, selectedCharacterId: char.id }));
                    }}
                    className={`min-h-[56px] p-2.5 sm:p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      selected
                        ? 'bg-[#1f2942] border-[#d4af37] shadow-lg'
                        : 'bg-[#171f33] border-white/10 hover:border-white/25'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-sm text-white">
                        {char.name}
                      </span>
                      <span
                        className="text-[11px] font-bold"
                        style={{ color: el.color }}
                      >
                        {el.name}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-300 truncate mt-0.5">
                      {char.weaponLabel}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Character Bio & Passive */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-[#171f33] border border-white/10 space-y-1.5 sm:space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-display text-sm sm:text-base font-bold text-[#f7ecd0]">
                  {activeCharacter.name} — {activeCharacter.title}
                </span>
              </div>
              <div className="text-xs font-semibold" style={{ color: elemStyle.color }}>
                Elemen {activeCharacter.elementLabel} · Senjata: {activeCharacter.weaponLabel}
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {activeCharacter.lore}
              </p>
              <div className="pt-1.5 border-t border-white/10">
                <div className="text-xs font-bold text-[#fde047]">
                  Bakat Pasif: {activeCharacter.passiveTitle}
                </div>
                <div className="text-xs text-slate-200 mt-0.5">
                  {activeCharacter.passiveDesc}
                </div>
              </div>
            </div>
          </div>

          {/* Primary CTA: Enter World Map */}
          <div className="pt-3.5 mt-3.5 border-t border-white/10 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-300 font-mono-tabular">
              <span>Adventure Rank {adventureRank}</span>
              <span>
                {progress.points} Poin · {progress.crystals} Kristal
              </span>
            </div>
            <button
              onClick={() => {
                soundEngine.playTeleport();
                setScreen('world-map');
              }}
              className="w-full min-h-[48px] py-3 px-5 rounded-xl font-bold text-sm bg-gradient-to-r from-[#d4af37] to-[#f0c95c] text-[#111827] hover:brightness-105 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-xl cursor-pointer"
            >
              <MapIcon className="w-4 h-4" />
              <span>Masuk ke Peta Dunia (9 Wilayah)</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // SCREEN 2: WORLD MAP MENU (ALL 9 SUBJECT REGIONS)
  // =========================================================================
  if (screen === 'world-map') {
    return (
      <div className="w-full h-[100dvh] bg-[#090d16]">
        <WorldMapModal
          progress={progress}
          currentRegionId={currentRegionId}
          allowClose={false}
          onSelectRegion={(regionId) => {
            setCurrentRegionId(regionId);
            setActiveBattleLevel(null);
            setNearbyEnemyLevel(null);
            setAutoMoveTargetLevel(null);
            setScreen('region-3d');
          }}
        />
      </div>
    );
  }

  // =========================================================================
  // SCREEN 3: 3D OPEN ADVENTURE REGION + 3 ENEMY LEVELS + QUIZ COMBAT
  // =========================================================================
  const regionStars = progress.regionStars[activeRegion.id] || [0, 0, 0];
  const unlockedLevel = progress.regionUnlockedLevel[activeRegion.id] || 1;
  const activeElem = ELEMENT_STYLES[activeRegion.element];
  const nearbyEnemyDef = nearbyEnemyLevel
    ? activeRegion.levels[nearbyEnemyLevel - 1]
    : null;
  const battleLevelDef = activeBattleLevel
    ? activeRegion.levels[activeBattleLevel - 1]
    : null;

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden bg-[#0e1422]">
      {/* Full-Viewport 3D RPG World Canvas */}
      <WorldScene3D
        region={activeRegion}
        character={activeCharacter}
        weaponSkinId={progress.equippedWeaponId}
        wingsId={progress.equippedWingsId}
        unlockedLevel={unlockedLevel}
        levelStars={regionStars}
        activeBattleLevel={activeBattleLevel}
        combatEvent={combatEvent}
        autoMoveTargetLevel={autoMoveTargetLevel}
        virtualPad={virtualPad}
        onNearbyEnemyChange={setNearbyEnemyLevel}
        onSelectEnemyCamp={(lvl) => {
          if (nearbyEnemyLevel === lvl) {
            handleStartBattle(lvl);
          } else {
            soundEngine.playClick();
            setAutoMoveTargetLevel(lvl);
          }
        }}
        onAutoMoveArrived={() => {
          const target = autoMoveTargetLevel;
          setAutoMoveTargetLevel(null);
          if (target) handleStartBattle(target);
        }}
      />

      {/* TOP-LEFT HUD: Compact Region Info (Hidden during battle on mobile/tablet so Battle Versus Bar has full space) */}
      <div
        className={`fixed top-2.5 left-2.5 sm:top-4 sm:left-4 z-20 flex flex-col gap-1.5 pointer-events-none ${
          activeBattleLevel !== null
            ? 'hidden'
            : 'max-w-[54vw] sm:max-w-xs'
        }`}
      >
        <div className="pointer-events-auto px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-[#101727]/90 border border-[#d4af37]/35 shadow-lg">
          <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-semibold text-slate-300">
            <span style={{ color: activeElem.color }}>{activeElem.name}</span>
            <span aria-hidden="true">·</span>
            <span>AR {adventureRank}</span>
            <span className="hidden sm:inline" aria-hidden="true">
              ·
            </span>
            <span className="hidden sm:inline truncate">
              {progress.playerName}
            </span>
          </div>
          <div className="font-display text-sm sm:text-lg font-bold text-[#f7ecd0] leading-tight truncate">
            {activeRegion.subjectName}
          </div>
          <div className="hidden sm:block text-xs text-slate-300 truncate">
            {activeRegion.fantasyName}
          </div>
        </div>
      </div>

      {/* TOP-RIGHT HUD: Points, Quick Nav (Full on Desktop, Compact Menu on Smartphones) */}
      <div className="fixed top-2.5 right-2.5 sm:top-4 sm:right-4 z-30 flex items-center gap-1.5 sm:gap-2">
        <div className="min-h-[40px] px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-[#101727]/90 border border-[#d4af37]/35 flex items-center gap-2.5 text-xs font-mono-tabular">
          <span className="text-[#fde047] font-bold flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{progress.points}</span>
            <span className="hidden sm:inline">Poin</span>
          </span>
          <span className="text-sky-300 font-bold hidden sm:inline">
            {progress.crystals} Kristal
          </span>
        </div>

        {activeBattleLevel === null && (
          <>
            {/* Desktop Quick Buttons */}
            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={() => {
                  soundEngine.playOpenModal();
                  setShowMapOverlay(true);
                }}
                className="min-h-[40px] px-3 py-2 rounded-xl bg-[#101727]/90 border border-white/15 text-xs font-semibold text-white hover:border-[#d4af37] flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5 text-[#e5b84b]" />
                <span>Peta Wilayah</span>
              </button>

              <button
                onClick={() => {
                  soundEngine.playOpenModal();
                  setShowShop(true);
                }}
                className="min-h-[40px] px-3 py-2 rounded-xl bg-[#101727]/90 border border-white/15 text-xs font-semibold text-white hover:border-[#d4af37] flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
                <span>Toko Hadiah</span>
              </button>

              <button
                onClick={() => {
                  soundEngine.playOpenModal();
                  setShowReport(true);
                }}
                className="min-h-[40px] px-3 py-2 rounded-xl bg-[#101727]/90 border border-white/15 text-xs font-semibold text-white hover:border-[#d4af37] flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Award className="w-3.5 h-3.5 text-sky-400" />
                <span>Rapor PAS</span>
              </button>

              <button
                onClick={() => {
                  soundEngine.playClick();
                  setScreen('character-select');
                }}
                className="min-h-[40px] px-3 py-2 rounded-xl bg-[#101727]/90 border border-white/15 text-xs font-semibold text-white hover:border-[#d4af37] flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                title="Ganti Karakter 3D"
              >
                <UserCheck className="w-3.5 h-3.5 text-rose-300" />
                <span>Karakter</span>
              </button>
            </div>

            {/* Mobile/Tablet Compact Map + Menu Buttons */}
            <button
              onClick={() => {
                soundEngine.playOpenModal();
                setShowMobileMenu(false);
                setShowMapOverlay(true);
              }}
              className="md:hidden min-h-[40px] px-2.5 py-2 rounded-xl bg-[#101727]/90 border border-white/15 text-xs font-semibold text-white flex items-center gap-1 cursor-pointer"
              aria-label="Peta Wilayah"
            >
              <Compass className="w-4 h-4 text-[#e5b84b]" />
              <span className="hidden sm:inline">Peta</span>
            </button>

            <button
              onClick={() => {
                soundEngine.playClick();
                setShowMobileMenu((v) => !v);
              }}
              className="md:hidden min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl bg-[#101727]/90 border border-white/15 text-white cursor-pointer"
              aria-label="Menu Petualangan"
            >
              {showMobileMenu ? (
                <X className="w-4 h-4" />
              ) : (
                <Menu className="w-4 h-4" />
              )}
            </button>
          </>
        )}

        <button
          onClick={toggleBgm}
          className={`min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl border cursor-pointer ${
            bgmOn && !muted
              ? 'bg-[#101727]/90 border-[#d4af37]/50 text-[#fde047]'
              : 'bg-[#101727]/90 border-white/15 text-slate-400'
          }`}
          aria-label="Matikan atau nyalakan musik latar"
          title={bgmOn ? 'Matikan Musik Latar' : 'Nyalakan Musik Latar'}
        >
          <Music className="w-4 h-4" />
        </button>

        <button
          onClick={toggleMute}
          className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl bg-[#101727]/90 border border-white/15 text-slate-200 hover:border-[#d4af37] cursor-pointer"
          aria-label="Matikan atau nyalakan suara"
          title={muted ? 'Nyalakan Semua Suara' : 'Matikan Semua Suara'}
        >
          {muted ? (
            <VolumeX className="w-4 h-4" />
          ) : (
            <Volume2 className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* MOBILE MENU DROPDOWN (Clean 44px+ buttons when < md) */}
      {activeBattleLevel === null && showMobileMenu && (
        <div className="md:hidden fixed top-14 right-2.5 z-30 w-52 rounded-2xl border border-[#d4af37]/40 bg-[#101727]/95 p-2 shadow-2xl space-y-1.5">
          <button
            onClick={() => {
              soundEngine.playClick();
              setShowMobileMenu(false);
              setShowShop(true);
            }}
            className="w-full min-h-[44px] px-3 rounded-xl bg-white/5 hover:bg-white/10 text-left text-xs font-semibold text-white flex items-center gap-2.5 cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4 text-emerald-400" />
            <span>Toko Hadiah &amp; Senjata</span>
          </button>
          <button
            onClick={() => {
              soundEngine.playClick();
              setShowMobileMenu(false);
              setShowReport(true);
            }}
            className="w-full min-h-[44px] px-3 rounded-xl bg-white/5 hover:bg-white/10 text-left text-xs font-semibold text-white flex items-center gap-2.5 cursor-pointer"
          >
            <Award className="w-4 h-4 text-sky-400" />
            <span>Rapor Kesiapan PAS</span>
          </button>
          <button
            onClick={() => {
              soundEngine.playClick();
              setShowMobileMenu(false);
              setScreen('character-select');
            }}
            className="w-full min-h-[44px] px-3 rounded-xl bg-white/5 hover:bg-white/10 text-left text-xs font-semibold text-white flex items-center gap-2.5 cursor-pointer"
          >
            <UserCheck className="w-4 h-4 text-rose-300" />
            <span>Ganti Karakter 3D</span>
          </button>
          <button
            onClick={() => {
              soundEngine.playClick();
              setShowTouchPad((v) => !v);
              setShowMobileMenu(false);
            }}
            className="w-full min-h-[44px] px-3 rounded-xl bg-white/5 hover:bg-white/10 text-left text-xs font-semibold text-white flex items-center gap-2.5 cursor-pointer"
          >
            <Gamepad2 className="w-4 h-4 text-amber-300" />
            <span>{showTouchPad ? 'Sembunyikan Analog' : 'Tampilkan Analog'}</span>
          </button>
        </div>
      )}

      {/* PROXIMITY PROMPT: [F] / Tap Tantang Musuh */}
      {activeBattleLevel === null && nearbyEnemyDef && (
        <div className="fixed bottom-24 sm:bottom-24 left-1/2 -translate-x-1/2 z-20 max-w-[92vw]">
          <button
            onClick={() => handleStartBattle(nearbyEnemyDef.level)}
            className="min-h-[48px] px-4 sm:px-5 py-2.5 rounded-xl bg-[#f7ecd0] text-[#111827] border-2 border-[#d4af37] shadow-2xl font-bold text-xs sm:text-sm flex items-center gap-2 hover:scale-105 transition-transform cursor-pointer whitespace-nowrap"
          >
            <span className="hidden md:inline px-1.5 py-0.5 rounded bg-[#111827] text-[#fde047] text-xs font-mono-tabular">
              F
            </span>
            <Swords className="w-4 h-4 text-amber-700 shrink-0" />
            <span className="truncate">
              Tantang Lv.{nearbyEnemyDef.level}: {nearbyEnemyDef.enemyName}
            </span>
          </button>
        </div>
      )}

      {/* BOTTOM EXPLORATION DOCK: 3 Level Enemy Waypoints + Controls */}
      {activeBattleLevel === null && (
        <div className="fixed bottom-2.5 sm:bottom-3 left-1/2 -translate-x-1/2 z-20 w-[96vw] max-w-3xl">
          <div className="px-2.5 sm:px-3.5 py-2 rounded-2xl bg-[#101727]/92 border border-[#d4af37]/35 shadow-xl flex items-center justify-between gap-2 overflow-x-auto">
            {/* 3 Enemy Camps Quick-Navigate Buttons */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {activeRegion.levels.map((lvl, idx) => {
                const isUnlocked = lvl.level <= unlockedLevel;
                const stars = regionStars[idx];
                const isTracking = autoMoveTargetLevel === lvl.level;

                return (
                  <button
                    key={lvl.level}
                    disabled={!isUnlocked}
                    onClick={() => {
                      soundEngine.playClick();
                      setAutoMoveTargetLevel(lvl.level);
                    }}
                    className={`min-h-[40px] px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      !isUnlocked
                        ? 'bg-white/5 border-white/5 text-slate-500 cursor-not-allowed'
                        : isTracking
                        ? 'bg-[#d4af37] border-[#f7ecd0] text-[#111827] font-bold'
                        : 'bg-[#1a2338] border-white/15 text-white hover:border-[#d4af37]'
                    }`}
                  >
                    <span>
                      Lv.{lvl.level} {lvl.level === 3 ? 'Bos' : 'Musuh'}
                    </span>
                    <span className="flex items-center gap-0.5">
                      {[1, 2, 3].map((s) => (
                        <Star
                          key={s}
                          className={`w-3 h-3 ${
                            s <= stars
                              ? 'fill-amber-400 text-amber-400'
                              : isTracking
                              ? 'text-[#111827]/35'
                              : 'text-slate-600'
                          }`}
                        />
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Desktop Movement Hints & Touch Analog Toggle */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="hidden lg:inline text-[11px] text-slate-300 whitespace-nowrap">
                WASD Gerak · Spasi Lompat · Shift Lari · Geser Kamera
              </span>
              <button
                onClick={() => {
                  soundEngine.playClick();
                  setShowTouchPad((v) => !v);
                }}
                className={`hidden md:flex min-h-[38px] px-2.5 py-1.5 rounded-lg border text-xs font-semibold items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                  showTouchPad
                    ? 'bg-[#d4af37] text-[#111827] border-[#f7ecd0]'
                    : 'bg-white/5 text-slate-200 border-white/15 hover:bg-white/10'
                }`}
              >
                <Gamepad2 className="w-3.5 h-3.5" />
                <span>Analog Layar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GENSHIN-STYLE 360° VIRTUAL ANALOG STICK & JUMP/SPRINT FOR SMARTPHONE/TABLET */}
      {activeBattleLevel === null &&
        showTouchPad &&
        !showMapOverlay &&
        !showShop &&
        !showReport && <MobileTouchControls onChange={setVirtualPad} />}

      {/* BATTLE QUIZ HUD OVERLAY */}
      {battleLevelDef && (
        <BattleQuizPanel
          region={activeRegion}
          levelDef={battleLevelDef}
          character={activeCharacter}
          weaponBonus={weaponBonus}
          foodCount={progress.foodCount}
          onUseFood={() =>
            setProgress((p) => ({
              ...p,
              foodCount: Math.max(0, p.foodCount - 1),
            }))
          }
          onCombatEvent={handleCombatEvent}
          onCompleteLevel={handleCompleteLevel}
          onRetreat={() => setActiveBattleLevel(null)}
        />
      )}

      {/* WORLD MAP OVERLAY (Teleport to any of the 9 Regions) */}
      {showMapOverlay && (
        <WorldMapModal
          progress={progress}
          currentRegionId={currentRegionId}
          allowClose={true}
          onClose={() => setShowMapOverlay(false)}
          onSelectRegion={(regionId) => {
            setCurrentRegionId(regionId);
            setActiveBattleLevel(null);
            setNearbyEnemyLevel(null);
            setAutoMoveTargetLevel(null);
            setShowMapOverlay(false);
          }}
        />
      )}

      {/* REWARD SHOP MODAL */}
      {showShop && (
        <ShopAndInventoryModal
          progress={progress}
          onBuyOrEquip={handleBuyOrEquip}
          onClose={() => setShowShop(false)}
        />
      )}

      {/* PAS REPORT CARD MODAL */}
      {showReport && (
        <ReportCardModal
          progress={progress}
          onJumpToRegion={(regionId) => {
            setCurrentRegionId(regionId);
            setActiveBattleLevel(null);
            setNearbyEnemyLevel(null);
            setAutoMoveTargetLevel(null);
            setShowReport(false);
          }}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}
