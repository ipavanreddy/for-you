'use client';

import { useMemo } from 'react';
import s from './birthday.module.css';

/**
 * One cut-out on the semicircle around the cake. The whole thing is the
 * button — picture and caption alike — so a tap anywhere on him opens the
 * gift. `angle` places it: 150° up-left, 90° above the cake, 30° up-right.
 */
export default function GiftSlot({ gift, index, angle, taken, onOpen }) {
  const slot = useMemo(() => {
    const rad = (angle * Math.PI) / 180;
    const cos = Math.cos(rad).toFixed(4);
    const sin = Math.sin(rad).toFixed(4);
    return {
      '--i': String(index),
      // Offset from the middle of the cake. Screen Y grows downward, so the
      // sine is negated to send 90° upward.
      '--ax': `calc(var(--arc-rx) * ${cos})`,
      '--ay': `calc(var(--arc-ry) * ${-sin})`,
    };
  }, [angle, index]);

  return (
    <div className={s.giftSlot} style={slot}>
      <span className={s.giftFloat} style={{ '--i': String(index) }}>
        <button
          type="button"
          className={`${s.giftBtn} ${taken ? s.giftTaken : ''}`}
          onClick={() => onOpen(index)}
          aria-label={taken ? `${gift.name} — already opened` : `${gift.name}, click here`}
        >
          <span className={s.giftPic}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={s.giftImg} src={gift.image} alt="" />
          </span>
          <span className={s.giftName}>{gift.name}</span>
        </button>
      </span>
    </div>
  );
}
