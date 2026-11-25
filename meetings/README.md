# Meetings — Video Conferencing App

**Live app:** [Open Meetings — Video Conferencing App](https://alphadyn.github.io/apps/meetings/)

> Part of [Alphadyn Apps](../README.md) · [Browse the catalog](../index.html)

> Browser-based WebRTC meeting app with mobile controls. See the [repository catalog](../README.md) for shared setup and deployment context.

A browser-based video conferencing app. Enter a name, meeting code, and private invite secret to join a room where
participants can talk, video chat, message each other, and share files — all peer-to-peer, with
no application server required, and all strongly encrypted end-to-end.

The Meetings logo on the join screen links back to the app's landing page. Reload the page to return to the join screen; doing so leaves any active meeting.

## Features
- **Audio & video** calling between all participants using WebRTC, with mic/camera mute toggles
  and a camera preview before joining
- **Text chat** sent over a WebRTC data channel to everyone currently in the meeting
- **File sharing** (up to 25 MB) — send a file and everyone in the meeting gets a direct download
  link
- **Strong end-to-end content encryption**: encoded audio/video frames, chat, files, and
  participant-directory messages use AES-256-GCM with keys derived from a random 256-bit
  invite secret, on top of WebRTC transport encryption. Signaling metadata is not end-to-end
  encrypted; see Encryption below for the trust model and limitations.
- **Mesh topology**: the first participant to join a meeting code becomes its lightweight
  directory (introducing new joiners to everyone already present); every participant then holds a
  direct connection to every other participant, so media/chat/files never pass through a central
  server
- **Private invite links**: "Copy invite link" copies `?room=<code>#key=<secret>`. The fragment
  is not sent in HTTP requests or to the signaling broker. Treat the entire invite as a credential.
- **Fullscreen mode**: expand the meeting view and exit fullscreen with the toolbar control
- **Mobile-friendly layout**: responsive video tiles, touch-sized controls, and an overlay panel
  for chat, people, and files on smaller screens. The pre-join form and device preview sit side
  by side on larger displays and stack on phones. Landscape phones use a compact toolbar;
  dynamic viewport sizing and safe-area padding keep the meeting controls within reach.
- **Accessible meeting details**: visible panel close control, synchronized toolbar states,
  arrow-key/Home/End tab navigation, Escape to close, and keyboard-accessible file sharing
- Participant list with live join/leave updates

## Run it
This app uses [PeerJS](https://peerjs.com/) (loaded from a CDN) for WebRTC signaling via its free
public cloud broker, so an internet connection is required, along with browser permission to use
the camera and microphone. Camera/microphone access requires a secure context: use HTTPS when
deployed, or serve the folder on localhost while developing:

```bash
cd meetings
python3 -m http.server 8000
```

Then open http://localhost:8000 in your browser. Encrypted media requires a current browser with
`RTCRtpScriptTransform`, Web Crypto, and Worker support. Opening the HTML directly using `file:`
is not supported for joining: the media worker must be served over HTTPS or localhost.
To test locally with multiple participants, use the complete invite link in separate browser tabs,
windows, or devices.

## How to use
1. Click **Create meeting** to generate a room code and a random private secret, enter your name,
  then click **Join meeting**. To join an existing meeting, use its complete invite link or enter
  its room code and 43-character secret separately. A room code alone is no longer sufficient;
  older clients are incompatible with this encryption protocol.
2. Grant camera/microphone permission when prompted. The app waits for your device permissions
  before starting the meeting; if one device is unavailable, the other can still work. If you
  change browser permissions or connect a device, click **Retry camera / microphone** on the
  join screen. You can also join without either device to use chat and files.
  If access is blocked, enable camera and microphone access in both your browser's site
  permissions and your operating system's privacy settings before retrying. An embedded
  editor preview may block capture; use the HTTPS app or localhost in a supported browser.
  Retry reports permission, missing-device, and device-in-use errors and keeps any already
  working microphone or camera track.
3. Use the control bar to mute your mic, stop your camera, open **Chat**, view **People**, share
  **Files**, enter or exit **Fullscreen**, or **Leave** the meeting. On phones, the toolbar and
  side panel adapt to the smaller screen.
4. Click **Copy invite link** and send it to others so they can join the same meeting instantly.

## Main files
- `index.html` — join screen and in-meeting layout (video grid, chat/people/files panel, controls)
- `app.js` — PeerJS-based mesh signaling, media/data connection handling, chat, file transfer, and
  the AES-256-GCM encryption layer
- `styles.css` — layout and visual styling
- `crypto.js` — shared secret generation, key derivation, and authenticated encryption
- `media-worker.js` — encoded audio/video frame encryption and decryption
- `tests/` — dependency-free browser regression tests; open `/tests/` on the local server

## Encryption
- **Secret and keys**: `crypto.getRandomValues` generates a 32-byte secret encoded as 43
  base64url characters. HKDF-SHA-256 derives separate data and media key material, scoped to
  the room and protocol version. Keys are non-extractable Web Crypto keys. Human-chosen room
  codes are never encryption keys. The secret is kept in memory and the password field, never
  in local/session storage. An incoming invite's fragment is removed from the current history
  entry after loading; browser history, clipboard managers, extensions, and screenshots still
  require care.
- **Audio & video**: an `RTCRtpScriptTransform` worker encrypts each encoded frame with
  AES-256-GCM before WebRTC sends it, in addition to DTLS-SRTP. HMAC-SHA-256 derives a distinct
  frame key for each call, direction, and track kind. Each frame has a fresh random 96-bit IV,
  a 128-bit authentication tag, and an authenticated counter. Receivers reject malformed,
  tampered, wrong-key, and replayed frames (with a bounded reordering window). Unsupported
  browsers or worker/transform failures do not fall back to unencrypted content.
- **Chat, files, and directory messages**: AES-256-GCM protects every data-channel payload.
  The authenticated context binds the protocol, connection, sender, recipient, message type,
  file ID, and ordered sequence. Encryption and decryption are serialized per connection so
  file metadata and data stay ordered. Plaintext, tampered, replayed, and wrong-key messages
  close the connection with an explicit error. Peers must complete a fresh encrypted
  challenge/response identity exchange before media calls are accepted; captured identity
  messages cannot authenticate a new connection.
- **What remains visible**: the PeerJS broker handles WebRTC offers/answers, ICE candidates,
  connection IDs, and timing; STUN and network infrastructure can see IP addresses and traffic
  size/timing. These setup messages are necessary to connect and are not claimed to be
  end-to-end encrypted. The directory ID is a versioned hash of the public room code. Neither
  the broker nor relays receive the invite secret or content keys.
- **Trust model**: anyone with the full invite secret can join and decrypt meeting content.
  There is no independent participant identity verification, forward secrecy against a later
  compromise of the shared invite secret, or automatic rekey on departure. Start a new meeting
  and share a new invite to revoke old access. The page origin and its loaded scripts (including
  PeerJS from its CDN) must be trusted: encryption cannot protect against compromised client
  code, browser extensions, recording by participants, or a compromised endpoint.

## Notes & limitations
- Because signaling relies on PeerJS's public broker and media flows directly between browsers,
  very large meetings or participants behind restrictive NATs/firewalls may have trouble
  connecting (no TURN relay is configured).
- Files are transferred in a single data-channel message per recipient and held in memory, so the
  25 MB cap keeps transfers reliable across browsers.
