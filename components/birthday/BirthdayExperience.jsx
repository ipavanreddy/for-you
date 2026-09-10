'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import s from './birthday.module.css';
import { birthday } from '@/data/birthday';
import { makeRandom } from './rng';
import * as audio from './celebrationAudio';
import Fireworks from './Fireworks';
import Lockscreen from './Lockscreen';
import Cake from './Cake';
import GiftSlot from './GiftSlot';
import FlowerBurst from './FlowerBurst';
import LetterCard from './LetterCard';
import PlaylistCard from './PlaylistCard';

/* Beats after the bubble line is tapped, in ms. */
const BEAT_FOG = 1300;
const BEAT_CAKE = 2700;
const BEAT_READY = 4400;

/* After the candle goes out: the cut-outs arrive, then the sky winds down. */
const BEAT_GIFTS = 1150;
const BEAT_SPARKS_OFF = 3000;

/* 0 locked · 1 bubble line, quiet, waiting for a tap · 2 the sky erupts and the
   hearts fade in · 3 fog · 4 cake rises and the shells stop · 5 settled */
const LOCKED = 0;
const INTRO = 1;
const BLAST = 2;
const FOG = 3;
const CAKE = 4;
const READY = 5;

/* Where each cut-out lands on the semicircle: up-left, above, up-right. */
const ARC_ANGLES = [150, 90, 30];

const HEART_GOLD = 'radial-gradient(circle at 32% 28%, #FFF3CC 0%, #E8B44A 55%, #B07C27 100%)';
const HEART_PINK = 'radial-gradient(circle at 32% 28%, #FFE4EE 0%, #F2A7C3 55%, #C46C8B 100%)';
const HEART_ROSE = 'radial-gradient(circle at 32% 28%, #FFD2E2 0%, #DE8CAC 55%, #A85675 100%)';
const HEART_TINTS = [HEART_GOLD, HEART_PINK, HEART_ROSE, HEART_GOLD, HEART_PINK];

/** The photo backdrop, drifting, with hearts and gold specks rising over it. */
function HeartsBackdrop({ show, src }) {
  const bits = useMemo(() => {
    const random = makeRandom(4242);
    return Array.from({ length: 30 }, (_, i) => {
      const speck = i % 3 === 2;
      const tint = HEART_TINTS[i % HEART_TINTS.length];
      const size = speck ? 4 + random() * 8 : 15 + random() * 34;
      // A few sit out of focus, the way they do in the photo itself.
      const soft = !speck && random() < 0.3;
      return {
        speck,
        size,
        left: random() * 100,
        // Glitter speckle over the tint; the heart's two lobes inherit it.
        background: speck
          ? 'radial-gradient(circle, #FFF0C4 0%, rgba(232,180,74,0.75) 45%, transparent 72%)'
          : `radial-gradient(circle, rgba(255,255,255,0.85) 0.6px, transparent 0.7px) 0 0 / 4px 4px, ${tint}`,
        duration: 20000 + random() * 26000,
        delay: -random() * 44000,
        blur: soft ? 2 + random() * 3 : 0,
        opacity: speck ? 0.5 + random() * 0.5 : (soft ? 0.45 : 0.7 + random() * 0.3),
      };
    });
  }, []);

  return (
    <div className={`${s.layer} ${s.heartsBg} ${show ? s.heartsOn : ''}`} aria-hidden="true">
      <div className={s.heartsPhoto} style={{ backgroundImage: `url(${src})` }} />
      <div className={s.heartsVeil} />
      {bits.map((b, i) => (
        <span
          key={i}
          className={s.floater}
          style={{
            left: `${b.left}%`,
            opacity: b.opacity,
            filter: b.blur ? `blur(${b.blur}px)` : undefined,
            animationDuration: `${b.duration}ms`,
            animationDelay: `${b.delay}ms`,
          }}
        >
          <span
            className={b.speck ? s.spark : s.heart}
            style={{ width: b.size, height: b.size, background: b.background }}
          />
        </span>
      ))}
    </div>
  );
}

function Fog({ beat }) {
  const puffs = useMemo(() => {
    const random = makeRandom(88);
    return Array.from({ length: 9 }, (_, i) => ({
      left: (i / 9) * 110 - 8 + random() * 8,
      bottom: random() * 42,
      width: 300 + random() * 360,
      height: 160 + random() * 200,
      duration: 16000 + random() * 16000,
      delay: -random() * 16000,
      opacity: 0.45 + random() * 0.5,
    }));
  }, []);

  const cls = beat >= CAKE ? s.fogThin : beat >= FOG ? s.fogVisible : '';

  return (
    <div className={`${s.layer} ${s.fogLayer}`} aria-hidden="true">
      <div className={`${s.fogBank} ${cls}`}>
        {puffs.map((p, i) => (
          <span
            key={i}
            className={s.fogPuff}
            style={{
              left: `${p.left}%`,
              bottom: `${p.bottom}%`,
              width: p.width,
              height: p.height,
              opacity: p.opacity,
              animationDuration: `${p.duration}ms`,
              animationDelay: `${p.delay}ms`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

/** Splits the line into words of characters, numbered continuously for the
 *  pop-in stagger. Words stay whole so the line wraps sensibly on a phone. */
function splitLine(line) {
  let n = 0;
  return line.split(' ').map((word) => {
    const entry = { chars: [...word], start: n };
    n += word.length;
    return entry;
  });
}

export default function BirthdayExperience() {
  const [beat, setBeat] = useState(LOCKED);
  const [blown, setBlown] = useState(false);
  const [gusting, setGusting] = useState(false);
  const [showGifts, setShowGifts] = useState(false);
  const [sparksOn, setSparksOn] = useState(false);
  const [muted, setMuted] = useState(false);
  const [openIndex, setOpenIndex] = useState(null);
  const [opened, setOpened] = useState([]);
  const timers = useRef([]);
  const voiceRef = useRef(null);

  const after = useCallback((ms, fn) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // Dev-only preview: /birthday?stage=cake or ?stage=gifts jumps past the lock
  // screen so you can eyeball a later beat without re-typing the passcode.
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    const stage = new URLSearchParams(window.location.search).get('stage');
    if (stage === 'intro') setBeat(INTRO);
    if (stage === 'blast') setBeat(BLAST);
    if (stage === 'cake') setBeat(READY);
    if (stage === 'gifts' || stage === 'open') {
      setBeat(READY);
      setBlown(true);
      setShowGifts(true);
    }
    // ?stage=open1 / open2 / open3 opens that gift's card straight away.
    const open = /^open(\d)$/.exec(stage || '');
    if (stage === 'open' || open) {
      setBeat(READY);
      setBlown(true);
      setShowGifts(true);
      setOpenIndex(open ? Number(open[1]) - 1 : 1);
    }
  }, []);

  const unlock = useCallback(() => setBeat(INTRO), []);

  /** Tapping the bubble line is what sets the sky off. */
  const begin = useCallback(() => {
    if (beat !== INTRO) return;
    // This tap is the gesture browsers require before any audio can play.
    audio.start(birthday.music);
    audio.startTune();
    setBeat(BLAST);
    after(BEAT_FOG, () => setBeat(FOG));
    after(BEAT_CAKE, () => setBeat(CAKE));
    after(BEAT_READY, () => setBeat(READY));
  }, [beat, after]);

  const blow = useCallback(() => {
    if (blown) return;
    setGusting(true);
    setSparksOn(true);
    after(120, () => setBlown(true));
    after(1000, () => setGusting(false));
    after(BEAT_GIFTS, () => setShowGifts(true));
    // The three of them have landed by now, so let the sky empty out.
    after(BEAT_SPARKS_OFF, () => setSparksOn(false));
  }, [blown, after]);

  const openGift = useCallback((index) => {
    setOpenIndex(index);
    setOpened((prev) => (prev.includes(index) ? prev : [...prev, index]));
    // This tap can also revive a context the browser suspended in the meantime.
    audio.resume();
    // The tune plays right up until one of them is opened.
    audio.stopMelody();
    // Wait for the flowers to clear, then start the song with the card.
    const g = birthday.gifts[index];
    const wait = g?.flowers ? 2700 : 350;
    if (g?.audio?.src) after(wait, () => audio.playClip(g.audio.src, g.audio.start, g.audio.end));
  }, [after]);

  const closeGift = useCallback(() => {
    audio.stopClip();
    setOpenIndex(null);
  }, []);

  // Starts the audio letter once its card has finished arriving. Opening the
  // gift is itself a click, so browsers allow this to play.
  useEffect(() => {
    const el = voiceRef.current;
    if (!el) return;
    el.muted = muted;
    const wait = birthday.gifts[openIndex]?.flowers ? 2900 : 500;
    const id = setTimeout(() => el.play().catch(() => { /* left for the button */ }), wait);
    return () => clearTimeout(id);
  }, [openIndex, muted]);

  useEffect(() => {
    if (openIndex === null) return;
    const onKey = (e) => { if (e.key === 'Escape') closeGift(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openIndex, closeGift]);

  const replay = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setBlown(false);
    setGusting(false);
    setShowGifts(false);
    setSparksOn(false);
    setOpenIndex(null);
    setOpened([]);
    setBeat(LOCKED);
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      audio.setMuted(!m);
      return !m;
    });
  }, []);

  useEffect(() => () => audio.stop(), []);

  const introWords = useMemo(() => splitLine(birthday.intro), []);
  const unlocked = beat > LOCKED;
  const gift = openIndex === null ? null : birthday.gifts[openIndex];

  const onHearts = beat >= BLAST;
  const erupting = beat === BLAST || beat === FOG;

  return (
    <div className={`${s.stage} ${onHearts ? s.onHearts : ''}`}>
      <HeartsBackdrop show={onHearts} src={birthday.images.hearts} />

      <Fireworks
        active={onHearts}
        launching={erupting || sparksOn}
        rate={erupting ? 150 : 230}
        boost={erupting ? 1.4 : 1}
        onDark={onHearts}
        className={`${s.layer} ${s.fireworks}`}
      />

      {beat >= INTRO && beat <= FOG && (
        <div className={s.introLayer}>
          <button
            type="button"
            onClick={begin}
            className={`${s.introBlock} ${beat >= BLAST ? s.introOut : ''}`}
          >
            <p className={s.bubbleLine}>
              {introWords.map((word, w) => (
                <span key={w} className={s.bubbleWord}>
                  {word.chars.map((ch, c) => (
                    <span key={c} className={s.bubbleChar} style={{ '--i': String(word.start + c) }}>
                      {ch}
                    </span>
                  ))}
                </span>
              ))}
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={s.introPhoto} src={birthday.images.intro} alt="" />
            <p className={s.introHint}>{birthday.introHint}</p>
          </button>
        </div>
      )}

      <Fog beat={beat} />

      {unlocked && (
        <div className={s.scene}>
          <div className={s.sceneInner}>
            <div className={`${s.greeting} ${beat >= READY ? s.greetingIn : ''}`}>
              <h1 className={s.greetingText}>{birthday.greeting}</h1>
            </div>

            <div className={`${s.arena} ${showGifts ? s.arenaTall : ''}`}>
              <Cake visible={beat >= CAKE} flameOut={blown} gusting={gusting} />

              {showGifts &&
                birthday.gifts.map((g, i) => (
                  <GiftSlot
                    key={g.id}
                    gift={g}
                    index={i}
                    angle={ARC_ANGLES[i]}
                    taken={opened.includes(i)}
                    onOpen={openGift}
                  />
                ))}
            </div>

            {!showGifts && (
            <button
              type="button"
              onClick={blow}
              className={`${s.blowBox} ${beat >= READY ? s.blowIn : ''} ${blown ? s.blowGone : ''}`}
              aria-hidden={blown ? 'true' : undefined}
            >
              <span className={s.blowPic}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className={s.blowImg} src={birthday.blow.image} alt="" />
                <span className={s.blowLabel}>{birthday.blow.label}</span>
              </span>
              <p className={s.blowSub}>{birthday.blow.sub}</p>
            </button>
            )}

          </div>
        </div>
      )}

      {gift && (
        <div className={s.modalLayer} role="dialog" aria-modal="true" aria-label={gift.title}>
          <div
            className={`${s.scrim} ${gift.card ? s.scrimSolid : ''}`}
            onClick={closeGift}
          />

          {gift.flowers && <FlowerBurst seed={openIndex + 1} />}

          {gift.letter ? (
            <LetterCard gift={gift} muted={muted} onClose={closeGift} />
          ) : gift.playlist ? (
            <PlaylistCard gift={gift} onClose={closeGift} />
          ) : (
          <div
            className={`${s.giftCard} ${gift.card ? s.giftCardWide : ''} ${gift.flowers ? s.giftCardLate : ''}`}
          >
            {gift.card ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className={s.giftCardImg} src={gift.card} alt={gift.title} />
                {/* A corner button instead of a caption block — the picture gets
                    the height that a title and a wide button would have eaten. */}
                <button
                  type="button"
                  className={s.cardClose}
                  onClick={closeGift}
                  aria-label="Close"
                >
                  ×
                </button>
              </>
            ) : (
              <>
                <span className={s.giftEmoji}>{gift.emoji}</span>
                <p className={s.giftIndex}>Gift {openIndex + 1} of {birthday.gifts.length}</p>
                <h3 className={s.giftTitle}>{gift.title}</h3>
                {gift.body && <p className={s.giftBody}>{gift.body}</p>}
                {gift.voice && (
                  <div className={s.voiceBox}>
                    <p className={s.voiceLabel}>{gift.voiceLabel}</p>
                    <audio
                      ref={voiceRef}
                      className={s.voicePlayer}
                      src={gift.voice}
                      controls
                      preload="metadata"
                    />
                  </div>
                )}
                {gift.link?.url && (
                  <a
                    className={s.giftLink}
                    href={gift.link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {gift.link.label || 'Play the song'}
                  </a>
                )}
                <button type="button" className={s.giftClose} onClick={closeGift}>Close</button>
              </>
            )}
          </div>
          )}
        </div>
      )}

      {unlocked && (
        <div className={s.corner}>
          <button
            type="button"
            className={s.iconBtn}
            onClick={toggleMute}
            aria-label={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? 'Sound off' : 'Sound on'}
          </button>
          <button type="button" className={s.replay} onClick={replay}>Replay</button>
        </div>
      )}

      {!unlocked && (
        <div className={s.lockLayer}>
          <div>
            <Lockscreen
              passcode={birthday.passcode}
              lockTime={birthday.lockTime}
              hint={birthday.passcodeHint}
              onUnlock={unlock}
            />
            <p className={s.qrNote}>Scan · Unlock · Celebrate</p>
          </div>
        </div>
      )}
    </div>
  );
}
