'use client';

import { useMemo } from 'react';
import s from './birthday.module.css';
import { makeRandom } from './rng';

const SPRINKLE_COLORS = ['#FF5C93', '#3FBFB6', '#FFC94D', '#B478F5', '#6FD79E', '#FF8A3D'];

function Sprinkles({ count, seed, width }) {
  const bits = useMemo(() => {
    const random = makeRandom(seed);
    return Array.from({ length: count }, () => ({
      left: 8 + random() * (width - 16),
      top: 10 + random() * 40,
      rotate: random() * 180,
      color: SPRINKLE_COLORS[(random() * SPRINKLE_COLORS.length) | 0],
    }));
  }, [count, seed, width]);

  return bits.map((b, i) => (
    <span
      key={i}
      className={s.sprinkle}
      style={{
        left: b.left,
        top: b.top,
        background: b.color,
        transform: `rotate(${b.rotate}deg)`,
      }}
    />
  ));
}

/** Three-tier cake with one candle. `flameOut` puts the flame out and lets smoke go. */
export default function Cake({ visible, flameOut, gusting }) {
  return (
    <div className={`${s.cakeWrap} ${visible ? s.cakeIn : ''}`}>
      <span className={`${s.cakeGlow} ${flameOut ? s.glowDim : ''}`} aria-hidden="true" />

      <div className={`${s.gust} ${gusting ? s.gustGo : ''}`} aria-hidden="true">
        {[18, 30, 42, 54, 66].map((top, i) => (
          <span
            key={top}
            className={s.gustLine}
            style={{
              top: `${top}%`,
              left: `${i * 4}%`,
              width: `${52 + i * 8}%`,
              animationDelay: `${i * 40}ms`,
            }}
          />
        ))}
      </div>

      <div className={s.cake}>
        <div className={`${s.tier} ${s.tier3}`}>
          <span className={s.icing} />
          <Sprinkles count={9} seed={101} width={172} />

          <span className={s.candle}>
            <span className={s.wick} />
            <span className={`${s.flame} ${flameOut ? s.flameOut : ''}`} aria-hidden="true" />
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={`${s.smoke} ${flameOut ? s.smokeGo : ''}`}
                style={{ animationDelay: `${i * 320}ms`, marginLeft: -6 + i * 3 }}
                aria-hidden="true"
              />
            ))}
          </span>
        </div>

        <div className={`${s.tier} ${s.tier2}`}>
          <span className={s.icing} />
          <Sprinkles count={13} seed={202} width={250} />
        </div>

        <div className={`${s.tier} ${s.tier1}`}>
          <span className={s.icing} />
          <Sprinkles count={17} seed={303} width={330} />
        </div>

        <div className={s.plate} />
        <div className={s.plateShadow} />
      </div>
    </div>
  );
}
