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

**Lock-screen playback** is enabled by default on iPhone and iPad. This mode uses
native audio playback rather than routing sound through Web Audio, which iOS may
interrupt when the screen locks. Live spectrum, waveform, peak, RMS, and sample-rate
analysis are unavailable in this mode. Turn the toggle off to restore live analysis.
Switching modes preserves the playback position, volume, and playing/paused state.

On browsers supporting the Media Session API, the current track appears in system
media controls with play, pause, stop, and seeking actions where supported. Start
playback with a tap before locking the screen and keep the browser tab open.
Background playback still depends on iOS and the browser; embedded in-app browsers,
OS interruptions, or closing the tab can stop it. Actual lock-screen behavior must
be checked on a physical iPhone.
