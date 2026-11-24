import { useEffect, useRef, useState } from "react";

/** Smoothly animates a number toward `value` (ease-out). */
export function useTween(value: number, duration = 450): number {
  const [display, setDisplay] = useState(value);
  const from = useRef(value);
  const displayRef = useRef(value);

  useEffect(() => {
    from.current = displayRef.current;
    const start = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = from.current + (value - from.current) * eased;
      displayRef.current = v;
      setDisplay(v);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return display;
}
