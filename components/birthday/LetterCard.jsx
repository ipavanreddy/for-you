'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import s from './birthday.module.css';
import * as audio from './celebrationAudio';

/**
 * The written letter on its stationery, with the recording beside it.
 *
 * The recording is decoded and played through the same audio graph as the
 * birthday tune. An <audio> element goes out by a separate route which was
 * producing no sound at all here, so it is only used as a fallback when there
 * is no audio context (the ?stage= previews, which never take a tap).
 *
 * Lines appear one at a time, paced by how far through the recording we are.
 */
/* Seconds the written letter runs ahead of the voice, so a line is on screen
   as it starts being spoken rather than after. */
const LEAD = 1.5;

export default function LetterCard({ gift, muted, onClose }) {
  const lines = gift.letter || [];
  const audioRef = useRef(null);
  const textRef = useRef(null);
  const [shown, setShown] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [viaGraph, setViaGraph] = useState(false);
  const [routed, setRouted] = useState(false);
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

  useEffect(() => {
    let dead = false;

    (async () => {
      const duration = await audio.loadVoice(gift.voice).catch(() => null);
      if (dead) return;

      if (duration) {
        setViaGraph(true);
        setLen(duration);
        setPlaying(audio.playVoice(muted ? 0 : 1.5));
        return;
      }

      // Buffer route unavailable. Use the element, but send its output through
      // the same graph where possible, since plain element audio can be silent.
      const el = audioRef.current;
      if (!el) return;
      el.muted = muted;
      setRouted(audio.routeElement(el, 1.5));
      el.play().then(() => setPlaying(true)).catch(() => setBlocked(true));
    })();

    return () => {
      dead = true;
      audio.stopVoice();
    };
  }, [gift.voice, muted]);

  // One clock drives the progress read-out and the reveal.
  useEffect(() => {
    const started = Date.now();
    const id = setInterval(() => {
      const el = audioRef.current;
      const v = viaGraph ? audio.voiceTime() : null;
      const now = v?.ready ? v.at : el ? el.currentTime : 0;
      const total = v?.ready ? v.len : el?.duration || 0;
      const running = v?.ready ? v.playing : !!el && !el.paused;

      setAt(now);
      if (total) setLen(total);
      setPlaying(running);

      if (running && total) advance(upTo((now + LEAD) / total));
      // If it never starts, the letter still reads itself out.
      else if (!running) advance(Math.ceil((Date.now() - started) / 6000) + 1);
    }, 500);
    return () => clearInterval(id);
  }, [advance, upTo, lines.length, viaGraph]);

  // Keep the newest revealed line in view. Scroll the letter box directly
  // rather than scrollIntoView, which also drags the ancestors around.
  useEffect(() => {
    const box = textRef.current;
    const el = box?.children[shown - 1];
    if (!box || !el) return;
    box.scrollTo({ top: Math.max(0, el.offsetTop + el.offsetHeight - box.clientHeight), behavior: 'smooth' });
  }, [shown]);

  const toggle = () => {
    if (viaGraph) {
      if (playing) {
        audio.pauseVoice();
        setPlaying(false);
      } else {
        setPlaying(audio.playVoice(muted ? 0 : 1.5));
        setBlocked(false);
      }
      return;
    }
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) el.play().then(() => { setPlaying(true); setBlocked(false); }).catch(() => setBlocked(true));
    else { el.pause(); setPlaying(false); }
  };

  const seek = (seconds) => {
    const target = Math.max(0, Math.min(seconds, len || 0));
    if (viaGraph) audio.seekVoice(target);
    else if (audioRef.current) audioRef.current.currentTime = target;
    setAt(target);
  };

  const clock = (n) => `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, '0')}`;
  const status = muted
    ? 'Sound is off — turn it on, bottom right'
    : playing
      ? `Playing  ${clock(at)} / ${clock(len)}`
      : blocked
        ? 'Tap the button to start it'
        : `Paused  ${clock(at)} / ${clock(len)}`;
  const route = viaGraph ? 'A' : routed ? 'B' : 'C';

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

      <p className={s.letterStatus}>{status} · {route}</p>

      {/* Always present: it is the fallback player, and lets the recording be
          scrubbed. Hidden only when the buffer route is doing the playing. */}
      <audio
        ref={audioRef}
        className={s.letterAudio}
        style={viaGraph ? { display: 'none' } : undefined}
        src={gift.voice}
        controls
        preload="auto"
      />
    </div>
  );
}
