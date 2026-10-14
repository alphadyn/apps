# Playlist

An installable, mobile-first audio and video player that runs entirely in the browser. No server or account required.

[Open app](https://alphadyn.github.io/apps/playlist/)

## Features

- **Add audio and video files** from the device (multi-select), e.g. MP3, M4A, WAV, FLAC, OGG, MP4, MOV, WEBM. Other files are skipped. Audio and video can be mixed in one playlist.
- **Video playback** in an inline player above the controls, with full screen and picture-in-picture (where supported). Tap the video to play/pause. Tap the film icon to hide or show it. Videos are marked with a VIDEO badge.
- **Add from URL**: paste a direct link to an audio or video file. The app downloads it (with progress and cancel) and saves it on the device, so it plays offline.
- **Play in order or shuffled**, with repeat off / repeat playlist / repeat one. Shuffle plays every track once per cycle, then reshuffles.
- **Reorder** by dragging the ≡ handle (touch or mouse), with arrow keys on the handle, or from a track's ⋯ menu (move up/down/top/bottom).
- **Save/load the playlist as a JSON file** (⤓ / ⤒ buttons). The file holds every track's details, the play settings and, optionally, the media itself (base64), so a playlist can be fully restored on another device.
- Lock-screen and headset controls through the Media Session API. The app also remembers the last track and position.
- Installable PWA (Add to Home Screen) with an offline app shell.

## Storage

- Media files and the playlist manifest are kept in **IndexedDB** in the browser, so they survive reloads and work offline. The app asks the browser for persistent storage.
- Exported JSON follows this shape:

```json
{
  "format": "alphadyn-playlist",
  "version": 1,
  "exportedAt": "2026-10-14T21:00:00.000Z",
  "settings": { "mode": "shuffle", "repeat": "all", "currentId": "…" },
  "tracks": [
    {
      "id": "…",
      "title": "Song",
      "fileName": "song.mp3",
      "type": "audio/mpeg",
      "kind": "audio",
      "size": 4194304,
      "duration": 215.3,
      "source": "url",
      "sourceUrl": "https://example.com/song.mp3",
      "addedAt": "2026-10-14T20:55:00.000Z",
      "data": "data:audio/mpeg;base64,…"
    }
  ]
}
```

`data` is only present when the playlist was exported with “Include audio and video”. `kind` is `"audio"` or `"video"`; if missing it is guessed from the file type. On import, tracks with `data` are restored directly. Tracks with only a `sourceUrl` are downloaded again. A bare JSON array of track objects is also accepted.

## Limitations

- URL downloads happen in the browser, so the server must allow cross-origin requests (CORS). Links to web pages or streaming services such as YouTube, Spotify or SoundCloud can't be downloaded; the app recognises these and explains why instead of trying.
- Playable formats depend on the device's browser (for example, iOS Safari doesn't play OGG/Opus in some versions).
- Exports that include media are about 1.34× the size of the files. The app asks before building exports over 300 MB, since large videos can fail to save on phones.
- Mobile browsers usually pause video when the app goes to the background or the screen locks. Use picture-in-picture to keep watching, or audio files for background listening.

## Development

```bash
python3 -m http.server 8000   # from the repository root
# open http://localhost:8000/playlist/
node --test playlist/playlist.test.js
```

Files: `index.html` (markup), `styles.css`, `app.js` (UI, playback, downloads, drag-reorder, import/export), `playlist.js` (pure logic, unit tested), `storage.js` (IndexedDB), `sw.js` + `manifest.webmanifest` (PWA).
