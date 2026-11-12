// Signing avatar: a simple upper-body figure with two articulated hands,
// arms solved with two-bone IK, and a timeline player that interpolates
// keyframes (hand position, orientation and handshape).

import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { Hand, getShape, blendShapes, orientation, PALM_CENTER } from './hand.js';
import { REST_R, REST_L, mirrorPose } from './poses.js';

export const SKIN_TONES = {
  deep: 0x5a3825,
  brown: 0x8d5a3b,
  medium: 0xb07a52,
  light: 0xe0b08a,
};

const SHOULDER_Y = 1.43;
const SHOULDER_X = 0.185;
const UPPER = 0.29;
const FORE = 0.265;

// --------------------------------------------------------------------------
// Timeline helpers
// --------------------------------------------------------------------------
const smooth = (u) => u * u * (3 - 2 * u);

function resolveHand(h) {
  return {
    shape: getShape(h.s),
    pos: new THREE.Vector3(...h.p),
    quat: orientation(h.d, h.n),
  };
}

/**
 * Turn a sign definition into a playable timeline:
 *  rest -> keys -> hold -> rest. Each key has resolved R and L hand poses.
 */
export function buildTimeline(keys, { lead = 0.55, tail = 0.6, hold = 0.35 } = {}) {
  const out = [];
  let lastR = REST_R;
  let lastL = REST_L;
  out.push({ t: 0, R: resolveHand(REST_R), L: resolveHand(REST_L), ease: 'smooth' });
  for (const k of keys) {
    let R = k.R === undefined ? lastR : k.R === 'rest' ? REST_R : k.R;
    let L = k.L === undefined ? lastL : k.L === 'rest' ? REST_L : k.L === 'mirror' ? mirrorPose(R) : k.L;
    lastR = R;
    lastL = L;
    out.push({ t: lead + k.t, R: resolveHand(R), L: resolveHand(L), ease: k.ease || 'smooth', label: k.label, brows: k.brows });
  }
  const end = out[out.length - 1].t;
  out.push({ ...out[out.length - 1], t: end + hold, label: undefined });
  out.push({ t: end + hold + tail, R: resolveHand(REST_R), L: resolveHand(REST_L), ease: 'smooth' });
  return { keys: out, duration: end + hold + tail, signStart: lead, signEnd: end };
}

const _q = new THREE.Quaternion();
function sampleHand(a, b, u, out) {
  out.pos.lerpVectors(a.pos, b.pos, u);
  out.quat.slerpQuaternions(a.quat, b.quat, u);
  out.shape = blendShapes(a.shape, b.shape, u);
  return out;
}

/** Pose of both hands at time t. */
export function sampleTimeline(tl, t, out) {
  const ks = tl.keys;
  let i = 0;
  while (i < ks.length - 2 && ks[i + 1].t <= t) i++;
  const a = ks[i];
  const b = ks[Math.min(i + 1, ks.length - 1)];
  const span = b.t - a.t;
  let u = span > 0 ? Math.min(1, Math.max(0, (t - a.t) / span)) : 1;
  if (b.ease !== 'linear') u = smooth(u);
  out = out || { R: { pos: new THREE.Vector3(), quat: new THREE.Quaternion() }, L: { pos: new THREE.Vector3(), quat: new THREE.Quaternion() } };
  sampleHand(a.R, b.R, u, out.R);
  sampleHand(a.L, b.L, u, out.L);
  // label of the most recent labelled key
  let label;
  for (let j = i + (u >= 0.5 ? 1 : 0); j >= 0; j--) if (ks[j] && ks[j].label !== undefined) { label = ks[j].label; break; }
  out.label = label;
  out.brows = (u < 0.5 ? a.brows : b.brows) || 0;
  return out;
}

// --------------------------------------------------------------------------
// Avatar
// --------------------------------------------------------------------------
export class Avatar {
  constructor(container, { skin = 'brown' } = {}) {
    this.container = container;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xdfe6ef);
    this.root = new THREE.Group();
    this.scene.add(this.root);

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x6b7a90, 2.0));
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(-1.2, 2.6, 2.4);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0xbfd4ff, 0.8);
    rim.position.set(1.5, 1.8, -1.5);
    this.scene.add(rim);

    this.camera = new THREE.PerspectiveCamera(30, 1, 0.05, 20);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.enablePan = false;
    this.controls.minDistance = 0.6;
    this.controls.maxDistance = 3.5;

    this.skinMat = new THREE.MeshStandardMaterial({ color: SKIN_TONES[skin] || SKIN_TONES.brown, roughness: 0.62, side: THREE.DoubleSide });
    this.shirtMat = new THREE.MeshStandardMaterial({ color: 0x1d2740, roughness: 0.85, side: THREE.DoubleSide });
    this.darkMat = new THREE.MeshStandardMaterial({ color: 0x1a1410, roughness: 0.7, side: THREE.DoubleSide });
    this.whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, side: THREE.DoubleSide });

    this._buildBody();
    this.right = new Hand(1, this.skinMat);
    this.left = new Hand(-1, this.skinMat);
    this.root.add(this.right.root, this.left.root);
    this.arms = { R: this._buildArm(-1), L: this._buildArm(1) };

    this.trail = new THREE.Group();
    this.root.add(this.trail);

    this.timeline = null;
    this.time = 0;
    this.speed = 1;
    this.playing = false;
    this.loop = true;
    this.loopPause = 0.6;
    this.onLabel = null;
    this.onEnd = null;
    this._pose = null;
    this._lastLabel = null;

    this.setView('front');
    this.applyPose(this._restPose());

    this._resize = () => this.resize();
    this._ro = new ResizeObserver(this._resize);
    this._ro.observe(container);
    this.resize();

    this._clock = new THREE.Clock();
    this._loop = () => {
      this._raf = requestAnimationFrame(this._loop);
      const dt = Math.min(this._clock.getDelta(), 0.1);
      this._tick(dt);
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    };
    this._loop();
  }

  _buildBody() {
    const add = (geo, mat, pos, scale) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(...pos);
      if (scale) m.scale.set(...scale);
      this.root.add(m);
      return m;
    };
    // torso & shoulders (a solid dark top so the hands stand out, as interpreters wear)
    add(new THREE.CapsuleGeometry(0.15, 0.34, 8, 24), this.shirtMat, [0, 1.19, 0], [1.25, 1, 0.7]);
    add(new THREE.SphereGeometry(0.06, 20, 16), this.shirtMat, [-SHOULDER_X, SHOULDER_Y, 0]);
    add(new THREE.SphereGeometry(0.06, 20, 16), this.shirtMat, [SHOULDER_X, SHOULDER_Y, 0]);
    this.neck = add(new THREE.CylinderGeometry(0.045, 0.05, 0.1, 20), this.skinMat, [0, 1.51, 0]);

    // head
    const head = new THREE.Group();
    head.position.set(0, 1.62, 0);
    this.root.add(head);
    this.head = head;
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.1, 32, 24), this.skinMat);
    skull.scale.set(0.92, 1.12, 1);
    head.add(skull);
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.104, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), this.darkMat);
    hair.scale.set(0.94, 1.1, 1.03);
    hair.position.y = 0.012;
    hair.rotation.x = -0.25;
    head.add(hair);
    for (const s of [-1, 1]) {
      const eyeW = new THREE.Mesh(new THREE.SphereGeometry(0.014, 16, 12), this.whiteMat);
      eyeW.position.set(s * 0.034, 0.018, 0.086);
      eyeW.scale.set(1.2, 0.8, 0.5);
      head.add(eyeW);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.0075, 12, 10), this.darkMat);
      eye.position.set(s * 0.034, 0.018, 0.093);
      head.add(eye);
      const brow = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.006, 0.008), this.darkMat);
      brow.position.set(s * 0.035, 0.042, 0.092);
      brow.rotation.z = s * -0.12;
      head.add(brow);
      (this.brows ||= []).push(brow);
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.02, 12, 10), this.skinMat);
      ear.scale.set(0.5, 1.2, 0.9);
      ear.position.set(s * 0.093, 0.005, 0);
      head.add(ear);
    }
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.014, 12, 10), this.skinMat);
    nose.position.set(0, -0.005, 0.1);
    nose.scale.set(0.9, 1.1, 1);
    head.add(nose);
    const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.0035, 8, 20, Math.PI), new THREE.MeshStandardMaterial({ color: 0x6e2b2b, roughness: 0.6 }));
    mouth.position.set(0, -0.045, 0.088);
    mouth.rotation.z = Math.PI;
    head.add(mouth);
  }

  _buildArm(sx) {
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.043, UPPER, 6, 16), this.shirtMat);
    const fore = new THREE.Mesh(new THREE.CapsuleGeometry(0.036, FORE - 0.02, 6, 16), this.shirtMat);
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.03, 0.04, 16), this.skinMat);
    this.root.add(upper, fore, cuff);
    return { upper, fore, cuff, shoulder: new THREE.Vector3(sx * SHOULDER_X, SHOULDER_Y, 0), sx };
  }

  _placeLimb(mesh, a, b) {
    mesh.position.lerpVectors(a, b, 0.5);
    const dir = new THREE.Vector3().subVectors(b, a).normalize();
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  }

  _solveArm(arm, wrist) {
    const S = arm.shoulder;
    const d = new THREE.Vector3().subVectors(wrist, S);
    const len = Math.min(d.length(), UPPER + FORE - 0.002);
    const u = d.clone().normalize();
    // elbows point down, slightly back and out to the side
    const pole = new THREE.Vector3(arm.sx * 0.45, -1, -0.35);
    const v = pole.sub(u.clone().multiplyScalar(pole.dot(u))).normalize();
    const cosA = (UPPER * UPPER + len * len - FORE * FORE) / (2 * UPPER * len);
    const A = Math.acos(Math.max(-1, Math.min(1, cosA)));
    const elbow = S.clone().add(u.multiplyScalar(Math.cos(A) * UPPER)).add(v.multiplyScalar(Math.sin(A) * UPPER));
    const w = S.clone().add(d.normalize().multiplyScalar(len));
    this._placeLimb(arm.upper, S, elbow);
    // forearm ends a little before the wrist so the cuff shows
    const foreEnd = elbow.clone().lerp(w, 0.93);
    this._placeLimb(arm.fore, elbow, foreEnd);
    this._placeLimb(arm.cuff, foreEnd, w);
  }

  _restPose() {
    return sampleTimeline(buildTimeline([], { lead: 0, tail: 0, hold: 0 }), 0);
  }

  applyPose(pose) {
    this._pose = pose;
    for (const [side, hand] of [['R', this.right], ['L', this.left]]) {
      const p = pose[side];
      hand.setShape(p.shape);
      hand.root.quaternion.copy(p.quat);
      // place by palm centre
      const off = PALM_CENTER.clone().applyQuaternion(p.quat);
      hand.root.position.copy(p.pos).sub(off);
      this._solveArm(this.arms[side], hand.root.position);
    }
    const lift = (pose.brows || 0) * 0.012;
    if (this.brows) for (const b of this.brows) b.position.y = 0.042 + lift;
  }

  // ---------------- playback ----------------
  play(timeline, { autoplay = true, showTrail = this.showTrail, trace } = {}) {
    this.timeline = timeline;
    this.time = 0;
    this.playing = autoplay;
    this._lastLabel = null;
    this._trace = trace;
    this.setTrail(showTrail);
    this.applyPose(sampleTimeline(timeline, 0));
  }

  setTrail(on) {
    this.showTrail = !!on;
    this.trail.clear();
    if (!on || !this.timeline) return;
    const tl = this.timeline;
    const colors = { R: 0xff7a1a, L: 0x13a6c9 };
    for (const side of ['R', 'L']) {
      const pts = [];
      const N = Math.max(40, Math.round((tl.signEnd - tl.signStart) * 60));
      let moved = 0;
      let prev = null;
      for (let i = 0; i <= N; i++) {
        const t = tl.signStart + (i / N) * (tl.signEnd - tl.signStart);
        const pose = sampleTimeline(tl, t);
        const p = this._tracePoint(pose[side], side);
        if (prev) moved += p.distanceTo(prev);
        prev = p;
        pts.push(p);
      }
      if (moved < 0.03) continue; // hand barely moves: no trail
      const curve = new THREE.CatmullRomCurve3(pts);
      const mat = new THREE.MeshBasicMaterial({ color: colors[side], transparent: true, opacity: 0.75, depthTest: true });
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.min(400, N * 2), 0.0045, 8, false), mat);
      this.trail.add(tube);
      const end = pts[pts.length - 1];
      let k = pts.length - 2;
      while (k > 0 && pts[k].distanceTo(end) < 0.015) k--;
      const dir = new THREE.Vector3().subVectors(end, pts[k]).normalize();
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.035, 16), mat);
      cone.position.copy(end);
      cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      this.trail.add(cone);
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.009, 12, 10), mat);
      dot.position.copy(pts[0]);
      this.trail.add(dot);
    }
  }

  _tracePoint(handPose, side) {
    // point on the hand whose path is drawn: palm centre or a fingertip
    const local = { index: [0.03, 0.18, 0], pinky: [-0.029, 0.16, 0] }[this._trace] || [0, 0.06, 0.02];
    const v = new THREE.Vector3(side === 'L' ? -local[0] : local[0], local[1], local[2]);
    v.sub(PALM_CENTER).applyQuaternion(handPose.quat).add(handPose.pos);
    return v;
  }

  setPlaying(p) { this.playing = p; }
  setSpeed(s) { this.speed = s; }

  seek(t) {
    if (!this.timeline) return;
    this.time = Math.max(0, Math.min(t, this.timeline.duration));
    this._applyAt(this.time);
  }

  _applyAt(t) {
    const pose = sampleTimeline(this.timeline, t, this._scratch);
    this._scratch = pose;
    this.applyPose(pose);
    if (pose.label !== this._lastLabel) {
      this._lastLabel = pose.label;
      this.onLabel && this.onLabel(pose.label);
    }
  }

  _tick(dt) {
    if (!this.timeline || !this.playing) return;
    this.time += dt * this.speed;
    const total = this.timeline.duration + (this.loop ? this.loopPause : 0);
    if (this.time >= total) {
      if (this.loop) this.time = 0;
      else {
        this.time = this.timeline.duration;
        this.playing = false;
        this._applyAt(this.time);
        this.onEnd && this.onEnd();
        return;
      }
    }
    this._applyAt(Math.min(this.time, this.timeline.duration));
    this.onTime && this.onTime(this.time, this.timeline.duration);
  }

  // ---------------- view ----------------
  setView(view) {
    this.view = view;
    this.root.scale.x = view === 'mirror' ? -1 : 1;
    this.head.visible = view !== 'signer';
    this.neck.visible = view !== 'signer';
    const views = {
      front: { pos: [0, 1.44, 1.62], target: [0, 1.37, 0.12] },
      mirror: { pos: [0, 1.44, 1.62], target: [0, 1.37, 0.12] },
      side: { pos: [-1.75, 1.45, 0.75], target: [0, 1.36, 0.15] },
      signer: { pos: [0, 1.7, 0.0], target: [0, 1.3, 0.45] },
      hands: { pos: [0, 1.43, 1.2], target: [0, 1.41, 0.2] },
    };
    const v = views[view] || views.front;
    this.camera.position.set(...v.pos);
    this.controls.target.set(...v.target);
    this.camera.fov = view === 'signer' ? 68 : 30;
    this.camera.updateProjectionMatrix();
    this.controls.update();
  }

  setSkin(name) {
    this.skinMat.color.setHex(SKIN_TONES[name] || SKIN_TONES.brown);
  }

  resize() {
    const w = this.container.clientWidth || 300;
    const h = this.container.clientHeight || 300;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  dispose() {
    cancelAnimationFrame(this._raf);
    this._ro.disconnect();
    this.renderer.dispose();
  }
}

// --------------------------------------------------------------------------
// Small single-hand renderer used for letter cards and the practice target.
// --------------------------------------------------------------------------
export class HandSnapshot {
  constructor(size = 220, skin = 'brown') {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.renderer.setSize(size, size, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x6b7a90, 2.2));
    const dl = new THREE.DirectionalLight(0xffffff, 2.0);
    dl.position.set(1, 2, 3);
    this.scene.add(dl);
    this.mat = new THREE.MeshStandardMaterial({ color: SKIN_TONES[skin] || SKIN_TONES.brown, roughness: 0.62 });
    this.hand = new Hand(1, this.mat);
    this.scene.add(this.hand.root);
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.01, 10);
  }

  setSkin(name) { this.mat.color.setHex(SKIN_TONES[name] || SKIN_TONES.brown); }

  /** Render a handshape with the given finger direction / palm direction. */
  render(shapeName, dir = [0, 1, 0], palm = [0, 0, 1]) {
    const h = this.hand;
    h.setShape(getShape(shapeName));
    h.root.quaternion.copy(orientation(dir, palm));
    h.root.position.set(0, 0, 0);
    // centre the camera on the hand's bounding box
    h.root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(h.root);
    const c = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3()).length();
    const camDir = new THREE.Vector3(0.28, 0.12, 1).normalize();
    this.camera.position.copy(c).add(camDir.multiplyScalar(size * 2.1));
    this.camera.lookAt(c);
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL('image/png');
  }
}
