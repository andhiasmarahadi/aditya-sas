import { Award, BookOpen, Star, X } from 'lucide-react';
import { ELEMENT_STYLES } from '../data/characters';
import { REGIONS } from '../data/regions';
import { PlayerProgress } from '../types/game';
import { soundEngine } from '../utils/audio';

interface ReportCardModalProps {
  progress: PlayerProgress;
  onJumpToRegion: (regionId: string) => void;
  onClose: () => void;
}

export function ReportCardModal({
  progress,
  onJumpToRegion,
  onClose,
}: ReportCardModalProps) {
  const totalCorrect = REGIONS.reduce((acc, r) => {
    const b = progress.regionBestCorrect[r.id] || [0, 0, 0];
    return acc + b[0] + b[1] + b[2];
  }, 0);
  const totalQuestions = REGIONS.length * 30;
  const pct = Math.round((totalCorrect / totalQuestions) * 100);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#090d16]/90 p-2.5 sm:p-4">
      <div className="w-full max-w-4xl rounded-2xl border border-[#d4af37]/40 bg-[#121828] shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 bg-[#0e1422] border-b border-white/10">
          <div className="flex items-center gap-2.5 min-w-0">
            <Award className="w-5 h-5 text-[#e5b84b] shrink-0" />
            <div className="min-w-0">
              <h2 className="font-display text-sm sm:text-lg font-bold text-[#f7ecd0] truncate">
                Rapor PAS Semester 1 · {progress.playerName}
              </h2>
              <p className="hidden sm:block text-xs text-slate-300 truncate">
                Rekap nilai terbaik siswa kelas 4 SD di 9 mata pelajaran
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              soundEngine.playClick();
              onClose();
            }}
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg border border-white/15 bg-white/5 text-slate-200 hover:bg-white/15 cursor-pointer shrink-0"
            aria-label="Tutup Rapor"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Summary Banner */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-[#172036] border-b border-white/10 grid grid-cols-3 gap-2 sm:gap-4 text-center shrink-0">
          <div>
            <div className="text-[11px] sm:text-xs text-slate-400">Penguasaan</div>
            <div className="text-lg sm:text-xl font-mono-tabular font-bold text-emerald-400">
              {pct}%
            </div>
          </div>
          <div>
            <div className="text-[11px] sm:text-xs text-slate-400">Soal Dikuasai</div>
            <div className="text-lg sm:text-xl font-mono-tabular font-bold text-white">
              {totalCorrect} / {totalQuestions}
            </div>
          </div>
          <div>
            <div className="text-[11px] sm:text-xs text-slate-400">Total Poin</div>
            <div className="text-lg sm:text-xl font-mono-tabular font-bold text-[#fde047]">
              {progress.points}
            </div>
          </div>
        </div>

        {/* Subject Breakdown Grid */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-2.5">
          {REGIONS.map((r) => {
            const best = progress.regionBestCorrect[r.id] || [0, 0, 0];
            const stars = progress.regionStars[r.id] || [0, 0, 0];
            const sumBest = best[0] + best[1] + best[2];
            const sumStars = stars[0] + stars[1] + stars[2];
            const subjPct = Math.round((sumBest / 30) * 100);
            const elem = ELEMENT_STYLES[r.element];

            return (
              <div
                key={r.id}
                className="p-3 sm:p-3.5 rounded-xl border border-white/10 bg-[#171f33] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 shrink-0" style={{ color: elem.color }} />
                    <span className="font-bold text-sm text-white">
                      {r.subjectName}
                    </span>
                    <span className="text-xs text-slate-400 truncate">
                      · {r.fantasyName}
                    </span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-800 overflow-hidden max-w-md">
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${subjPct}%`,
                        backgroundColor: elem.color,
                      }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                  <div className="text-left sm:text-right">
                    <div className="text-xs font-mono-tabular font-bold text-white">
                      {sumBest}/30 ({subjPct}%)
                    </div>
                    <div className="text-[11px] font-mono-tabular text-amber-300 flex items-center sm:justify-end gap-1">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span>{sumStars}/9 Bintang</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      soundEngine.playTeleport();
                      onJumpToRegion(r.id);
                    }}
                    className="min-h-[40px] px-4 py-1.5 rounded-lg text-xs font-bold bg-white/10 text-white hover:bg-[#d4af37] hover:text-[#111827] transition-colors cursor-pointer"
                  >
                    Latihan
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
