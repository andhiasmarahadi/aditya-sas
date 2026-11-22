import { useState } from 'react';
import { Compass, MapPin, Star, Swords, Trophy, X } from 'lucide-react';
import { ELEMENT_STYLES } from '../data/characters';
import { REGIONS } from '../data/regions';
import { PlayerProgress, RegionDef } from '../types/game';
import { soundEngine } from '../utils/audio';

interface WorldMapModalProps {
  progress: PlayerProgress;
  currentRegionId: string;
  onSelectRegion: (regionId: string) => void;
  onClose?: () => void;
  allowClose: boolean;
}

export function WorldMapModal({
  progress,
  currentRegionId,
  onSelectRegion,
  onClose,
  allowClose,
}: WorldMapModalProps) {
  const [focusedId, setFocusedId] = useState<string>(currentRegionId);
  const focusedRegion: RegionDef =
    REGIONS.find((r) => r.id === focusedId) || REGIONS[0];

  const totalStars = REGIONS.reduce((acc, r) => {
    const s = progress.regionStars[r.id] || [0, 0, 0];
    return acc + s[0] + s[1] + s[2];
  }, 0);

  const focusedStars = progress.regionStars[focusedRegion.id] || [0, 0, 0];
  const focusedUnlocked = progress.regionUnlockedLevel[focusedRegion.id] || 1;
  const focusedBest = progress.regionBestCorrect[focusedRegion.id] || [0, 0, 0];
  const elem = ELEMENT_STYLES[focusedRegion.element];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#090d16]/92 p-2 sm:p-4 md:p-6">
      <div className="relative flex flex-col lg:flex-row w-full max-w-6xl h-[94dvh] lg:h-[90dvh] max-h-[780px] rounded-2xl border border-[#d4af37]/35 bg-[#121828] shadow-2xl overflow-hidden">
        {/* Left/Center: Interactive Genshin-style Teyvat Nusantara Map */}
        <div className="relative h-[44dvh] min-h-[260px] lg:h-auto lg:flex-1 bg-[#162033] overflow-hidden border-b lg:border-b-0 lg:border-r border-[#d4af37]/20 shrink-0">
          {/* Top Map Header */}
          <div className="relative z-10 flex items-center justify-between px-3.5 sm:px-5 py-2.5 sm:py-3.5 bg-[#0e1422]/90 border-b border-white/10">
            <div className="flex items-center gap-2.5 min-w-0">
              <Compass className="w-5 h-5 text-[#e5b84b] shrink-0" />
              <div className="min-w-0">
                <h2 className="font-display text-sm sm:text-lg font-bold text-[#f7ecd0] tracking-wide truncate">
                  Peta Dunia Aetheria Nusantara
                </h2>
                <p className="hidden sm:block text-xs text-slate-300 truncate">
                  Pilih wilayah mata pelajaran untuk berpetualang 3D &amp; latihan PAS Semester 1
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
              <div className="flex items-center gap-1 text-xs sm:text-sm font-mono-tabular text-[#fde047]">
                <Star className="w-4 h-4 fill-[#fde047]" />
                <span>{totalStars}/81</span>
              </div>
              {allowClose && onClose && (
                <button
                  onClick={() => {
                    soundEngine.playClick();
                    onClose();
                  }}
                  className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg border border-white/15 bg-white/5 text-slate-200 hover:bg-white/15 transition-colors cursor-pointer"
                  aria-label="Tutup Peta"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Stylized Fantasy Continent Canvas */}
          <div className="relative w-full h-[calc(100%-52px)] sm:h-[calc(100%-60px)] overflow-hidden">
            {/* Cartographic Grid & Sea Gradient */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  'radial-gradient(circle at 50% 48%, #21374f 0%, #152336 58%, #0e1726 100%)',
              }}
            />

            {/* Decorative Continent Landmasses SVG + Ley-Line Paths */}
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="absolute inset-0 w-full h-full pointer-events-none"
            >
              {/* Main Stylized Landmass Silhouettes */}
              <path
                d="M10,16 Q25,8 46,12 T82,18 Q92,38 88,65 T78,88 Q52,92 22,86 T10,55 Z"
                fill="#223b32"
                fillOpacity="0.58"
                stroke="#d4af37"
                strokeOpacity="0.25"
                strokeWidth="0.35"
              />
              <path
                d="M16,22 Q38,16 55,24 T78,34 Q82,58 70,76 T26,76 Q14,56 16,22 Z"
                fill="#2b4a3e"
                fillOpacity="0.45"
              />
              {/* Compass Rose Rings */}
              <circle
                cx="50"
                cy="50"
                r="34"
                fill="none"
                stroke="#d4af37"
                strokeOpacity="0.14"
                strokeWidth="0.25"
                strokeDasharray="1.5 1.5"
              />
              <circle
                cx="50"
                cy="50"
                r="20"
                fill="none"
                stroke="#d4af37"
                strokeOpacity="0.14"
                strokeWidth="0.2"
              />
              {/* Ley-Line Travel Routes between Regions */}
              {REGIONS.map((r, i) => {
                const next = REGIONS[(i + 1) % REGIONS.length];
                return (
                  <line
                    key={r.id}
                    x1={r.mapPos.x}
                    y1={r.mapPos.y}
                    x2={next.mapPos.x}
                    y2={next.mapPos.y}
                    stroke="#e5b84b"
                    strokeOpacity="0.28"
                    strokeWidth="0.35"
                    strokeDasharray="1.2 1.2"
                  />
                );
              })}
            </svg>

            {/* 9 Interactive Region Teleport Waypoint Pins */}
            {REGIONS.map((region) => {
              const isSelected = region.id === focusedRegion.id;
              const stars = progress.regionStars[region.id] || [0, 0, 0];
              const starSum = stars[0] + stars[1] + stars[2];
              const elStyle = ELEMENT_STYLES[region.element];

              return (
                <button
                  key={region.id}
                  onClick={() => {
                    soundEngine.playClick();
                    setFocusedId(region.id);
                  }}
                  style={{
                    left: `${region.mapPos.x}%`,
                    top: `${region.mapPos.y}%`,
                  }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 group flex flex-col items-center cursor-pointer transition-transform ${
                    isSelected ? 'scale-105 sm:scale-110 z-20' : 'hover:scale-105 z-10'
                  }`}
                >
                  {/* Waypoint Diamond Pin */}
                  <div
                    className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl rotate-45 flex items-center justify-center border-2 shadow-lg transition-colors"
                    style={{
                      backgroundColor: isSelected ? elStyle.color : '#172136',
                      borderColor: isSelected ? '#ffffff' : elStyle.color,
                      color: isSelected ? '#0f172a' : elStyle.color,
                    }}
                  >
                    <MapPin className="-rotate-45 w-3.5 h-3.5 sm:w-5 sm:h-5" />
                  </div>

                  {/* Clean Region Label */}
                  <div
                    className={`mt-1 sm:mt-2 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-md border text-center whitespace-nowrap shadow-md ${
                      isSelected
                        ? 'bg-[#f7ecd0] text-[#111827] border-[#d4af37]'
                        : 'bg-[#0e1422]/90 text-[#f5efe0] border-white/15'
                    }`}
                  >
                    <div className="text-[10px] sm:text-xs font-bold leading-tight">
                      {region.subjectName}
                    </div>
                    <div className="hidden sm:flex text-[10px] font-mono-tabular opacity-85 items-center justify-center gap-1 mt-0.5">
                      <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                      <span>{starSum}/9</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right/Bottom Panel: Selected Region Details & 3 Levels Preview */}
        <div className="flex-1 lg:flex-none w-full lg:w-[370px] flex flex-col justify-between p-4 sm:p-5 bg-[#121828] overflow-y-auto">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>{elem.name}</span>
              <span>3 Level · 30 Soal PAS</span>
            </div>

            <h3 className="font-display text-lg sm:text-xl font-bold text-[#f7ecd0]">
              {focusedRegion.subjectName}
            </h3>
            <p className="text-xs sm:text-sm font-medium mt-0.5" style={{ color: elem.color }}>
              {focusedRegion.fantasyName}
            </p>
            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
              Materi: {focusedRegion.subtitle}
            </p>

            {/* 3 Enemy Levels inside this Region */}
            <div className="mt-3.5 sm:mt-5 space-y-2">
              <div className="text-xs font-semibold text-slate-300">
                Musuh Penjaga Wilayah (3 Level):
              </div>
              {focusedRegion.levels.map((lvl, idx) => {
                const isUnlocked = lvl.level <= focusedUnlocked;
                const stars = focusedStars[idx];
                const best = focusedBest[idx];

                return (
                  <div
                    key={lvl.level}
                    className={`p-2.5 sm:p-3 rounded-xl border ${
                      isUnlocked
                        ? 'bg-[#1a2236] border-white/10'
                        : 'bg-[#131927] border-white/5 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-[#e5b84b]">
                          Level {lvl.level} · {lvl.questions.length} Soal
                        </div>
                        <div className="text-sm font-bold text-white truncate">
                          {lvl.enemyName}
                        </div>
                        <div className="text-xs text-slate-400 truncate">
                          {lvl.enemyTitle}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="flex items-center gap-0.5 justify-end">
                          {[1, 2, 3].map((s) => (
                            <Star
                              key={s}
                              className={`w-3.5 h-3.5 ${
                                s <= stars
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-slate-600'
                              }`}
                            />
                          ))}
                        </div>
                        <div className="text-[11px] font-mono-tabular text-slate-300 mt-1">
                          {best > 0 ? `Terbaik ${best}/10` : `+${lvl.rewardPoints} Poin`}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3.5 mt-3.5 border-t border-white/10 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                Total Skor Wilayah
              </span>
              <span className="font-mono-tabular font-bold text-white">
                {focusedBest[0] + focusedBest[1] + focusedBest[2]} / 30 Benar
              </span>
            </div>

            <button
              onClick={() => {
                soundEngine.playTeleport();
                onSelectRegion(focusedRegion.id);
              }}
              className="w-full min-h-[46px] py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-[#d4af37] to-[#f0c95c] text-[#111827] hover:brightness-105 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer"
            >
              <Swords className="w-4 h-4" />
              <span>Teleportasi ke {focusedRegion.subjectName}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
