'use client';

import { useMemo } from 'react';
import s from './birthday.module.css';
import { makeRandom } from './rng';

const TINTS = ['red', 'pink', 'yellow', 'green', 'purple'];
const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';

/* A jittered grid, rather than scattered positions. Pure random placement
   leaves bald patches and lets one colour bunch up in a corner; a cell each,
   nudged off-centre, covers the screen evenly. */
const COLS = 16;
const ROWS = 13;

/** Even colours, then shuffled — so counts stay equal without banding. */
function shuffledTints(count, random) {
  const out = Array.from({ length: count }, (_, i) => TINTS[i % TINTS.length]);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export default function FlowerBurst({ seed = 1, drifters = 60 }) {
  const petals = useMemo(() => {
    const random = makeRandom(9000 + seed * 71);
    const cells = COLS * ROWS;
    const tints = shuffledTints(cells + drifters, random);
    const list = [];

    const petal = (i, left, top, settle) => ({
      tint: tints[i],
      settle,
      // Generous overlap between neighbours, so no gaps show through.
      size: `${(13 + random() * 10).toFixed(1)}vmin`,
      left: `${left.toFixed(2)}%`,
      top: `${top.toFixed(2)}%`,
      r0: `${(random() * 240 - 120).toFixed(0)}deg`,
      r1: `${(random() * 70 - 35).toFixed(0)}deg`,
      r2: `${(random() * 120 - 60).toFixed(0)}deg`,
      delay: `${(random() * 520).toFixed(0)}ms`,
      duration: `${(2900 + random() * 500).toFixed(0)}ms`,
      blur: random() < 0.12 ? `${(1 + random() * 2).toFixed(1)}px` : undefined,
    });

    // The bed that stays and hides the background.
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const i = r * COLS + c;
        const left = ((c + 0.5 + (random() - 0.5) * 0.85) / COLS) * 100;
        const top = ((r + 0.5 + (random() - 0.5) * 0.85) / ROWS) * 100;
        list.push(petal(i, left, top, true));
      }
    }

    // A handful that sweep past and fall away, for the pouring motion.
    for (let i = 0; i < drifters; i++) {
      list.push(petal(cells + i, random() * 100, random() * 96, false));
    }

    return list;
  }, [seed, drifters]);

  return (
    <div className={s.flowerLayer} aria-hidden="true">
      {petals.map((p, i) => (
        <img
          key={i}
          className={`${s.petal} ${p.settle ? s.petalStay : ''}`}
          src={`${BASE}/birthday/flowers/flower-${p.tint}.png`}
          alt=""
          style={{
            width: p.size,
            left: p.left,
            top: p.top,
            filter: p.blur ? `blur(${p.blur})` : undefined,
            animationDelay: p.delay,
            animationDuration: p.duration,
            '--r0': p.r0,
            '--r1': p.r1,
            '--r2': p.r2,
          }}
        />
      ))}
    </div>
  );
}
