'use client';

import { useCallback, useEffect, useState } from 'react';
import s from './birthday.module.css';

const KEYS = [
  ['1', ''], ['2', 'ABC'], ['3', 'DEF'],
  ['4', 'GHI'], ['5', 'JKL'], ['6', 'MNO'],
  ['7', 'PQRS'], ['8', 'TUV'], ['9', 'WXYZ'],
];

/** Phone lock screen. Correct passcode → `onUnlock()` after the open animation. */
export default function Lockscreen({ passcode, lockTime, hint, onUnlock }) {
  const [entry, setEntry] = useState('');
  const [wrong, setWrong] = useState(false);
  const [tries, setTries] = useState(0);
  const [opening, setOpening] = useState(false);
  const [date, setDate] = useState('');

  // The clock face is fixed, but the date is real — and the server has no idea
  // what day it is where you are, so it only fills in after mount.
  useEffect(() => {
    setDate(
      new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
    );
  }, []);

  const press = useCallback(
    (digit) => {
      if (opening) return;
      setWrong(false);
      setEntry((prev) => {
        if (prev.length >= passcode.length) return prev;
        const next = prev + digit;
        if (next.length === passcode.length) {
          if (next === passcode) {
            setOpening(true);
            setTimeout(onUnlock, 820);
          } else {
            setTimeout(() => {
              setWrong(true);
              setTries((t) => t + 1);
              setEntry('');
            }, 160);
          }
        }
        return next;
      });
    },
    [opening, passcode, onUnlock]
  );

  const back = useCallback(() => setEntry((p) => p.slice(0, -1)), []);

  useEffect(() => {
    const onKey = (e) => {
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') back();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [press, back]);

  const time = lockTime;

  return (
    <div className={`${s.phone} ${opening ? s.phoneOpening : ''}`}>
      <div className={`${s.screen} ${wrong ? s.wrong : ''} ${opening ? s.unlocking : ''}`}>
        <div className={s.scanLine} />
        <div className={s.notch} />

        <div className={s.statusBar}>
          <span>{time || ' '}</span>
          <span className={s.statusIcons}>
            <span className={s.bar} style={{ height: 5 }} />
            <span className={s.bar} style={{ height: 8 }} />
            <span className={s.bar} style={{ height: 11 }} />
            <span className={s.battery}><span className={s.batteryFill} /></span>
          </span>
        </div>

        <div className={s.clock}>{time || ' '}</div>
        <div className={s.clockDate}>{date || ' '}</div>

        <svg className={s.lockIcon} width="22" height="26" viewBox="0 0 22 26" fill="none" aria-hidden="true">
          <rect x="1.5" y="10.5" width="19" height="14" rx="4" stroke="currentColor" strokeWidth="1.6" />
          <path d="M6 10.5V7a5 5 0 0 1 10 0v3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="11" cy="17" r="1.8" fill="currentColor" />
        </svg>

        <p className={s.prompt}>Enter Passcode</p>

        <div className={s.dots} role="status" aria-label={`${entry.length} of ${passcode.length} digits entered`}>
          {Array.from({ length: passcode.length }, (_, i) => (
            <span key={i} className={`${s.dot} ${i < entry.length ? s.dotFilled : ''}`} />
          ))}
        </div>

        <p className={`${s.hint} ${tries > 0 ? s.hintShown : ''}`}>
          {tries > 0 ? hint : ' '}
        </p>

        <div className={s.keypad}>
          {KEYS.map(([num, letters]) => (
            <button key={num} type="button" className={s.key} onClick={() => press(num)} aria-label={num}>
              <span className={s.keyNum}>{num}</span>
              <span className={s.keyLetters}>{letters || ' '}</span>
            </button>
          ))}
          <span className={`${s.key} ${s.keyGhost}`} aria-hidden="true" />
          <button type="button" className={s.key} onClick={() => press('0')} aria-label="0">
            <span className={s.keyNum}>0</span>
            <span className={s.keyLetters}>{' '}</span>
          </button>
          <button type="button" className={`${s.key} ${s.keyText}`} onClick={back} aria-label="Delete">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
