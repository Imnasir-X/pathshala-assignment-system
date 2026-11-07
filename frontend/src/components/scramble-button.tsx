'use client';

/**
 * ScrambleButton — hover/focus text-scramble submit button.
 *
 * On hover or keyboard focus the label is overwritten with junk characters,
 * then "decrypts" back into itself letter-by-letter, left to right, while a
 * band of light sweeps up behind the text.
 *
 * Zero-dependency: the scramble is a requestAnimationFrame loop over the
 * label's characters; the sweep is a pure CSS keyframe animation. The real
 * label is laid out invisibly underneath so the button never changes width
 * while the overlay text scrambles.
 *
 * Accessibility: renders a real <button> (native submit + keyboard focus),
 * exposes a stable accessible name (screen readers never hear the scramble),
 * and disables the effect under prefers-reduced-motion.
 */

import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react';

const SCRAMBLE_CHARS = '!@#$%^&*():{};|,.<>/?';
const SCRAMBLE_CYCLES = 4;
const STEP_MS = 16;
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

// Respect prefers-reduced-motion: no scramble, no sweep.
function subscribeReducedMotion(onChange: () => void): () => void {
  const mq = window.matchMedia(REDUCED_MOTION_QUERY);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}

function getReducedMotion(): boolean {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

interface ScrambleButtonProps {
  /** Idle label, e.g. "Sign in". */
  label: string;
  /** Label shown while `loading` is true. */
  loadingLabel?: string;
  loading?: boolean;
  type?: 'submit' | 'button';
  className?: string;
  /** Color of the light sweep band. */
  sweepColor?: string;
  style?: CSSProperties;
}

export default function ScrambleButton({
  label,
  loadingLabel = 'Please wait…',
  loading = false,
  type = 'submit',
  className,
  sweepColor = '#99f6e4',
  style,
}: ScrambleButtonProps) {
  const [scramble, setScramble] = useState<{ label: string; text: string } | null>(null);
  const [active, setActive] = useState(false);
  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, getReducedMotion, () => false);
  const rafRef = useRef<number | null>(null);

  const cancelFrame = () => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  };

  // Cancel any running scramble and show the real label again (used on
  // leave/blur).
  const stopScramble = () => {
    cancelFrame();
    setScramble(null);
  };

  const startScramble = () => {
    cancelFrame();
    const target = label;
    const letters = [...target];
    const total = letters.length * SCRAMBLE_CYCLES;
    let step = 0;
    let last = 0;

    const tick = (now: number) => {
      if (!last) last = now;
      if (now - last >= STEP_MS) {
        last = now;
        const scrambled = letters
          .map((char, index) => {
            if (step / SCRAMBLE_CYCLES > index) return char;
            if (!char.trim()) return char;
            return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
          })
          .join('');
        setScramble({ label: target, text: scrambled });
        step++;
        if (step >= total) {
          rafRef.current = null;
          setScramble(null);
          return;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const activate = () => {
    setActive(true);
    if (loading || reducedMotion) return;
    startScramble();
  };

  const deactivate = () => {
    setActive(false);
    stopScramble();
  };

  // A change of label or loading state (e.g. a click during the scramble)
  // stops the animation; stale scramble text is ignored below because it is
  // tagged with the label it was generated for.
  useEffect(() => cancelFrame, [loading, label, loadingLabel]);

  const displayLabel = loading ? loadingLabel : label;
  const showScramble = !loading && scramble !== null && scramble.label === label && scramble.text !== label;
  const text = showScramble ? scramble.text : displayLabel;

  return (
    <button
      type={type}
      disabled={loading}
      aria-label={displayLabel}
      onMouseEnter={activate}
      onMouseLeave={deactivate}
      onFocus={activate}
      onBlur={deactivate}
      className={className}
      style={{ position: 'relative', overflow: 'hidden', ...style }}
    >
      {active && !loading && !reducedMotion && (
        <span
          aria-hidden
          className="scramble-sweep"
          style={{
            background: `linear-gradient(to bottom, transparent 36%, ${sweepColor} 50%, transparent 64%)`,
          }}
        />
      )}
      {/* aria-hidden: the accessible name comes from aria-label above, so
          screen readers never hear the scrambling characters. */}
      <span aria-hidden className="relative inline-flex items-center justify-center">
        <span className="invisible">{displayLabel}</span>
        <span className="absolute inset-0 flex items-center justify-center">
          {text}
        </span>
      </span>
    </button>
  );
}
