import { useState } from 'react';
import { Check, Feather, ShoppingBag, Sparkles, Sword, Utensils, X } from 'lucide-react';
import { SHOP_ITEMS } from '../data/characters';
import { PlayerProgress, ShopItem } from '../types/game';
import { soundEngine } from '../utils/audio';

interface ShopAndInventoryModalProps {
  progress: PlayerProgress;
  onBuyOrEquip: (item: ShopItem) => void;
  onClose: () => void;
}

export function ShopAndInventoryModal({
  progress,
  onBuyOrEquip,
  onClose,
}: ShopAndInventoryModalProps) {
  const [tab, setTab] = useState<'all' | 'weapon' | 'wings' | 'food'>('all');

  const items = SHOP_ITEMS.filter((it) => tab === 'all' || it.category === tab);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#090d16]/90 p-2.5 sm:p-4">
      <div className="w-full max-w-4xl rounded-2xl border border-[#d4af37]/40 bg-[#121828] shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 bg-[#0e1422] border-b border-white/10">
          <div className="flex items-center gap-2.5 min-w-0">
            <ShoppingBag className="w-5 h-5 text-[#e5b84b] shrink-0" />
            <div className="min-w-0">
              <h2 className="font-display text-base sm:text-lg font-bold text-[#f7ecd0] truncate">
                Toko Hadiah &amp; Perlengkapan 3D
              </h2>
              <p className="hidden sm:block text-xs text-slate-300 truncate">
                Tukarkan Poin Petualang untuk membuka senjata 3D, sayap, dan bekal bertarung
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-xs sm:text-sm font-mono-tabular font-bold text-[#fde047]">
              {progress.points} Poin
            </div>
            <button
              onClick={() => {
                soundEngine.playClick();
                onClose();
              }}
              className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg border border-white/15 bg-white/5 text-slate-200 hover:bg-white/15 cursor-pointer"
              aria-label="Tutup Toko"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="px-4 sm:px-6 py-2.5 border-b border-white/10 flex items-center gap-2 bg-[#141c2f] overflow-x-auto shrink-0">
          {[
            { id: 'all', label: 'Semua Item' },
            { id: 'weapon', label: 'Senjata 3D' },
            { id: 'wings', label: 'Sayap Glider 3D' },
            { id: 'food', label: 'Bekal Pemulih HP' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => {
                soundEngine.playClick();
                setTab(t.id as typeof tab);
              }}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                tab === t.id
                  ? 'bg-[#d4af37] text-[#111827]'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Item Grid */}
        <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 overflow-y-auto">
          {items.map((item) => {
            const isFood = item.category === 'food';
            const isOwned = !isFood && progress.unlockedItems.includes(item.id);
            const isEquipped =
              (item.category === 'weapon' && progress.equippedWeaponId === item.id) ||
              (item.category === 'wings' && progress.equippedWingsId === item.id);
            const canAfford = progress.points >= item.price;

            return (
              <div
                key={item.id}
                className={`p-3.5 sm:p-4 rounded-xl border flex flex-col justify-between gap-3 ${
                  isEquipped
                    ? 'bg-[#1d2740] border-[#d4af37]'
                    : 'bg-[#171f33] border-white/10'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border border-white/15"
                    style={{ backgroundColor: `${item.colorHex}22`, color: item.colorHex }}
                  >
                    {item.category === 'weapon' && <Sword className="w-5 h-5" />}
                    {item.category === 'wings' && <Feather className="w-5 h-5" />}
                    {item.category === 'food' && <Utensils className="w-5 h-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-white truncate">
                        {item.name}
                      </h3>
                      <span className="text-xs font-semibold text-emerald-300 whitespace-nowrap shrink-0">
                        {item.bonusLabel}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <div className="text-xs font-mono-tabular text-slate-300">
                    {isFood
                      ? `Dimiliki: ${progress.foodCount} buah`
                      : isOwned
                      ? 'Sudah dimiliki'
                      : `Harga: ${item.price} Poin`}
                  </div>

                  {isEquipped ? (
                    <span className="min-h-[38px] inline-flex items-center gap-1 text-xs font-bold text-[#fde047]">
                      <Check className="w-3.5 h-3.5" />
                      Dipakai
                    </span>
                  ) : isOwned ? (
                    <button
                      onClick={() => {
                        soundEngine.playEquip();
                        onBuyOrEquip(item);
                      }}
                      className="min-h-[40px] px-4 py-1.5 rounded-lg text-xs font-bold bg-sky-500 text-slate-950 hover:bg-sky-400 cursor-pointer"
                    >
                      Pasang
                    </button>
                  ) : (
                    <button
                      disabled={!canAfford}
                      onClick={() => {
                        soundEngine.playPurchase();
                        onBuyOrEquip(item);
                      }}
                      className="min-h-[40px] px-4 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-[#d4af37] to-[#f0c95c] text-[#111827] hover:brightness-105 disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Beli ({item.price})</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
