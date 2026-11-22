import { useRef, useState } from 'react';
import { ArrowUp, Wind } from 'lucide-react';
import { soundEngine } from '../utils/audio';

export interface VirtualPadState {
  x: number;
  y: number;
  jump: boolean;
  dash: boolean;
}

interface MobileTouchControlsProps {
  onChange: (updater: (prev: VirtualPadState) => VirtualPadState) => void;
}

export function MobileTouchControls({ onChange }: MobileTouchControlsProps) {
  const baseRef = useRef<HTMLDivElement>(null);
  const activePointerId = useRef<number | null>(null);
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 });
  const [isSprinting, setIsSprinting] = useState(false);

  const maxRadius = 40;

  const updateStickFromPointer = (clientX: number, clientY: number) => {
    const el = baseRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxRadius) {
      dx = (dx / dist) * maxRadius;
      dy = (dy / dist) * maxRadius;
    }
    setKnobOffset({ x: dx, y: dy });
    const normX = Math.abs(dx) < 5 ? 0 : dx / maxRadius;
    const normY = Math.abs(dy) < 5 ? 0 : dy / maxRadius;
    onChange((prev) => ({
      ...prev,
      x: normX,
      y: normY,
    }));
  };

  const resetStick = () => {
    activePointerId.current = null;
    setKnobOffset({ x: 0, y: 0 });
    onChange((prev) => ({ ...prev, x: 0, y: 0 }));
  };

  return (
    <>
      {/* Left 360° Virtual Analog Stick */}
      <div className="fixed bottom-20 sm:bottom-24 left-4 z-20 select-none touch-none-canvas">
        <div
          ref={baseRef}
          onPointerDown={(e) => {
            e.stopPropagation();
            if (activePointerId.current !== null) return;
            activePointerId.current = e.pointerId;
            try {
              e.currentTarget.setPointerCapture(e.pointerId);
            } catch {
              // Ignore capture failure
            }
            updateStickFromPointer(e.clientX, e.clientY);
          }}
          onPointerMove={(e) => {
            if (e.pointerId !== activePointerId.current) return;
            e.stopPropagation();
            updateStickFromPointer(e.clientX, e.clientY);
          }}
          onPointerUp={(e) => {
            if (e.pointerId !== activePointerId.current) return;
            e.stopPropagation();
            resetStick();
          }}
          onPointerCancel={(e) => {
            if (e.pointerId !== activePointerId.current) return;
            resetStick();
          }}
          className="relative w-28 h-28 rounded-full border-2 border-[#d4af37]/50 bg-[#0e1526]/75 shadow-xl flex items-center justify-center touch-none-canvas"
          aria-label="Analog Gerak 360 Derajat"
        >
          {/* Directional guide ticks */}
          <div className="w-16 h-16 rounded-full border border-white/10 pointer-events-none" />
          {/* Movable Thumb Knob */}
          <div
            className="absolute w-12 h-12 rounded-full bg-gradient-to-br from-[#f7ecd0] to-[#d4af37] border-2 border-white shadow-lg pointer-events-none transition-transform duration-75"
            style={{
              transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)`,
            }}
          />
        </div>
      </div>

      {/* Right Action Cluster: Sprint & Jump (48px+ hit targets) */}
      <div className="fixed bottom-20 sm:bottom-24 right-4 z-20 flex items-end gap-3 select-none touch-none-canvas">
        <button
          type="button"
          onPointerDown={(e) => {
            e.stopPropagation();
            setIsSprinting(true);
            soundEngine.playDash();
            onChange((prev) => ({ ...prev, dash: true }));
          }}
          onPointerUp={(e) => {
            e.stopPropagation();
            setIsSprinting(false);
            onChange((prev) => ({ ...prev, dash: false }));
          }}
          onPointerCancel={() => {
            setIsSprinting(false);
            onChange((prev) => ({ ...prev, dash: false }));
          }}
          onPointerLeave={() => {
            if (isSprinting) {
              setIsSprinting(false);
              onChange((prev) => ({ ...prev, dash: false }));
            }
          }}
          className={`w-13 h-13 rounded-full border-2 flex flex-col items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer ${
            isSprinting
              ? 'bg-[#d4af37] border-white text-[#111827]'
              : 'bg-[#101727]/85 border-amber-300/45 text-amber-200'
          }`}
          aria-label="Lari Cepat"
        >
          <Wind className="w-5 h-5" />
          <span className="text-[10px] font-bold leading-none mt-0.5">Lari</span>
        </button>

        <button
          type="button"
          onPointerDown={(e) => {
            e.stopPropagation();
            onChange((prev) => ({ ...prev, jump: true }));
          }}
          onPointerUp={(e) => {
            e.stopPropagation();
            onChange((prev) => ({ ...prev, jump: false }));
          }}
          onPointerCancel={() => {
            onChange((prev) => ({ ...prev, jump: false }));
          }}
          className="w-14 h-14 rounded-full border-2 border-sky-300/60 bg-sky-500/35 active:bg-sky-400 active:text-slate-950 text-white flex flex-col items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer"
          aria-label="Lompat"
        >
          <ArrowUp className="w-5 h-5" />
          <span className="text-[10px] font-bold leading-none mt-0.5">Lompat</span>
        </button>
      </div>
    </>
  );
}
