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

function ensure() {
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

export function setMuted(next) {
  muted = next;
  if (master && ctx) master.gain.setTargetAtTime(muted ? 0 : 0.55, ctx.currentTime, 0.02);
  if (music) music.volume = muted ? 0 : 0.34;
  if (clip) clip.volume = muted ? 0 : 0.62;
}

export function stop() {
  stopMelody();
  stopClip();
  stopVoice();
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

/* ── The voice letter ──────────────────────────────────────────────────────
   Played as a decoded buffer through this same graph, rather than through an
   <audio> element. The synthesised tune is audible, which proves this path
   reaches the speakers; a plain <audio> element goes out by a separate route
   that was producing nothing.
   ──────────────────────────────────────────────────────────────────────── */

let voiceBuf = null;
let voiceNode = null;
let voiceStartedAt = 0;
let voiceOffset = 0;
let voicePlaying = false;
let voiceGainValue = 1.5;

/** Fetches and decodes the recording. Returns its length, or null if there
 *  is no audio context yet (in which case the caller should fall back). */
export async function loadVoice(url, timeoutMs = 5000) {
  const c = ensure();
  if (!c || !url) return null;
  if (c.state === 'suspended') await c.resume();
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const bytes = await res.arrayBuffer();
    // decodeAudioData can sit there forever if the platform has no decoder for
    // the format, so never wait on it indefinitely — give up and let the
    // caller fall back to an <audio> element.
    voiceBuf = await Promise.race([
      c.decodeAudioData(bytes),
      new Promise((_, reject) => setTimeout(() => reject(new Error('decode timed out')), timeoutMs)),
    ]);
    voiceOffset = 0;
    return voiceBuf.duration;
  } catch {
    voiceBuf = null;
    return null;
  }
}

/**
 * Sends an <audio> element's output through this graph. Used when the buffer
 * route isn't available: element audio can come out silent even while the
 * synthesised tune is audible, and this puts it back on the working path.
 * A MediaElementSource can only be created once per element.
 */
export function routeElement(el, gainValue = 1) {
  if (!ctx || !el) return false;
  if (ctx.state === 'suspended') ctx.resume();
  try {
    if (!el._wired) {
      const src = ctx.createMediaElementSource(el);
      const gain = ctx.createGain();
      gain.gain.value = gainValue;
      src.connect(gain).connect(master);
      el._wired = gain;
    } else {
      el._wired.gain.value = gainValue;
    }
    return true;
  } catch {
    return false;
  }
}

export function playVoice(gainValue = voiceGainValue) {
  voiceGainValue = gainValue;
  if (!ctx || !voiceBuf) return false;
  if (ctx.state === 'suspended') ctx.resume();
  stopVoiceNode();
  const gain = ctx.createGain();
  gain.gain.value = gainValue;
  voiceNode = ctx.createBufferSource();
  voiceNode.buffer = voiceBuf;
  voiceNode.connect(gain).connect(master);
  voiceNode.onended = () => { if (voicePlaying) voicePlaying = false; };
  voiceNode.start(0, Math.min(voiceOffset, voiceBuf.duration - 0.05));
  voiceStartedAt = ctx.currentTime - voiceOffset;
  voicePlaying = true;
  return true;
}

function stopVoiceNode() {
  if (!voiceNode) return;
  voiceNode.onended = null;
  try { voiceNode.stop(); } catch { /* already finished */ }
  voiceNode = null;
}

export function pauseVoice() {
  if (!voicePlaying || !ctx) return;
  voiceOffset = Math.min(ctx.currentTime - voiceStartedAt, voiceBuf ? voiceBuf.duration : 0);
  stopVoiceNode();
  voicePlaying = false;
}

/** Jumps to a point in the recording, resuming if it was already running. */
export function seekVoice(seconds) {
  if (!ctx || !voiceBuf) return;
  const wasPlaying = voicePlaying;
  stopVoiceNode();
  voicePlaying = false;
  voiceOffset = Math.max(0, Math.min(seconds, voiceBuf.duration - 0.05));
  if (wasPlaying) playVoice(voiceGainValue);
}

export function stopVoice() {
  stopVoiceNode();
  voicePlaying = false;
  voiceOffset = 0;
  voiceBuf = null;
}

/** Where the recording has got to, for the progress read-out and the reveal. */
export function voiceTime() {
  if (!ctx || !voiceBuf) return { at: 0, len: 0, playing: false, ready: false };
  const at = voicePlaying
    ? Math.min(ctx.currentTime - voiceStartedAt, voiceBuf.duration)
    : voiceOffset;
  return { at, len: voiceBuf.duration, playing: voicePlaying, ready: true };
}

export function stopClip() {
  if (clipTimer) { clearTimeout(clipTimer); clipTimer = null; }
  if (clip) {
    clip.pause();
    clip = null;
  }
}
