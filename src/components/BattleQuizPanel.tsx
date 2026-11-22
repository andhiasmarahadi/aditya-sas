import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Eye,
  EyeOff,
  Flame,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Star,
  Swords,
  Utensils,
  XCircle,
} from 'lucide-react';
import {
  CharacterDef,
  EnemyLevelDef,
  Question,
  RegionDef,
} from '../types/game';
import { soundEngine } from '../utils/audio';
import { CombatAnimationEvent } from './WorldScene3D';

interface BattleQuizPanelProps {
  region: RegionDef;
  levelDef: EnemyLevelDef;
  character: CharacterDef;
  weaponBonus: number;
  foodCount: number;
  onUseFood: () => void;
  onCombatEvent: (kind: CombatAnimationEvent['kind'], amountText?: string) => void;
  onCompleteLevel: (result: {
    correctCount: number;
    stars: number;
    earnedPoints: number;
    earnedCrystals: number;
  }) => void;
  onRetreat: () => void;
}

function deterministicShuffle<T>(arr: T[], seedStr: string): T[] {
  const copy = [...arr];
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) {
    seed = (seed * 31 + seedStr.charCodeAt(i)) % 9973;
  }
  for (let i = copy.length - 1; i > 0; i--) {
    seed = (seed * 17 + 13) % 9973;
    const j = seed % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  if (copy.length >= 2 && copy.every((v, idx) => v === arr[idx])) {
    [copy[0], copy[1]] = [copy[1], copy[0]];
  }
  return copy;
}

export function BattleQuizPanel({
  region,
  levelDef,
  character,
  weaponBonus,
  foodCount,
  onUseFood,
  onCombatEvent,
  onCompleteLevel,
  onRetreat,
}: BattleQuizPanelProps) {
  const questions = levelDef.questions;
  const [qIndex, setQIndex] = useState(0);
  const [heroHp, setHeroHp] = useState(100);
  const [enemyHp, setEnemyHp] = useState(100);
  const [combo, setCombo] = useState(0);
  const [burstEnergy, setBurstEnergy] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [sessionPoints, setSessionPoints] = useState(0);

  // Answer & battle-visibility states
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [showcasingCombat, setShowcasingCombat] = useState(false);
  const [combatActionBanner, setCombatActionBanner] = useState('');
  const [peekingArena, setPeekingArena] = useState(false);
  const [reviewQuestionOpen, setReviewQuestionOpen] = useState(false);
  const showcaseTimerRef = useRef<number | null>(null);

  // Type-specific input states
  const [selectedMc, setSelectedMc] = useState<number | null>(null);
  const [selectedBool, setSelectedBool] = useState<boolean | null>(null);
  const [selectedBlank, setSelectedBlank] = useState<string>('');
  const [orderDraft, setOrderDraft] = useState<string[]>([]);
  const [matchLeftSelected, setMatchLeftSelected] = useState<string | null>(null);
  const [matchPairs, setMatchPairs] = useState<Record<string, string>>({});

  // Battle finished screen
  const [finished, setFinished] = useState(false);

  const currentQ: Question = questions[qIndex];

  const shuffledRightOptions = useMemo(() => {
    if (currentQ.type !== 'matching' || !currentQ.pairs) return [];
    return deterministicShuffle(
      currentQ.pairs.map((p) => p.right),
      currentQ.id + '-match'
    );
  }, [currentQ]);

  useEffect(() => {
    return () => {
      if (showcaseTimerRef.current !== null) {
        window.clearTimeout(showcaseTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (showcaseTimerRef.current !== null) {
      window.clearTimeout(showcaseTimerRef.current);
      showcaseTimerRef.current = null;
    }
    setSubmitted(false);
    setIsCorrect(false);
    setFeedbackMsg('');
    setShowcasingCombat(false);
    setCombatActionBanner('');
    setPeekingArena(false);
    setReviewQuestionOpen(false);
    setSelectedMc(null);
    setSelectedBool(null);
    setSelectedBlank('');
    setMatchLeftSelected(null);
    setMatchPairs({});
    if (currentQ.type === 'ordering' && currentQ.orderItems) {
      setOrderDraft(deterministicShuffle(currentQ.orderItems, currentQ.id + '-ord'));
    } else {
      setOrderDraft([]);
    }
  }, [currentQ]);

  const evaluateAnswer = (answerCorrect: boolean) => {
    if (submitted) return;
    setSubmitted(true);
    setIsCorrect(answerCorrect);
    setPeekingArena(false);
    setReviewQuestionOpen(false);
    setShowcasingCombat(true);

    if (answerCorrect) {
      const nextCombo = combo + 1;
      const isBurstReady = burstEnergy >= 100;
      const nextEnergy = isBurstReady ? 0 : Math.min(100, burstEnergy + 34);

      setCombo(nextCombo);
      setBurstEnergy(nextEnergy);
      setCorrectCount((c) => c + 1);

      let basePts = 15 + weaponBonus;
      if (character.id === 'sora' && nextCombo >= 2) {
        basePts = Math.round(basePts * 1.15);
      }
      if (isBurstReady) {
        basePts += character.id === 'kaelani' ? 25 : 15;
        const burstDmg = basePts * 2 + 28;
        soundEngine.playBurst();
        onCombatEvent('hero-burst', `BURST -${burstDmg}!`);
        setCombatActionBanner(
          `${character.name} melepaskan Elemental Burst! (-${burstDmg} DMG)`
        );
        setFeedbackMsg(`Serangan Pamungkas! +${basePts} Poin`);
      } else {
        const hitDmg = basePts + 16;
        soundEngine.playCorrect();
        soundEngine.playAttack();
        onCombatEvent('hero-attack', `-${hitDmg}`);
        setCombatActionBanner(
          `${character.name} melesat menyerang ${levelDef.enemyName}! (-${hitDmg})`
        );
        setFeedbackMsg(`Tepat Sekali! +${basePts} Poin`);
      }

      if (character.id === 'mizuki' && nextCombo % 2 === 0) {
        setHeroHp((h) => Math.min(100, h + 8));
      }

      setSessionPoints((p) => p + basePts);
      setEnemyHp((hp) => Math.max(0, hp - Math.round(100 / questions.length)));
    } else {
      setCombo(0);
      soundEngine.playWrong();
      onCombatEvent('enemy-attack', '-12 HP');
      setHeroHp((hp) => Math.max(10, hp - 12));
      setCombatActionBanner(
        `${levelDef.enemyName} menyerang balik! (-12 HP)`
      );
      setFeedbackMsg('Jawaban belum tepat. Perhatikan pembahasan di bawah ya!');
    }

    if (showcaseTimerRef.current !== null) {
      window.clearTimeout(showcaseTimerRef.current);
    }
    showcaseTimerRef.current = window.setTimeout(() => {
      setShowcasingCombat(false);
      showcaseTimerRef.current = null;
    }, 1550);
  };

  const handleNext = () => {
    soundEngine.playClick();
    if (qIndex + 1 >= questions.length) {
      const stars =
        correctCount >= 9 ? 3 : correctCount >= 7 ? 2 : 1;
      const clearBonus = Math.round((correctCount / 10) * levelDef.rewardPoints);
      const totalEarned = sessionPoints + clearBonus;
      const crystals =
        stars * 10 + (character.id === 'arjuna' ? 5 : 0);

      soundEngine.playVictory();
      onCombatEvent('victory', 'MENANG!');
      setFinished(true);
      onCompleteLevel({
        correctCount,
        stars,
        earnedPoints: totalEarned,
        earnedCrystals: crystals,
      });
    } else {
      setQIndex((i) => i + 1);
    }
  };

  const handleEatFood = () => {
    if (foodCount <= 0 || heroHp >= 100) return;
    soundEngine.playHeal();
    onUseFood();
    setHeroHp((h) => Math.min(100, h + 40));
    onCombatEvent('heal', '+40 HP');
  };

  const moveOrderItem = (index: number, dir: -1 | 1) => {
    if (submitted) return;
    const target = index + dir;
    if (target < 0 || target >= orderDraft.length) return;
    soundEngine.playClick();
    const next = [...orderDraft];
    [next[index], next[target]] = [next[target], next[index]];
    setOrderDraft(next);
  };

  const handleMatchLeft = (leftItem: string) => {
    if (submitted) return;
    soundEngine.playClick();
    setMatchLeftSelected(leftItem);
  };

  const handleMatchRight = (rightItem: string) => {
    if (submitted || !matchLeftSelected) return;
    soundEngine.playClick();
    setMatchPairs((prev) => {
      const updated = { ...prev };
      for (const k of Object.keys(updated)) {
        if (updated[k] === rightItem) delete updated[k];
      }
      updated[matchLeftSelected] = rightItem;
      return updated;
    });
    setMatchLeftSelected(null);
  };

  const pairColors = ['#38bdf8', '#facc15', '#4ade80'];

  if (finished) {
    const stars = correctCount >= 9 ? 3 : correctCount >= 7 ? 2 : 1;
    const clearBonus = Math.round((correctCount / 10) * levelDef.rewardPoints);
    const totalEarned = sessionPoints + clearBonus;
    const crystals = stars * 10 + (character.id === 'arjuna' ? 5 : 0);

    return (
      <div className="fixed inset-x-0 bottom-4 z-30 flex justify-center px-3 sm:px-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-xl rounded-2xl border-2 border-[#d4af37]/60 bg-[#111828]/95 p-5 sm:p-6 shadow-2xl text-center">
          <div className="text-xs font-semibold text-[#e5b84b] mb-1">
            Pertempuran Selesai · {region.subjectName} Level {levelDef.level}
          </div>
          <h3 className="font-display text-xl sm:text-2xl font-bold text-white">
            {levelDef.enemyName} Dikalahkan!
          </h3>

          <div className="flex items-center justify-center gap-3 my-3.5">
            {[1, 2, 3].map((s) => (
              <Star
                key={s}
                className={`w-8 h-8 sm:w-9 sm:h-9 ${
                  s <= stars
                    ? 'fill-amber-400 text-amber-400 drop-shadow'
                    : 'text-slate-600'
                }`}
              />
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2.5 sm:gap-3 my-3.5 p-3 rounded-xl bg-[#1a2236] border border-white/10">
            <div>
              <div className="text-[11px] sm:text-xs text-slate-400">Jawaban Benar</div>
              <div className="text-base sm:text-lg font-mono-tabular font-bold text-emerald-400">
                {correctCount} / 10
              </div>
            </div>
            <div>
              <div className="text-[11px] sm:text-xs text-slate-400">Poin Petualang</div>
              <div className="text-base sm:text-lg font-mono-tabular font-bold text-[#fde047]">
                +{totalEarned}
              </div>
            </div>
            <div>
              <div className="text-[11px] sm:text-xs text-slate-400">Kristal Bintang</div>
              <div className="text-base sm:text-lg font-mono-tabular font-bold text-sky-400">
                +{crystals}
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              soundEngine.playClick();
              onRetreat();
            }}
            className="w-full min-h-[46px] py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-[#d4af37] to-[#f0c95c] text-[#111827] hover:brightness-105 cursor-pointer"
          >
            Ambil Peti Harta &amp; Lanjutkan Petualangan 3D
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* TOP VERSUS HP BAR (Pinned neatly at top so middle 3D arena stays wide open!) */}
      <div className="fixed inset-x-0 top-13 lg:top-3 z-20 flex justify-center px-2.5 sm:px-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-2xl grid grid-cols-2 gap-2">
          {/* Hero HP Bar */}
          <div className="flex items-center justify-between gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-[#101727]/92 border border-white/15 shadow-lg">
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between text-[11px] sm:text-xs mb-0.5">
                <span className="font-bold text-white truncate">{character.name}</span>
                <span className="font-mono-tabular text-emerald-400 font-semibold shrink-0 ml-1">
                  {heroHp} HP
                </span>
              </div>
              <div className="h-1.5 sm:h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-emerald-400 transition-all duration-300"
                  style={{ width: `${heroHp}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-300 mt-0.5">
                <span className="flex items-center gap-1 truncate">
                  <Flame className="w-3 h-3 text-amber-400 shrink-0" />
                  Burst {burstEnergy}%
                </span>
                {combo >= 2 && (
                  <span className="font-bold text-amber-300 shrink-0">
                    ×{combo}
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={handleEatFood}
              disabled={foodCount <= 0 || heroHp >= 100}
              title="Makan Ayam Panggang Madu (+40 HP)"
              className="shrink-0 min-h-[36px] sm:min-h-[38px] flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-semibold border border-amber-400/35 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25 disabled:opacity-40 cursor-pointer"
            >
              <Utensils className="w-3.5 h-3.5" />
              <span>{foodCount}</span>
            </button>
          </div>

          {/* Enemy HP Bar */}
          <div className="flex items-center justify-between gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-[#101727]/92 border border-red-400/25 shadow-lg">
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between text-[11px] sm:text-xs mb-0.5">
                <span className="font-bold text-red-200 truncate">
                  Lv.{levelDef.level} {levelDef.enemyName}
                </span>
                <span className="font-mono-tabular text-red-300 font-semibold shrink-0 ml-1">
                  {qIndex + 1}/10
                </span>
              </div>
              <div className="h-1.5 sm:h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-red-500 to-orange-400 transition-all duration-300"
                  style={{ width: `${enemyHp}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-300 mt-0.5">
                <span className="truncate">{region.subjectName}</span>
                <span className="font-mono-tabular text-[#fde047] shrink-0 ml-1">
                  +{sessionPoints}
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                soundEngine.playClick();
                onRetreat();
              }}
              className="shrink-0 min-h-[36px] sm:min-h-[38px] px-2 sm:px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-semibold border border-white/15 bg-white/5 text-slate-200 hover:bg-white/15 cursor-pointer"
            >
              Mundur
            </button>
          </div>
        </div>
      </div>

      {/* BOTTOM ARENA PANEL: Adapts cleanly across Reading -> Combat Showcase -> Result */}
      <div className="fixed inset-x-0 bottom-2.5 sm:bottom-3 z-30 flex flex-col items-center px-2.5 sm:px-6 pointer-events-none">
        {/* PHASE 2: COMBAT SHOWCASE MODE (Question completely hidden so 3D clash is 100% clear!) */}
        {submitted && showcasingCombat && (
          <div className="pointer-events-auto w-full max-w-2xl rounded-2xl border border-[#d4af37]/60 bg-[#0e1526]/92 px-4 py-2.5 shadow-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <Swords
                className={`w-4 h-4 shrink-0 ${
                  isCorrect ? 'text-[#fde047]' : 'text-rose-400'
                }`}
              />
              <span
                className={`text-xs sm:text-sm font-bold truncate ${
                  isCorrect ? 'text-[#f7ecd0]' : 'text-rose-200'
                }`}
              >
                {combatActionBanner}
              </span>
            </div>
            <button
              onClick={() => {
                if (showcaseTimerRef.current !== null) {
                  window.clearTimeout(showcaseTimerRef.current);
                  showcaseTimerRef.current = null;
                }
                setShowcasingCombat(false);
              }}
              className="shrink-0 px-2.5 py-1 rounded-lg bg-white/10 text-[11px] font-semibold text-slate-200 hover:bg-white/20 cursor-pointer"
            >
              Pembahasan
            </button>
          </div>
        )}

        {/* PHASE 1 (PEEKING) OR PHASE 1 (ACTIVE QUESTION) OR PHASE 3 (POST-COMBAT COMPACT FEEDBACK) */}
        {(!submitted || (!showcasingCombat && submitted)) && (
          <>
            {/* If student toggled Peek Arena while reading a question */}
            {!submitted && peekingArena ? (
              <div className="pointer-events-auto">
                <button
                  onClick={() => {
                    soundEngine.playClick();
                    setPeekingArena(false);
                  }}
                  className="min-h-[44px] px-4 py-2 rounded-xl border border-[#d4af37]/60 bg-[#12192b]/95 text-xs sm:text-sm font-bold text-[#fde047] shadow-2xl flex items-center gap-2 cursor-pointer"
                >
                  <EyeOff className="w-4 h-4" />
                  <span>Tampilkan Soal ({qIndex + 1}/10)</span>
                </button>
              </div>
            ) : submitted && !showcasingCombat && !reviewQuestionOpen ? (
              /* PHASE 3: Compact Result & Explanation Bar at Bottom (Hero & Monster stay clearly visible above!) */
              <div
                className={`pointer-events-auto w-full max-w-4xl rounded-2xl border p-3.5 sm:p-4 shadow-2xl max-h-[38dvh] overflow-y-auto ${
                  isCorrect
                    ? 'bg-[#102026]/95 border-emerald-400/55'
                    : 'bg-[#21131e]/95 border-rose-400/55'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    {isCorrect ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0">
                      <div
                        className={`text-sm font-bold ${
                          isCorrect ? 'text-emerald-300' : 'text-rose-200'
                        }`}
                      >
                        {feedbackMsg}
                      </div>
                      <p className="text-xs sm:text-sm text-slate-200 mt-0.5 leading-relaxed">
                        {currentQ.explanation}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        soundEngine.playClick();
                        setReviewQuestionOpen(true);
                      }}
                      className="min-h-[44px] px-3 py-2 rounded-xl border border-white/15 bg-white/5 text-xs font-semibold text-slate-200 hover:bg-white/10 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Lihat Soal</span>
                    </button>
                    <button
                      onClick={handleNext}
                      className="min-h-[44px] flex-1 sm:flex-initial px-5 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-[#d4af37] to-[#f0c95c] text-[#111827] hover:brightness-105 cursor-pointer"
                    >
                      {qIndex + 1 >= questions.length ? 'Lihat Hasil' : 'Soal Berikutnya'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* PHASE 1 (Answering) OR PHASE 3 (Optional Question Review) */
              <div className="pointer-events-auto w-full max-w-4xl rounded-2xl border border-[#d4af37]/45 bg-[#12192b]/95 p-3.5 sm:p-5 shadow-2xl max-h-[68dvh] sm:max-h-[56dvh] overflow-y-auto">
                {/* Question Header Meta */}
                <div className="flex items-center justify-between gap-2 text-xs text-slate-300 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Swords className="w-3.5 h-3.5 text-[#e5b84b] shrink-0" />
                    <span className="font-semibold text-[#f7ecd0] truncate">
                      {region.subjectName}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="truncate">
                      {currentQ.type === 'multiple-choice' && 'Pilihan Ganda'}
                      {currentQ.type === 'true-false' && 'Benar atau Salah'}
                      {currentQ.type === 'matching' && 'Menjodohkan'}
                      {currentQ.type === 'fill-blank' && 'Lengkapi Kalimat'}
                      {currentQ.type === 'ordering' && 'Urutkan'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {burstEnergy >= 100 && !submitted && (
                      <span className="flex items-center gap-1 text-amber-300 font-bold">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Burst Siap!</span>
                      </span>
                    )}
                    {!submitted && (
                      <button
                        onClick={() => {
                          soundEngine.playClick();
                          setPeekingArena(true);
                        }}
                        className="px-2.5 py-1 rounded-lg border border-white/15 bg-white/5 text-[11px] font-semibold text-slate-200 hover:bg-white/15 flex items-center gap-1 cursor-pointer"
                        title="Sembunyikan soal sementara untuk melihat karakter & monster"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Intip Arena</span>
                      </button>
                    )}
                    {submitted && reviewQuestionOpen && (
                      <button
                        onClick={() => {
                          soundEngine.playClick();
                          setReviewQuestionOpen(false);
                        }}
                        className="px-2.5 py-1 rounded-lg border border-white/15 bg-white/5 text-[11px] font-semibold text-slate-200 hover:bg-white/15 cursor-pointer"
                      >
                        Kecilkan Soal
                      </button>
                    )}
                  </div>
                </div>

                {/* Prompt */}
                <p className="text-sm sm:text-base font-semibold text-white leading-snug mb-3">
                  {currentQ.prompt}
                </p>

                {/* 1. MULTIPLE CHOICE */}
                {currentQ.type === 'multiple-choice' && currentQ.options && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {currentQ.options.map((opt, idx) => {
                      const letters = ['A', 'B', 'C', 'D'];
                      const isSelected = selectedMc === idx;
                      const isRight = idx === currentQ.correctIndex;
                      let btnClass =
                        'bg-[#1b243b] border-white/15 text-slate-100 hover:border-[#d4af37]/60 hover:bg-[#232e4a]';
                      if (submitted) {
                        if (isRight) {
                          btnClass =
                            'bg-emerald-500/20 border-emerald-400 text-emerald-100';
                        } else if (isSelected) {
                          btnClass = 'bg-red-500/20 border-red-400 text-red-100';
                        } else {
                          btnClass = 'bg-[#161e31] border-white/5 text-slate-400';
                        }
                      }

                      return (
                        <button
                          key={idx}
                          disabled={submitted}
                          onClick={() => {
                            setSelectedMc(idx);
                            evaluateAnswer(idx === currentQ.correctIndex);
                          }}
                          className={`min-h-[44px] flex items-center gap-3 px-3.5 py-2.5 rounded-xl border text-left text-sm font-medium transition-colors cursor-pointer ${btnClass}`}
                        >
                          <span className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center text-xs font-bold shrink-0">
                            {letters[idx]}
                          </span>
                          <span className="leading-snug">{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* 2. TRUE / FALSE */}
                {currentQ.type === 'true-false' && (
                  <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                    {[
                      { label: 'BENAR', val: true },
                      { label: 'SALAH', val: false },
                    ].map((item) => {
                      const isRight = item.val === currentQ.correctBool;
                      const isChosen = selectedBool === item.val;
                      let cls =
                        'bg-[#1b243b] border-white/15 text-white hover:border-[#d4af37]/60';
                      if (submitted) {
                        if (isRight) cls = 'bg-emerald-500/20 border-emerald-400 text-emerald-100';
                        else if (isChosen) cls = 'bg-red-500/20 border-red-400 text-red-100';
                        else cls = 'bg-[#161e31] border-white/5 text-slate-400';
                      }
                      return (
                        <button
                          key={item.label}
                          disabled={submitted}
                          onClick={() => {
                            setSelectedBool(item.val);
                            evaluateAnswer(item.val === currentQ.correctBool);
                          }}
                          className={`min-h-[48px] py-3 px-4 rounded-xl border font-bold text-sm tracking-wide flex items-center justify-center gap-2 transition-colors cursor-pointer ${cls}`}
                        >
                          {item.val ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <ShieldAlert className="w-4 h-4 text-rose-400" />
                          )}
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* 3. FILL IN THE BLANK */}
                {currentQ.type === 'fill-blank' && currentQ.blankOptions && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {currentQ.blankOptions.map((chip) => {
                        const chosen = selectedBlank === chip;
                        const isRight =
                          chip.toLowerCase() === (currentQ.correctText || '').toLowerCase();
                        let cls =
                          'bg-[#1b243b] border-white/15 text-slate-100 hover:border-[#d4af37]';
                        if (submitted) {
                          if (isRight) cls = 'bg-emerald-500/25 border-emerald-400 text-emerald-100';
                          else if (chosen) cls = 'bg-red-500/25 border-red-400 text-red-100';
                        } else if (chosen) {
                          cls = 'bg-[#d4af37] border-[#f7ecd0] text-[#111827] font-bold';
                        }

                        return (
                          <button
                            key={chip}
                            disabled={submitted}
                            onClick={() => {
                              soundEngine.playClick();
                              setSelectedBlank(chip);
                            }}
                            className={`min-h-[44px] px-4 py-2 rounded-xl border text-sm font-medium transition-colors cursor-pointer ${cls}`}
                          >
                            {chip}
                          </button>
                        );
                      })}
                    </div>
                    {!submitted && (
                      <button
                        disabled={!selectedBlank}
                        onClick={() =>
                          evaluateAnswer(
                            selectedBlank.toLowerCase() ===
                              (currentQ.correctText || '').toLowerCase()
                          )
                        }
                        className="min-h-[44px] px-5 py-2.5 rounded-xl text-sm font-bold bg-[#d4af37] text-[#111827] disabled:opacity-40 cursor-pointer"
                      >
                        Kirim Jawaban
                      </button>
                    )}
                  </div>
                )}

                {/* 4. MATCHING */}
                {currentQ.type === 'matching' && currentQ.pairs && (
                  <div className="space-y-2.5">
                    <div className="text-xs text-slate-300">
                      Ketuk kotak di kiri lalu ketuk pasangannya yang cocok di kanan:
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      <div className="space-y-2">
                        {currentQ.pairs.map((p, idx) => {
                          const pairedRight = matchPairs[p.left];
                          const isActive = matchLeftSelected === p.left;
                          const pColor = pairColors[idx % pairColors.length];
                          return (
                            <button
                              key={p.left}
                              disabled={submitted}
                              onClick={() => handleMatchLeft(p.left)}
                              style={{
                                borderColor: isActive
                                  ? '#ffffff'
                                  : pairedRight
                                  ? pColor
                                  : 'rgba(255,255,255,0.15)',
                              }}
                              className={`min-h-[44px] w-full px-3 py-2 rounded-xl border-2 text-left text-xs sm:text-sm font-medium flex items-center justify-between gap-2 cursor-pointer ${
                                isActive ? 'bg-[#283556]' : 'bg-[#1a2236]'
                              }`}
                            >
                              <span>{p.left}</span>
                              {pairedRight && (
                                <span
                                  className="text-[11px] font-bold truncate max-w-[120px]"
                                  style={{ color: pColor }}
                                >
                                  → {pairedRight}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      <div className="space-y-2">
                        {shuffledRightOptions.map((rightItem) => {
                          const matchedIdx = currentQ.pairs!.findIndex(
                            (p) => matchPairs[p.left] === rightItem
                          );
                          const pColor =
                            matchedIdx >= 0
                              ? pairColors[matchedIdx % pairColors.length]
                              : 'rgba(255,255,255,0.15)';
                          return (
                            <button
                              key={rightItem}
                              disabled={submitted || !matchLeftSelected}
                              onClick={() => handleMatchRight(rightItem)}
                              style={{ borderColor: pColor }}
                              className="min-h-[44px] w-full px-3 py-2 rounded-xl border-2 bg-[#171e30] text-left text-xs sm:text-sm text-slate-100 hover:bg-[#232d47] disabled:opacity-75 cursor-pointer"
                            >
                              {rightItem}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {!submitted && (
                      <div className="flex items-center gap-2.5">
                        <button
                          onClick={() => {
                            soundEngine.playClick();
                            setMatchPairs({});
                            setMatchLeftSelected(null);
                          }}
                          className="min-h-[44px] px-3.5 py-2 rounded-xl border border-white/15 bg-white/5 text-xs font-semibold text-slate-200 flex items-center gap-1.5 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Ulangi
                        </button>
                        <button
                          disabled={
                            Object.keys(matchPairs).length < currentQ.pairs.length
                          }
                          onClick={() => {
                            const allOk = currentQ.pairs!.every(
                              (p) => matchPairs[p.left] === p.right
                            );
                            evaluateAnswer(allOk);
                          }}
                          className="min-h-[44px] px-5 py-2 rounded-xl text-sm font-bold bg-[#d4af37] text-[#111827] disabled:opacity-40 cursor-pointer"
                        >
                          Periksa Pasangan
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* 5. ORDERING */}
                {currentQ.type === 'ordering' && currentQ.orderItems && (
                  <div className="space-y-2.5">
                    <div className="space-y-1.5">
                      {orderDraft.map((item, idx) => (
                        <div
                          key={item}
                          className="min-h-[44px] flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-white/15 bg-[#1b243b]"
                        >
                          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-medium text-white">
                            <span className="w-5 h-5 rounded-md bg-[#d4af37]/20 text-[#fde047] flex items-center justify-center text-xs font-bold shrink-0">
                              {idx + 1}
                            </span>
                            <span>{item}</span>
                          </div>
                          {!submitted && (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => moveOrderItem(idx, -1)}
                                disabled={idx === 0}
                                className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 cursor-pointer"
                                aria-label="Naik"
                              >
                                <ArrowUp className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => moveOrderItem(idx, 1)}
                                disabled={idx === orderDraft.length - 1}
                                className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 cursor-pointer"
                                aria-label="Turun"
                              >
                                <ArrowDown className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    {!submitted && (
                      <button
                        onClick={() => {
                          const ok = currentQ.orderItems!.every(
                            (val, i) => orderDraft[i] === val
                          );
                          evaluateAnswer(ok);
                        }}
                        className="min-h-[44px] px-5 py-2 rounded-xl text-sm font-bold bg-[#d4af37] text-[#111827] cursor-pointer"
                      >
                        Periksa Urutan
                      </button>
                    )}
                  </div>
                )}

                {/* Explanation & Next Button when viewing full question in Phase 3 */}
                {submitted && reviewQuestionOpen && (
                  <div
                    className={`mt-3 p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isCorrect
                        ? 'bg-emerald-500/15 border-emerald-400/40'
                        : 'bg-rose-500/15 border-rose-400/40'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {isCorrect ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div
                          className={`text-sm font-bold ${
                            isCorrect ? 'text-emerald-300' : 'text-rose-200'
                          }`}
                        >
                          {feedbackMsg}
                        </div>
                        <p className="text-xs text-slate-200 mt-0.5 leading-relaxed">
                          {currentQ.explanation}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={handleNext}
                      className="min-h-[44px] shrink-0 px-5 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-[#d4af37] to-[#f0c95c] text-[#111827] hover:brightness-105 cursor-pointer"
                    >
                      {qIndex + 1 >= questions.length ? 'Lihat Hasil' : 'Soal Berikutnya'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
