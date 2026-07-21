import { useEffect, useState, useRef } from 'react';

export default function AnimatedNumber({ value, decimals = 0, suffix = '' }) {
  const [display, setDisplay] = useState(0);
  const prevValue = useRef(0);

  useEffect(() => {
    if (value === null || value === undefined || value === '—') { setDisplay(null); return; }
    const target = Number(value);
    if (isNaN(target)) { setDisplay(value); return; }

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) { setDisplay(target); prevValue.current = target; return; }

    const start = prevValue.current;
    const startTime = performance.now();
    const duration = 700;

    function tick(now) {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(start + (target - start) * eased);
      if (progress < 1) requestAnimationFrame(tick);
      else prevValue.current = target;
    }
    requestAnimationFrame(tick);
  }, [value]);

  if (display === null) return <>—</>;
  return <>{Number(display).toFixed(decimals)}{suffix}</>;
}