'use client';

/**
 * Sound for the page: a music-box birthday tune during the celebration, and
 * a clip of a song behind the collage.
 *
 * Browsers refuse to start audio without a user gesture, so `start()` must be
 * called from the tap that begins the show.
 */

let ctx = null;
let master = null;
let music = null;
let muted = false;
let melodyNodes = [];
let loopTimer = null;
let clip = null;
let clipTimer = null;

/**
 * On an iPhone the ring/silent switch mutes anything a page plays, unless the
 * page says it is playing media rather than making incidental noises. Safari
 * 16.4 and later expose this; everywhere else it is simply absent.
 */
function claimPlayback() {
  try {
    if (typeof navigator !== 'undefined' && navigator.audioSession) {
      navigator.audioSession.type = 'playback';
    }
  } catch { /* older Safari, or the property is read-only */ }
}

function ensure() {
  claimPlayback();
  if (ctx) return ctx;
  const AudioCtx = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  if (!AudioCtx) return null;

  ctx = new AudioCtx();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 0.55;
  master.connect(ctx.destination);

  return ctx;
}

/** Call from a click/tap. `trackSrc` is optional background music. */
export function start(trackSrc) {
  const c = ensure();
  if (!c) return;
  if (c.state === 'suspended') c.resume();

  if (trackSrc && !music) {
    music = new Audio(trackSrc);
    music.loop = true;
    music.volume = muted ? 0 : 0.34;
    music.play().catch(() => {});
  }
}

/** Nudges a context the browser suspended. Safe to call from any tap. */
export function resume() {
  claimPlayback();
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
}

export function setMuted(next) {
  muted = next;
  if (master && ctx) master.gain.setTargetAtTime(muted ? 0 : 0.55, ctx.currentTime, 0.02);
  if (music) music.volume = muted ? 0 : 0.34;
  if (clip) clip.volume = muted ? 0 : 0.62;
}

export function stop() {
  stopMelody();
  stopClip();
  if (music) {
    music.pause();
    music = null;
  }
  if (ctx) {
    ctx.close().catch(() => {});
    ctx = null;
    master = null;
  }
}


/* ── The birthday tune ─────────────────────────────────────────────────────
   "Happy Birthday to You" — public domain since the 2016 ruling. Written out
   as [frequency, beats] in C major, starting on G4.
   ──────────────────────────────────────────────────────────────────────── */
const C4 = 261.63, D4 = 293.66, E4 = 329.63, F4 = 349.23, G4 = 392.0, A4 = 440.0, B4 = 493.88;
const C5 = 523.25, D5 = 587.33, E5 = 659.25, F5 = 698.46, G5 = 783.99;

const TUNE = [
  [G4, 0.75], [G4, 0.25], [A4, 1], [G4, 1], [C5, 1], [B4, 2],
  [G4, 0.75], [G4, 0.25], [A4, 1], [G4, 1], [D5, 1], [C5, 2],
  [G4, 0.75], [G4, 0.25], [G5, 1], [E5, 1], [C5, 1], [B4, 1], [A4, 2],
  [F5, 0.75], [F5, 0.25], [E5, 1], [C5, 1], [D5, 1], [C5, 3],
];

/** Root note under each bar, so the melody isn't left bare. */
const BASS = [[C4, 0], [G4 / 2, 6], [C4, 12], [F4 / 2, 18]];

const BEAT = 0.46;

/** One music-box note: a sine fundamental with two quiet partials over it. */
function pluck(freq, at, gainPeak, decay) {
  [[1, 1], [2, 0.28], [3.01, 0.12]].forEach(([mult, amp], i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = i === 0 ? 'sine' : 'triangle';
    osc.frequency.value = freq * mult;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(gainPeak * amp, at + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + decay);
    osc.connect(gain).connect(master);
    osc.start(at);
    osc.stop(at + decay + 0.05);
    melodyNodes.push(osc);
  });
}

/** Plays the tune once. Safe to call when audio was never started. */
export function melody() {
  if (!ctx || muted) return;
  stopMelody();
  const t0 = ctx.currentTime + 0.15;

  let beat = 0;
  for (const [freq, length] of TUNE) {
    pluck(freq, t0 + beat * BEAT, 0.11, Math.min(1.6, length * BEAT + 1.1));
    beat += length;
  }

  for (const [freq, at] of BASS) {
    pluck(freq / 2, t0 + at * BEAT, 0.05, 2.4);
  }
}

export function stopMelody() {
  if (loopTimer) { clearTimeout(loopTimer); loopTimer = null; }
  melodyNodes.forEach((n) => {
    try { n.stop(); } catch { /* already finished */ }
  });
  melodyNodes = [];
}

/** Total length of the tune, so the loop can line itself up. */
const TUNE_BEATS = TUNE.reduce((sum, [, len]) => sum + len, 0);

/** Plays the tune over and over until stopMelody() is called. */
export function startTune() {
  if (!ctx) return;
  stopMelody();
  const again = () => {
    melody();
    loopTimer = setTimeout(again, (TUNE_BEATS * BEAT + 1.4) * 1000);
  };
  again();
}

/**
 * Plays part of an audio file — used for the song behind the collage.
 * `start`/`end` are seconds into the track.
 */
export function playClip(src, from = 0, to = null) {
  stopClip();
  if (!src) return;
  clip = new Audio(src);
  clip.volume = muted ? 0 : 0.62;
  // currentTime only sticks once the browser knows how long the file is.
  clip.addEventListener('loadedmetadata', () => {
    try { clip.currentTime = from; } catch { /* unseekable */ }
  });
  clip.play().catch(() => { /* file missing, or autoplay refused */ });
  if (to != null) clipTimer = setTimeout(stopClip, Math.max(0, (to - from) * 1000));
}

export function stopClip() {
  if (clipTimer) { clearTimeout(clipTimer); clipTimer = null; }
  if (clip) {
    clip.pause();
    clip = null;
  }
}
