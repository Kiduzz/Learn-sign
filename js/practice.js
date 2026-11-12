// Camera practice: runs MediaPipe Hand Landmarker in the browser (nothing is
// uploaded) and checks the student's handshape against a target letter.

import { check } from './classifier.js';

const MP_VERSION = '0.10.14';
const MP_BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}`;
const MODEL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

const CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [17, 18], [18, 19], [19, 20], [0, 17],
];

let landmarkerPromise = null;
async function getLandmarker() {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const { FilesetResolver, HandLandmarker } = await import(`${MP_BASE}/vision_bundle.mjs`);
      const vision = await FilesetResolver.forVisionTasks(`${MP_BASE}/wasm`);
      const make = (delegate) => HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL, delegate },
        runningMode: 'VIDEO',
        numHands: 1,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      try { return await make('GPU'); } catch { return await make('CPU'); }
    })();
    landmarkerPromise.catch(() => { landmarkerPromise = null; });
  }
  return landmarkerPromise;
}

export class Practice {
  constructor({ video, canvas, onStatus, onResult }) {
    this.video = video;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onStatus = onStatus;
    this.onResult = onResult;
    this.letter = 'A';
    this.running = false;
    this._lastTime = -1;
  }

  async start() {
    this.onStatus('Starting camera…');
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 960 }, height: { ideal: 720 } }, audio: false });
    this.stream = stream;
    this.video.srcObject = stream;
    await this.video.play();
    this.onStatus('Loading hand tracker…');
    this.landmarker = await getLandmarker();
    this.onStatus('');
    this.running = true;
    this._loop();
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this._raf);
    if (this.stream) this.stream.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  setLetter(l) { this.letter = l; }

  _loop() {
    if (!this.running) return;
    this._raf = requestAnimationFrame(() => this._loop());
    const v = this.video;
    if (v.readyState < 2 || v.currentTime === this._lastTime) return;
    this._lastTime = v.currentTime;
    const res = this.landmarker.detectForVideo(v, performance.now());
    this._draw(res);
    if (!res.landmarks || !res.landmarks.length) {
      this.onResult(null);
      return;
    }
    // MediaPipe labels hands as if the picture were mirrored; we pass the raw
    // camera frame, so the label is swapped relative to the signer's real hand.
    const label = res.handedness?.[0]?.[0]?.categoryName;
    const handedness = label === 'Left' ? 'Right' : label === 'Right' ? 'Left' : undefined;
    // world landmarks: x right, y down, z away -> rotate to y up (keeps chirality)
    const pts = res.worldLandmarks[0].map((p) => [p.x, -p.y, -p.z]);
    this.onResult(check(this.letter, pts, { handedness }), handedness);
  }

  _draw(res) {
    const c = this.canvas;
    const w = this.video.videoWidth;
    const h = this.video.videoHeight;
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    const g = this.ctx;
    g.clearRect(0, 0, w, h);
    if (!res.landmarks) return;
    for (const lm of res.landmarks) {
      g.lineWidth = Math.max(3, w / 200);
      g.strokeStyle = 'rgba(255,255,255,0.9)';
      g.beginPath();
      for (const [a, b] of CONNECTIONS) {
        g.moveTo(lm[a].x * w, lm[a].y * h);
        g.lineTo(lm[b].x * w, lm[b].y * h);
      }
      g.stroke();
      lm.forEach((p, i) => {
        g.fillStyle = i === 4 ? '#ff7a1a' : [8, 12, 16, 20].includes(i) ? '#13a6c9' : '#ffffff';
        g.beginPath();
        g.arc(p.x * w, p.y * h, Math.max(4, w / 140), 0, Math.PI * 2);
        g.fill();
      });
    }
  }
}
