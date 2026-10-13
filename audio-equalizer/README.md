# Signal Room

**Deployed application:** [Open the app](https://alphadyn.github.io/apps/audio-equalizer/)

> Standalone browser audio experience. See the [repository catalog](../README.md) for shared setup and deployment context.

A dependency-free browser audio equalizer and media player. Load an audio or video file to inspect its live frequency spectrum, waveform, peak level, and RMS level while playing.

## Run locally

From this directory, start a local server:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000. Files are processed locally in the browser and are not uploaded.

## iPhone and lock-screen playback

iPhone and iPad use native audio playback rather than routing sound through Web
Audio, which iOS may interrupt when the screen locks. The spectrum and waveform
visualizers remain displayed, but live spectrum, waveform, peak, RMS, and
sample-rate analysis are unavailable in native playback mode. Other platforms
use Web Audio for live analysis.

MP4 and MOV files are played directly through the audio element, without showing
video, extracting audio, or modifying tracks. Playback requires a browser-supported
audio codec. In lock-screen mode, play/pause controls use the browser's native media
handling rather than custom JavaScript handlers. On browsers exposing the Audio
Session API, playback also requests the `playback` audio-session type.
Safari may still restrict video-containing files when the device locks; this app
cannot override that OS restriction while retaining the original tracks.

On browsers supporting the Media Session API, the current track appears in system
media controls with play, pause, stop, and seeking actions where supported. Start
playback with a tap before locking the screen and keep the browser tab open.
Background playback still depends on iOS and the browser; embedded in-app browsers,
OS interruptions, or closing the tab can stop it. Actual lock-screen behavior must
be checked on a physical iPhone.
