/* ──────────────────────────────────────────────────────────────────────────
   Birthday greeting — everything you'd want to change lives here.
   ────────────────────────────────────────────────────────────────────────── */

/* GitHub Pages serves a project site from a sub-path, so every asset URL is
   prefixed with it. Empty locally, so nothing changes in development. */
const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';

export const birthday = {
  /** Bubble-font line that plays before the cake arrives. */
  intro: 'Hi baby, I made something for you.',

  /** The one line that appears above the cake. */
  greeting: 'Happy Birthday, Pavan',

  /** Typed on the phone lock screen. Any length works; keypad is 0-9. */
  passcode: '1309',

  /** Frozen clock face on the lock screen. */
  lockTime: '12:00 AM',

  /** Shown after a wrong guess. Never reveals the code itself. */
  passcodeHint: 'Hint: your birthday',

  /** `intro` shows under the bubble line; `hearts` is the cake-scene backdrop. */
  images: {
    intro: `${BASE}/birthday/intro.png`,
    hearts: `${BASE}/birthday/hearts.jpg`,
  },

  /**
   * Optional background track, e.g. `${BASE}/birthday/music.mp3`. Leave null and the
   * page still has synthesised firework sound and a fanfare.
   */
  music: null,

  /** Nudge under the intro picture, so people know the line is a button. */
  introHint: 'tap to open',

  /** The control beside the cake. Drop a cut-out PNG at `image`. */
  blow: {
    image: `${BASE}/birthday/blow.png`,
    label: 'Blow the candle',
    // Set to '' to hide the smaller line underneath.
    sub: '',
  },

  /**
   * The cards below the cake, left to right. Add more and the row grows —
   * it wraps and stays centred.
   */
  gifts: [
    { id: 'sad', image: `${BASE}/birthday/gift-1.png`, name: 'sadu you', label: 'Click here',
      emoji: '🥺', title: 'Sad you',
      // An audio letter: put the file in public/birthday/ and point at it.
      // mp3, m4a, wav and ogg all work.
      // AAC first: a third the size of the wav, so it starts far sooner on a
      // phone. The wav stays as a fallback for anything that cannot play AAC.
      voice: `${BASE}/birthday/letter.m4a`,
      voiceFallback: `${BASE}/birthday/letter.wav`,
      voiceLabel: 'A letter for you',
      // The written letter, shown on the stationery. Each entry appears as its
      // own line, in step with the recording.
      letterPaper: `${BASE}/birthday/letter-paper.jpg`,
      letter: [
        'Hi baby, happy birthday. \u2764\ufe0f',
        'I\u2019ve been waiting for this day for so long, and now that it\u2019s finally here, I have so much in my heart that I don\u2019t even know where to begin.',
        'I could simply wish you a happy birthday and tell you that I love you, but when it comes to you, my feelings have never been that simple. You mean far too much to me to fit into a few words.',
        'I wish you could see yourself through my eyes, even just for a moment. You\u2019d see someone so incredibly special, someone with so much love, potential, and goodness inside him. You\u2019d see the person I\u2019ve seen all along\u2014the person I believe in, even on the days when he struggled to believe in himself.',
        'Sometimes I feel like you spend so much time looking for what\u2019s missing that you forget to see everything beautiful that is already a part of your life. I wish you could slow down sometimes and realize how much you\u2019ve overcome, how much you\u2019ve grown, and how deserving you are of a life that feels peaceful and truly yours.',
        'And more than anything, I want you to be happy. Truly happy. Not the kind of happiness that comes for a little while and disappears, but the kind that quietly stays in your heart. The kind where you wake up and feel at peace with yourself.',
        'If there is one thing I could give you on your birthday, it would be the ability to see yourself the way I see you: worthy of love, worthy of happiness, and worthy of all the beautiful things life still has waiting for you.',
        'I hope this year brings you back to yourself, to your dreams, and to the happiness your heart has been searching for. And I hope, someday, you understand just how deeply you are loved. \u2764\ufe0f',
        'And baby, I love you to the sun and back.',
      ],
      body: '' },
    { id: 'funny', image: `${BASE}/birthday/gift-2.png`, name: 'the funny you', label: 'Click here',
      emoji: '😂', title: 'The funny you',
      // `flowers` blooms a burst before the card lands; `card` is the picture.
      flowers: true,
      card: `${BASE}/birthday/card-funny.jpg`,
      // Drop your own audio file here and it plays behind the collage.
      // `start`/`end` are seconds into the track.
      audio: { src: `${BASE}/birthday/song.mp3`, start: 39, end: 68 },
      voice: null,
      voiceLabel: 'A letter for you',
      // A button on the card that opens the song on YouTube in a new tab.
      // e.g. link: { url: 'https://youtu.be/...', label: 'Play our song' }
      link: null,
      body: '' },
    { id: 'cute', image: `${BASE}/birthday/gift-3.png`, name: 'the cute you', label: 'Click here',
      emoji: '🥰', title: 'The cute you',
      voice: null,
      voiceLabel: 'A letter for you',
      // One heart per strand. Each opens its video on YouTube in a new tab.
      // Add a `name` to any of them and it shows on hover.
      playlist: {
        image: `${BASE}/birthday/playlist.jpg`,
        title: 'My playlist for you',
        songs: [
          { url: 'https://youtube.com/shorts/St_EK3Mg56I', name: '' },
          { url: 'https://youtu.be/fbCtipc2mZs', name: '' },
          { url: 'https://youtu.be/BgmY2MkrY0I', name: '' },
          { url: 'https://youtu.be/2Vv-BfVoq4g', name: '' },
          { url: 'https://youtu.be/i1XWFepLJso', name: '' },
          { url: 'https://youtu.be/NeXbmEnpSz0', name: '' },
          { url: 'https://youtu.be/dbnL7dmyj5o', name: '' },
        ],
      },
      body: '' },
  ],
};
