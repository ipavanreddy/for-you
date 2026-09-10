'use client';

import { useEffect, useRef } from 'react';

/**
 * Saturated jewel tones, not glowing whites. On a pale pink sky, additive
 * blending washes everything out — these read as ink against the background.
 */
const COLORS = [
  '#C2185B', '#E01E5A', '#FF2D78', '#7B2FF7',
  '#5B2C8D', '#3E5CE8', '#0FA3A3', '#E8850C', '#D4A017',
];

/** Over the dark hearts photo the ink tones vanish; these glow instead. */
const COLORS_DARK = [
  '#FFE9A8', '#FFD46A', '#FFB3D1', '#FF8FB0',
  '#9CE7FF', '#C6A6FF', '#7BE0AD', '#FFFFFF',
];

const MAX_SPARKS = 13000;

const rand = (min, max) => min + Math.random() * (max - min);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];

/** Big-city New Year's fireworks. Transparent canvas so the fog layers over. */
export default function Fireworks({
  active,
  launching = true,
  rate = 900,
  boost = 1,
  onDark = false,
  className,
}) {
  const canvasRef = useRef(null);
  const rateRef = useRef(rate);
  const launchingRef = useRef(launching);
  const boostRef = useRef(boost);
  const darkRef = useRef(onDark);
  rateRef.current = rate;
  launchingRef.current = launching;
  boostRef.current = boost;
  darkRef.current = onDark;

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const reduced =
      typeof matchMedia !== 'undefined' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches;

    let w = 0;
    let h = 0;
    let raf = 0;
    let nextLaunch = 0;
    let scale = 1;
    let maxSparks = MAX_SPARKS;
    const rockets = [];
    const sparks = [];
    const flashes = [];

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Bursts are sized off the viewport so they stay huge on any screen.
      scale = Math.max(0.62, Math.min(w, h) / 900);
      // A phone can't push a laptop's particle count at 60fps.
      maxSparks = Math.round(MAX_SPARKS * Math.min(1, scale));
    }

    function launch(xHint) {
      const x = xHint ?? rand(w * 0.08, w * 0.92);
      rockets.push({
        x,
        y: h + 10,
        px: x,
        py: h + 10,
        vx: rand(-0.6, 0.6),
        vy: rand(-14, -11.5) * Math.sqrt(scale),
        color: pick(darkRef.current ? COLORS_DARK : COLORS),
        peak: rand(h * 0.12, h * 0.38),
      });
    }

    function addSpark(x, y, vx, vy, color, decay, width, crackle) {
      if (sparks.length >= maxSparks) return;
      sparks.push({ x, y, px: x, py: y, vx, vy, color, life: 1, decay, width, crackle });
    }

    function explode(r) {
      const kind = Math.random();
      const ring = kind < 0.3;
      const willow = !ring && kind < 0.55;

      // Drag is 0.976/frame, so a spark travels roughly v0 * 40px before it
      // dies. This puts a shell at ~280-400px across on a laptop screen —
      // big and overhead, without smearing past the edges.
      const power = rand(9.5, 14.5) * scale * boostRef.current;
      const density = Math.min(1, scale);
      const count = ring
        ? Math.round(180 * density)
        : Math.round((280 + Math.random() * 170) * density);
      const paint = darkRef.current ? COLORS_DARK : COLORS;
      const second = Math.random() < 0.6 ? pick(paint) : null;

      flashes.push({ x: r.x, y: r.y, life: 1, radius: power * 20 });

      for (let i = 0; i < count; i++) {
        const a = ring ? (i / count) * Math.PI * 2 : Math.random() * Math.PI * 2;
        // Cube root keeps a filled sphere from clumping in the middle.
        const speed = ring
          ? power * rand(0.94, 1.06)
          : power * Math.cbrt(Math.random());
        addSpark(
          r.x,
          r.y,
          Math.cos(a) * speed,
          Math.sin(a) * speed,
          second && i % 3 === 0 ? second : r.color,
          willow ? rand(0.0026, 0.0046) : rand(0.0045, 0.0085),
          rand(1.8, 3.6) * scale,
          !willow && Math.random() < 0.24
        );
      }

      // A second shell inside the first — that double-thump look.
      if (Math.random() < 0.6) {
        const inner = pick(paint);
        const p2 = power * 0.5;
        const n = Math.round(130 * density);
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          addSpark(r.x, r.y, Math.cos(a) * p2, Math.sin(a) * p2, inner,
            rand(0.007, 0.012), rand(1.4, 2.6) * scale, false);
        }
      }
    }

    function crackle(p) {
      const n = 4 + ((Math.random() * 3) | 0);
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = rand(0.7, 2.4) * scale;
        addSpark(p.x, p.y, p.vx * 0.3 + Math.cos(a) * sp, p.vy * 0.3 + Math.sin(a) * sp,
          p.color, rand(0.02, 0.04), rand(1.2, 2.2) * scale, false);
      }
    }

    /* Fixed-timestep accumulator. Motion used to be counted in frames, which
       ran the whole show at double speed on a 120Hz display and crawled in a
       throttled tab. Now one sub-step is always 1/60s of simulation. */
    const FIXED = 1000 / 60;
    const MAX_SUBSTEPS = 16;
    let acc = 0;
    let last = 0;
    let simTime = 0;
    const pending = [];   // volley shells waiting on sim time

    function simulate() {
      simTime += FIXED;

      while (pending.length && pending[0].at <= simTime) {
        launch(pending.shift().x);
      }

      if (!launchingRef.current) {
        // Celebration is over: let what's already in the air burn out.
        nextLaunch = simTime + 400;
        pending.length = 0;
      } else if (simTime > nextLaunch) {
        launch();
        // Volleys — several shells climbing together, like a finale.
        const volley = Math.random() < 0.68 ? 2 + ((Math.random() * 4) | 0) : 1;
        for (let i = 0; i < volley; i++) {
          pending.push({ at: simTime + 110 + i * rand(70, 190), x: null });
        }
        pending.sort((a, b) => a.at - b.at);
        nextLaunch = simTime + rateRef.current * rand(0.55, 1.4);
      }

      for (let i = flashes.length - 1; i >= 0; i--) {
        const fl = flashes[i];
        fl.life -= 0.055;
        if (fl.life <= 0) flashes.splice(i, 1);
      }

      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.px = r.x;
        r.py = r.y;
        r.x += r.vx;
        r.y += r.vy;
        r.vy += 0.19;

        if (r.vy >= -2.2 || r.y <= r.peak) {
          explode(r);
          rockets.splice(i, 1);
        }
      }

      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i];
        p.px = p.x;
        p.py = p.y;
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.976;
        p.vy = p.vy * 0.976 + 0.085;
        p.life -= p.decay;

        if (p.crackle && p.life < 0.4) {
          p.crackle = false;
          crackle(p);
        }

        if (p.life <= 0 || p.y > h + 60) sparks.splice(i, 1);
      }
    }

    function render() {
      ctx.clearRect(0, 0, w, h);
      ctx.lineCap = 'round';

      // Burst flash — a soft bloom of light at the moment of detonation.
      for (const fl of flashes) {
        const g = ctx.createRadialGradient(fl.x, fl.y, 0, fl.x, fl.y, fl.radius);
        g.addColorStop(0, `rgba(255,255,255,${0.2 * fl.life})`);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(fl.x, fl.y, fl.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const r of rockets) {
        ctx.strokeStyle = r.color;
        ctx.globalAlpha = 0.85;
        ctx.lineWidth = 3.2 * scale;
        ctx.beginPath();
        ctx.moveTo(r.px, r.py);
        ctx.lineTo(r.x, r.y);
        ctx.stroke();
      }

      for (const p of sparks) {
        const twinkle = p.life < 0.4 ? 0.35 + Math.random() * 0.65 : 1;
        ctx.globalAlpha = Math.min(1, p.life * 1.25) * twinkle;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(0.6, p.width * p.life);
        ctx.beginPath();
        ctx.moveTo(p.px, p.py);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
    }

    function frame() {
      raf = requestAnimationFrame(frame);
      // performance.now() rather than the rAF timestamp: in throttled contexts
      // the callback argument can stall while real time keeps moving, which
      // freezes the shells mid-flight.
      const now = performance.now();
      if (!last) last = now;
      acc += Math.min(now - last, FIXED * MAX_SUBSTEPS);
      last = now;
      while (acc >= FIXED) {
        simulate();
        acc -= FIXED;
      }
      render();
    }

    resize();
    window.addEventListener('resize', resize);

    if (reduced) {
      launch();
      raf = requestAnimationFrame(frame);
      const stop = setTimeout(() => cancelAnimationFrame(raf), 5000);
      return () => {
        clearTimeout(stop);
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', resize);
      };
    }

    // Open on a volley rather than a single shell.
    launch(w * 0.22);
    pending.push({ at: 140, x: w * 0.5 });
    pending.push({ at: 300, x: w * 0.78 });
    pending.push({ at: 470, x: w * 0.36 });
    pending.push({ at: 640, x: w * 0.66 });
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      ctx.clearRect(0, 0, w, h);
    };
  }, [active]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
