'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import s from './birthday.module.css';
import * as audio from './celebrationAudio';

/**
 * The written letter on its stationery, with the recording beside it.
 *
 * There is exactly one player: the <audio> element below. An earlier version
 * also decoded the file and played it through the Web Audio graph, so on a good
 * connection both started and the recording echoed against itself. The element
 * alone is the reliable path — it streams rather than waiting on a download,
 * and it seeks natively.
 *
 * Lines appear one at a time, paced by how far through the recording we are.
 */

/* Seconds the written letter runs ahead of the voice, so a line is on screen
   as it starts being spoken rather than after. */
const LEAD = 1.5;

export default function LetterCard({ gift, muted, onClose }) {
  const lines = gift.letter || [];
  const elRef = useRef(null);
  const textRef = useRef(null);
  const [shown, setShown] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [failed, setFailed] = useState(false);
  const [at, setAt] = useState(0);
  const [len, setLen] = useState(0);

  /* Where each line falls in the recording, as a fraction of the whole.
     Splitting the time evenly between lines put the short opening line on
     screen far too long and rushed the long ones; weighting by length tracks
     the speaking much more closely. */
  const marks = useMemo(() => {
    const sizes = lines.map((l) => l.length);
    const total = sizes.reduce((a, b) => a + b, 0) || 1;
    let run = 0;
    return sizes.map((n) => {
      const startsAt = run / total;
      run += n;
      return startsAt;
    });
  }, [lines]);

  const upTo = useCallback((fraction) => {
    let n = 1;
    for (let i = 0; i < marks.length; i++) if (marks[i] <= fraction) n = i + 1;
    return n;
  }, [marks]);

  // Only ever move forwards, so the clock and the recording can't fight.
  const advance = useCallback(
    (n) => setShown((prev) => Math.max(prev, Math.min(n, lines.length))),
    [lines.length]
  );

  // Everything the player tells us about itself, in one place.
  useEffect(() => {
    const el = elRef.current;
    if (!el) return;

    const onMeta = () => { if (Number.isFinite(el.duration)) setLen(el.duration); };
    const onTime = () => {
      setAt(el.currentTime);
      const total = Number.isFinite(el.duration) ? el.duration : 0;
      if (total) advance(upTo((el.currentTime + LEAD) / total));
    };
    const onPlay = () => { setPlaying(true); setBlocked(false); };
    const onPause = () => setPlaying(false);
    const onError = () => setFailed(true);

    el.addEventListener('loadedmetadata', onMeta);
    el.addEventListener('durationchange', onMeta);
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('play', onPlay);
    el.addEventListener('playing', onPlay);
    el.addEventListener('pause', onPause);
    el.addEventListener('ended', onPause);
    el.addEventListener('error', onError);
    onMeta();

    return () => {
      el.removeEventListener('loadedmetadata', onMeta);
      el.removeEventListener('durationchange', onMeta);
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('play', onPlay);
      el.removeEventListener('playing', onPlay);
      el.removeEventListener('pause', onPause);
      el.removeEventListener('ended', onPause);
      el.removeEventListener('error', onError);
    };
  }, [advance, upTo]);

  // Try to start on its own. Opening the gift was a tap, so this is usually
  // allowed; when it isn't, the button below is waiting.
  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    el.play().catch(() => setBlocked(true));
    return () => { el.pause(); };
  }, [gift.voice]);

  // The mute control in the corner governs the recording too.
  useEffect(() => {
    if (elRef.current) elRef.current.muted = muted;
  }, [muted]);

  // If the recording never gets going, the letter still reads itself out.
  useEffect(() => {
    if (playing) return undefined;
    const id = setInterval(() => advance(shown + 1), 6000);
    return () => clearInterval(id);
  }, [playing, shown, advance]);

  // Keep the newest revealed line in view. Scroll the letter box directly
  // rather than scrollIntoView, which also drags the ancestors around.
  useEffect(() => {
    const box = textRef.current;
    const el = box?.children[shown - 1];
    if (!box || !el) return;
    box.scrollTo({ top: Math.max(0, el.offsetTop + el.offsetHeight - box.clientHeight), behavior: 'smooth' });
  }, [shown]);

  const toggle = () => {
    const el = elRef.current;
    if (!el) return;
    // A tap is also the moment to revive a context the browser suspended.
    audio.resume();
    if (el.paused) el.play().catch(() => setBlocked(true));
    else el.pause();
  };

  const seek = (seconds) => {
    const el = elRef.current;
    if (!el) return;
    const target = Math.max(0, Math.min(seconds, len || 0));
    try { el.currentTime = target; } catch { /* not seekable yet */ }
    setAt(target);
  };

  const clock = (n) => `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, '0')}`;
  const status = failed
    ? 'The recording would not load'
    : muted
      ? 'Sound is off — turn it on, bottom right'
      : blocked
        ? 'Tap the button to start it'
        : `${playing ? 'Playing' : 'Paused'}  ${clock(at)} / ${clock(len)}`;

  return (
    <div className={s.letterCard}>
      <div className={s.letterPaper} style={{ backgroundImage: `url(${gift.letterPaper})` }}>
        <div className={s.letterText} ref={textRef}>
          {lines.map((line, i) => (
            <p key={i} className={`${s.letterLine} ${i < shown ? s.letterLineIn : ''}`}>
              {line}
            </p>
          ))}
        </div>
      </div>

      <div className={s.letterTrack}>
        <button type="button" className={s.letterSkip} onClick={() => seek(at - 10)} aria-label="Back 10 seconds">
          &#8249;&#8249; 10s
        </button>
        <input
          className={s.letterSeek}
          type="range"
          min={0}
          max={len || 0}
          step={0.1}
          value={Math.min(at, len || 0)}
          onChange={(e) => seek(Number(e.target.value))}
          aria-label="Position in the recording"
        />
        <button type="button" className={s.letterSkip} onClick={() => seek(at + 10)} aria-label="Forward 10 seconds">
          10s &#8250;&#8250;
        </button>
      </div>

      <div className={s.letterControls}>
        <button type="button" className={s.letterPlay} onClick={toggle}>
          {playing ? 'Pause' : 'Play the letter'}
        </button>
        <button type="button" className={s.letterDone} onClick={onClose}>Close</button>
      </div>

      <p className={s.letterStatus}>{status}</p>

      {/* The only player. No controls of its own — the buttons above drive it,
          so there is never a second copy running. */}
      <audio ref={elRef} className={s.letterAudio} preload="auto" playsInline>
        <source src={gift.voice} />
        {gift.voiceFallback && <source src={gift.voiceFallback} />}
      </audio>
    </div>
  );
}
