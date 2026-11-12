// 3D articulated hand model and the library of handshapes.
//
// Local hand frame (right hand):
//   +y  = direction the fingers point when straight
//   +z  = the palm side (fingers curl toward +z)
//   +x  = the thumb side
// The left hand is the exact mirror image (thumb on -x).

import * as THREE from 'three';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';

export const FINGERS = ['index', 'middle', 'ring', 'pinky'];

const BASE = { index: [0.030, 0.088], middle: [0.010, 0.092], ring: [-0.010, 0.089], pinky: [-0.029, 0.082] };
const LEN = { index: [0.045, 0.027, 0.022], middle: [0.050, 0.030, 0.024], ring: [0.047, 0.028, 0.023], pinky: [0.036, 0.022, 0.020] };
const RAD = { index: 0.0094, middle: 0.0097, ring: 0.0091, pinky: 0.0080 };
const THUMB_BASE = [0.026, 0.016, 0.004];
const THUMB_LEN = [0.042, 0.032, 0.027];
const THUMB_RAD = [0.0135, 0.0108, 0.0100];

/** Point in the hand frame at the centre of the palm (used to place hands). */
export const PALM_CENTER = new THREE.Vector3(0, 0.05, 0);

// ---------------------------------------------------------------------------
// Handshapes. Finger values: [mcp, pip, dip] flexion in degrees, plus optional
// spread (degrees, + = toward thumb side). Thumb: [rz, rx, ry, mcp, ip]
//   rz: swing in the palm plane (- = away from fingers, + = across the palm)
//   rx: lift out of the palm plane toward the palm side
//   ry: twist,  mcp/ip: bend of the two thumb joints
// ---------------------------------------------------------------------------
const STRAIGHT = [0, 0, 0];
const FIST = [88, 102, 62];
const T_OUT = [-62, 6, 0, 0, 0];           // thumb sticking out to the side
// Thumb positions given as a target for the thumb tip (hand-local metres);
// the joint angles are solved automatically (see solveThumb below).
const at = (x, y, z) => ({ at: [x, y, z] });
const T_OVER = at(-0.004, 0.074, 0.064);   // across the front of curled fingers (S, I, U, V ...)
const T_SIDE = at(0.044, 0.088, 0.022);    // straight up along the side of the index (A)
const T_PALM = at(-0.008, 0.056, 0.026);   // folded flat across the palm (B)

const S = (index, middle, ring, pinky, thumb, spread = [0, 0, 0, 0]) => ({
  fingers: { index, middle, ring, pinky }, spread: { index: spread[0], middle: spread[1], ring: spread[2], pinky: spread[3] }, thumb,
});

export const SHAPES = {
  A: S(FIST, FIST, FIST, FIST, T_SIDE),
  B: S(STRAIGHT, STRAIGHT, STRAIGHT, STRAIGHT, T_PALM),
  C: S([30, 42, 28], [30, 42, 28], [30, 42, 28], [32, 42, 28], at(0.034, 0.062, 0.074)),
  D: S(STRAIGHT, [55, 85, 50], [58, 85, 50], [60, 85, 50], at(0.016, 0.074, 0.068)),
  E: S([30, 100, 75], [30, 100, 75], [30, 100, 75], [32, 100, 75], at(-0.004, 0.058, 0.032)),
  F: S([48, 62, 38], STRAIGHT, STRAIGHT, STRAIGHT, at(0.032, 0.088, 0.078), [0, -2, -7, -14]),
  G: S(STRAIGHT, FIST, FIST, FIST, at(0.040, 0.118, 0.026)),
  H: S(STRAIGHT, STRAIGHT, FIST, FIST, T_OVER),
  I: S(FIST, FIST, FIST, STRAIGHT, T_OVER),
  K: S(STRAIGHT, [48, 0, 0], FIST, FIST, at(0.020, 0.112, 0.034), [6, -6, 0, 0]),
  L: S(STRAIGHT, FIST, FIST, FIST, T_OUT),
  M: S([80, 98, 45], [80, 98, 45], [80, 98, 45], FIST, at(-0.022, 0.088, 0.046)),
  N: S([80, 98, 45], [80, 98, 45], FIST, FIST, at(-0.002, 0.090, 0.046)),
  O: S([42, 62, 42], [42, 62, 42], [44, 62, 42], [46, 62, 42], at(0.028, 0.092, 0.076)),
  R: S([0, 0, 0], [10, 0, 0], FIST, FIST, T_OVER, [-9, 11, 0, 0]),
  S: S(FIST, FIST, FIST, FIST, T_OVER),
  T: S([70, 92, 50], FIST, FIST, FIST, at(0.022, 0.100, 0.042)),
  U: S(STRAIGHT, STRAIGHT, FIST, FIST, T_OVER),
  V: S(STRAIGHT, STRAIGHT, FIST, FIST, T_OVER, [10, -10, 0, 0]),
  W: S(STRAIGHT, STRAIGHT, STRAIGHT, [80, 100, 60], at(-0.020, 0.062, 0.040), [10, 0, -10, 0]),
  X: S([12, 95, 60], FIST, FIST, FIST, T_OVER),
  Y: S(FIST, FIST, FIST, STRAIGHT, T_OUT, [0, 0, 0, -18]),

  // Handshapes used in signs (not letters)
  ONE: S(STRAIGHT, FIST, FIST, FIST, T_OVER),
  FIVE: S(STRAIGHT, STRAIGHT, STRAIGHT, STRAIGHT, [-50, 8, 0, 0, 0], [16, 4, -8, -20]),
  FLAT: S(STRAIGHT, STRAIGHT, STRAIGHT, STRAIGHT, [-8, 4, 0, 0, 0]),
  FLAT_O: S([58, 12, 8], [58, 12, 8], [58, 12, 8], [58, 12, 8], at(0.024, 0.118, 0.090)),
  ILY: S(STRAIGHT, FIST, FIST, STRAIGHT, T_OUT, [0, 0, 0, -16]),
  NO_OPEN: S([20, 0, 0], [20, 0, 0], FIST, FIST, at(0.052, 0.080, 0.075)),
  NO_CLOSED: S([55, 25, 15], [55, 25, 15], FIST, FIST, at(0.026, 0.114, 0.092)),
  CLAW: S([25, 70, 50], [25, 70, 50], [25, 70, 50], [25, 70, 50], [-40, 40, 0, 20, 20], [14, 4, -8, -18]),
  REST: S([18, 22, 12], [20, 24, 12], [22, 26, 12], [24, 28, 14], [-12, 18, 0, 8, 6], [2, 0, -2, -4]),
};

// Letters that share a handshape and differ by movement or orientation.
SHAPES.J = SHAPES.I;
SHAPES.Z = SHAPES.ONE;
SHAPES.P = SHAPES.K;
SHAPES.Q = SHAPES.G;

export function getShape(name) {
  const s = SHAPES[name];
  if (!s) throw new Error('Unknown handshape ' + name);
  if (!Array.isArray(s.thumb)) s.thumb = solveThumb(s.thumb.at);
  return s;
}

/** Linear blend between two handshapes. */
export function blendShapes(a, b, u) {
  const L = (x, y) => x + (y - x) * u;
  const out = { fingers: {}, spread: {}, thumb: a.thumb.map((v, i) => L(v, b.thumb[i])) };
  for (const f of FINGERS) {
    out.fingers[f] = a.fingers[f].map((v, i) => L(v, b.fingers[f][i]));
    out.spread[f] = L(a.spread[f], b.spread[f]);
  }
  return out;
}

const D2R = Math.PI / 180;

// ---------------------------------------------------------------------------
// Hand mesh
// ---------------------------------------------------------------------------
export class Hand {
  /** side: 1 = right hand, -1 = left hand */
  constructor(side, material) {
    this.side = side;
    this.root = new THREE.Group();
    this.joints = {};
    this.landmarks = {}; // Object3Ds whose world positions mirror MediaPipe's 21 landmarks

    const palm = new THREE.Mesh(new RoundedBoxGeometry(0.080, 0.094, 0.028, 4, 0.012), material);
    palm.position.set(0, 0.046, 0);
    this.root.add(palm);
    // a soft heel of the palm / thenar pad
    const heel = new THREE.Mesh(new THREE.SphereGeometry(0.022, 20, 14), material);
    heel.scale.set(1.15, 1.0, 0.7);
    heel.position.set(side * 0.014, 0.022, 0.006);
    this.root.add(heel);

    this.landmarks.wrist = this._marker(this.root, 0, 0, 0);

    for (const f of FINGERS) {
      const [bx, by] = BASE[f];
      let parent = this.root;
      const chain = [];
      const marks = [];
      for (let i = 0; i < 3; i++) {
        const g = new THREE.Group();
        g.rotation.order = 'ZXY';
        if (i === 0) g.position.set(side * bx, by, 0);
        else g.position.set(0, LEN[f][i - 1], 0);
        parent.add(g);
        const r = RAD[f] * (1 - i * 0.08);
        const seg = new THREE.Mesh(new THREE.CapsuleGeometry(r, LEN[f][i] - r * 0.6, 6, 14), material);
        seg.position.y = LEN[f][i] / 2;
        g.add(seg);
        marks.push(this._marker(g, 0, 0, 0));
        chain.push(g);
        parent = g;
      }
      marks.push(this._marker(parent, 0, LEN[f][2], 0));
      this.joints[f] = chain;
      this.landmarks[f] = marks; // [mcp, pip, dip, tip]
    }

    // thumb
    {
      let parent = this.root;
      const chain = [];
      const marks = [];
      for (let i = 0; i < 3; i++) {
        const g = new THREE.Group();
        g.rotation.order = 'ZXY';
        if (i === 0) g.position.set(side * THUMB_BASE[0], THUMB_BASE[1], THUMB_BASE[2]);
        else g.position.set(0, THUMB_LEN[i - 1], 0);
        parent.add(g);
        const r = THUMB_RAD[i];
        const seg = new THREE.Mesh(new THREE.CapsuleGeometry(r, THUMB_LEN[i] - r * 0.5, 6, 14), material);
        seg.position.y = THUMB_LEN[i] / 2;
        g.add(seg);
        marks.push(this._marker(g, 0, 0, 0));
        chain.push(g);
        parent = g;
      }
      marks.push(this._marker(parent, 0, THUMB_LEN[2], 0));
      this.joints.thumb = chain;
      this.landmarks.thumb = marks; // [cmc, mcp, ip, tip]
    }
  }

  _marker(parent, x, y, z) {
    const o = new THREE.Object3D();
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  }

  /** Pose the fingers to a handshape object (from SHAPES or blendShapes). */
  setShape(shape) {
    const m = this.side; // mirror: z/y rotations flip sign for the left hand
    for (const f of FINGERS) {
      const [a, b, c] = shape.fingers[f];
      const j = this.joints[f];
      j[0].rotation.set(a * D2R, 0, -m * shape.spread[f] * D2R);
      j[1].rotation.set(b * D2R, 0, 0);
      j[2].rotation.set(c * D2R, 0, 0);
    }
    this.setThumb(shape.thumb);
  }

  setThumb([rz, rx, ry, mcp, ip]) {
    const m = this.side;
    const t = this.joints.thumb;
    t[0].rotation.set(rx * D2R, m * ry * D2R, m * rz * D2R);
    t[1].rotation.set(mcp * 0.35 * D2R, 0, m * mcp * D2R);
    t[2].rotation.set(ip * 0.35 * D2R, 0, m * ip * D2R);
  }

  /**
   * World positions of the 21 hand landmarks in MediaPipe order:
   * 0 wrist, 1-4 thumb, 5-8 index, 9-12 middle, 13-16 ring, 17-20 pinky.
   */
  getLandmarks() {
    this.root.updateWorldMatrix(true, true);
    const p = (o) => o.getWorldPosition(new THREE.Vector3());
    const L = this.landmarks;
    return [p(L.wrist), ...L.thumb.map(p), ...L.index.map(p), ...L.middle.map(p), ...L.ring.map(p), ...L.pinky.map(p)];
  }
}

/**
 * Build a rotation that points the fingers along `dir` with the palm facing
 * `palm` (both world vectors). The palm vector is orthogonalised against dir.
 */
export function orientation(dir, palm) {
  const y = new THREE.Vector3(...dir).normalize();
  const z = new THREE.Vector3(...palm);
  z.sub(y.clone().multiplyScalar(z.dot(y))).normalize();
  const x = new THREE.Vector3().crossVectors(y, z);
  const m = new THREE.Matrix4().makeBasis(x, y, z);
  return new THREE.Quaternion().setFromRotationMatrix(m);
}

// ---------------------------------------------------------------------------
// Thumb solver: find thumb joint angles that put the thumb tip at a target
// point, without the thumb passing through the palm. Coordinate descent on
// four angles; runs once per handshape and is cached.
// ---------------------------------------------------------------------------
let solverHand = null;
function solveThumb(target) {
  if (!solverHand) solverHand = new Hand(1, new THREE.MeshBasicMaterial());
  const h = solverHand;
  h.root.position.set(0, 0, 0);
  h.root.quaternion.identity();
  const tgt = new THREE.Vector3(...target);
  const pts = [...h.landmarks.thumb];
  const v = new THREE.Vector3();
  const cost = (a) => {
    h.setThumb([a[0], a[1], 0, a[2], a[3]]);
    h.root.updateMatrixWorld(true);
    pts[3].getWorldPosition(v);
    let c = v.distanceToSquared(tgt) * 1e4;
    // keep joints (and the tip) out of the palm block
    for (let i = 1; i < 4; i++) {
      pts[i].getWorldPosition(v);
      const inside = Math.abs(v.x) < 0.046 && v.y > 0 && v.y < 0.098;
      if (inside && v.z < 0.026) c += (0.026 - v.z) * 40;
    }
    // prefer natural joint ranges
    if (a[2] < -10 || a[2] > 70) c += 0.5;
    if (a[3] < -10 || a[3] > 80) c += 0.5;
    return c;
  };
  // several starting guesses; keep the best local optimum
  let best = null;
  let bc = Infinity;
  for (const start of [[10, 40, 15, 10], [30, 50, 30, 20], [-20, 30, 10, 10], [50, 60, 40, 30]]) {
    const r = descend(cost, start);
    if (r.c < bc) { bc = r.c; best = r.a; }
  }
  return [best[0], best[1], 0, best[2], best[3]];
}

function descend(cost, start) {
  let best = start.slice();
  let bc = cost(best);
  for (const step of [16, 8, 4, 2, 1, 0.5]) {
    let improved = true;
    while (improved) {
      improved = false;
      for (let i = 0; i < 4; i++) {
        for (const d of [step, -step]) {
          const cand = best.slice();
          cand[i] += d;
          const c = cost(cand);
          if (c < bc) { bc = c; best = cand; improved = true; }
        }
      }
    }
  }
  return { a: best, c: bc };
}

/**
 * Offset (right-hand local frame, relative to PALM_CENTER) of a contact point
 * on a handshape: 'index' | 'middle' | 'pinky' | 'thumb' fingertip, or
 * 'bunch' (where the fingertips meet in O / flat-O shapes).
 */
const tipCache = new Map();
export function tipOffset(shapeName, point = 'index') {
  const key = shapeName + ':' + point;
  if (tipCache.has(key)) return tipCache.get(key).clone();
  if (!solverHand) solverHand = new Hand(1, new THREE.MeshBasicMaterial());
  const h = solverHand;
  h.root.position.set(0, 0, 0);
  h.root.quaternion.identity();
  h.setShape(getShape(shapeName));
  h.root.updateMatrixWorld(true);
  const tip = (f) => h.landmarks[f][3].getWorldPosition(new THREE.Vector3());
  let v;
  if (point === 'bunch') v = tip('index').add(tip('middle')).add(tip('thumb')).multiplyScalar(1 / 3);
  else v = tip(point);
  v.sub(PALM_CENTER);
  tipCache.set(key, v.clone());
  return v;
}
