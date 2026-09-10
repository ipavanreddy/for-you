# for-you

A little birthday page. Lock screen, fireworks, cake, and three things to open.

The published site lives in `docs/` and is served by GitHub Pages.

## Editing

Everything you'd want to change — the greeting, the passcode, the letter,
the playlist links, the picture filenames — lives in one file:

    data/birthday.js

Pictures and audio go in `public/birthday/`.

## Rebuilding after a change

    npm install
    npm run deploy
    git add -A && git commit -m "update" && git push

`npm run deploy` rebuilds the site and refreshes `docs/`. GitHub Pages picks
up the new version within a minute or so.
