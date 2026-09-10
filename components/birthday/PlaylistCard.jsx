'use client';

import { useState } from 'react';
import s from './birthday.module.css';

/**
 * The bouquet-of-kisses card. Every balloon carries a heart that plays its
 * song. Positions are percentages of the card, so they hold at any size.
 */
const SPOTS = [
  { left: 60, top: 28 },
  { left: 45, top: 35 },
  { left: 81, top: 31 },
  { left: 40, top: 47 },
  { left: 58, top: 45 },
  { left: 78, top: 44 },
  { left: 51, top: 57 },
];

/** Pulls the video id out of any of the shapes a YouTube link comes in. */
function videoId(url = '') {
  const m =
    url.match(/[?&]v=([\w-]{6,})/) ||
    url.match(/youtu\.be\/([\w-]{6,})/) ||
    url.match(/\/shorts\/([\w-]{6,})/) ||
    url.match(/\/embed\/([\w-]{6,})/);
  return m ? m[1] : null;
}

export default function PlaylistCard({ gift, onClose }) {
  const { image, title, songs = [] } = gift.playlist;
  const [openAt, setOpenAt] = useState(null);

  const song = openAt === null ? null : songs[openAt];
  const id = song ? videoId(song.url) : null;

  return (
    <div className={s.playlistCard}>
      {id ? (
        <div className={s.playlistPlayer}>
          <iframe
            key={id}
            className={s.playlistFrame}
            src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
            title={song.name || `Song ${openAt + 1}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
          <div className={s.playlistRow}>
            {/* Prominent, because a browser with shields or an ad blocker will
                refuse to run the embedded player and this is the way out. */}
            <a className={s.playlistOpen} href={song.url} target="_blank" rel="noopener noreferrer">
              Open on YouTube
            </a>
            <button type="button" className={s.letterSkip} onClick={() => setOpenAt(null)}>
              &#8249; Back to the balloons
            </button>
          </div>
          <p className={s.playlistNote}>
            If the player shows an error, your browser is blocking it — use Open on YouTube.
          </p>
        </div>
      ) : (
        <div className={s.playlistPaper} style={{ backgroundImage: `url(${image})` }}>
          <p className={s.playlistTitle}>{title}</p>

          {songs.slice(0, SPOTS.length).map((track, i) => (
            <button
              key={track.url}
              type="button"
              className={s.playlistHeart}
              style={{ left: `${SPOTS[i].left}%`, top: `${SPOTS[i].top}%` }}
              onClick={() => setOpenAt(i)}
              title={track.name || `Song ${i + 1}`}
              aria-label={track.name || `Play song ${i + 1}`}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 21s-7.5-4.6-9.6-9A5.3 5.3 0 0 1 12 6.6 5.3 5.3 0 0 1 21.6 12c-2.1 4.4-9.6 9-9.6 9z" />
              </svg>
            </button>
          ))}
        </div>
      )}

      <button type="button" className={s.letterDone} onClick={onClose}>Close</button>
    </div>
  );
}
