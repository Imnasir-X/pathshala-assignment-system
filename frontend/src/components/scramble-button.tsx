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

import { useEffect, useRef, useState, type CSSProperties } from 'react';

const SCRAMBLE_CHARS = '!@#$%^&*():{};|,.<>/?';
const SCRAMBLE_CYCLES = 4;
const STEP_MS = 16;

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
  const [text, setText] = useState(label);
  const [active, setActive] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const rafRef = useRef<number | null>(null);
  const configRef = useRef({ label, loading });
  configRef.current = { label, loading };

  // Respect prefers-reduced-motion: no scramble, no sweep.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Cancel any running scramble and reset the label (used on leave/blur and
  // whenever `loading` or `label` changes, e.g. click during scramble).
  const stopScramble = () => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    setText(configRef.current.label);
  };

  const startScramble = () => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    const target = configRef.current.label;
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
        setText(scrambled);
        step++;
        if (step >= total) {
          rafRef.current = null;
          setText(target);
          return;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const activate = () => {
    setActive(true);
    if (configRef.current.loading || reducedMotion) return;
    startScramble();
  };

  const deactivate = () => {
    setActive(false);
    stopScramble();
  };

  useEffect(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    setText(loading ? loadingLabel : label);
  }, [loading, label, loadingLabel]);

  const displayLabel = loading ? loadingLabel : label;
  const showScramble = !loading && text !== label;

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
          {showScramble ? text : displayLabel}
        </span>
      </span>
    </button>
  );
}
