// Rule-based fingerspelling checker.
//
// Input: 21 hand landmarks (MediaPipe order) as {x,y,z} or [x,y,z] in a
// y-up coordinate frame. Output: for a target letter, a list of checks, each
// with a pass/fail flag and a short hint the student can act on.
//
// This is a learning aid, not a full sign recogniser: it checks the parts of a
// handshape that are easy to see (which fingers are open or closed, where the
// thumb is, where the hand points). Motion letters J and Z are not checked.

const v = (p) => (Array.isArray(p) ? { x: p[0], y: p[1], z: p[2] } : p);
const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const len = (a) => Math.sqrt(dot(a, a));
const norm = (a) => { const l = len(a) || 1; return { x: a.x / l, y: a.y / l, z: a.z / l }; };
const cross = (a, b) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
const scale = (a, s) => ({ x: a.x * s, y: a.y * s, z: a.z * s });
const angle = (a, b) => (Math.acos(Math.max(-1, Math.min(1, dot(norm(a), norm(b))))) * 180) / Math.PI;
const dist = (a, b) => len(sub(a, b));

const FINGER_IDX = { thumb: [1, 2, 3, 4], index: [5, 6, 7, 8], middle: [9, 10, 11, 12], ring: [13, 14, 15, 16], pinky: [17, 18, 19, 20] };
export const FINGER_NAMES = ['index', 'middle', 'ring', 'pinky'];

/**
 * Compute handshape features.
 * flip: mirror the palm frame (use for a left hand, or when unsure try both).
 */
export function features(landmarks, flip = false) {
  const P = landmarks.map(v);
  const wrist = P[0];
  const L = dist(wrist, P[9]) || 1; // palm length
  const yAxis = norm(sub(P[9], wrist));
  let xRaw = sub(P[5], P[17]);
  let xAxis = norm(sub(xRaw, scale(yAxis, dot(xRaw, yAxis))));
  let zAxis = cross(xAxis, yAxis); // palm side for a right hand
  if (flip) zAxis = scale(zAxis, -1);
  const local = (p) => { const d = sub(p, wrist); return { x: dot(d, xAxis) / L, y: dot(d, yAxis) / L, z: dot(d, zAxis) / L }; };

  const curl = {};
  for (const f of FINGER_NAMES) {
    const [a, b, c, d] = FINGER_IDX[f].map((i) => P[i]);
    curl[f] = angle(sub(a, wrist), sub(b, a)) + angle(sub(b, a), sub(c, b)) + angle(sub(c, b), sub(d, c));
  }
  const tips = Object.fromEntries(Object.entries(FINGER_IDX).map(([f, ids]) => [f, local(P[ids[3]])]));
  const mcps = Object.fromEntries(FINGER_NAMES.map((f) => [f, local(P[FINGER_IDX[f][0]])]));
  const thumb = tips.thumb;
  // thumb tip across the palm: 0 = at the index knuckle, 1 = at the little-finger knuckle
  const across = (mcps.index.x - thumb.x) / ((mcps.index.x - mcps.pinky.x) || 1);
  const dTip = (a, b) => dist(P[FINGER_IDX[a][3]], P[FINGER_IDX[b][3]]) / L;
  const thumbBend = angle(sub(P[2], P[1]), sub(P[4], P[3]));

  return {
    curl,
    thumb,
    across,
    thumbOut: angle(sub(P[4], P[2]), yAxis), // ~0 along the fingers, ~90 out to the side
    thumbBend,
    touch: { index: dTip('thumb', 'index'), middle: dTip('thumb', 'middle'), ring: dTip('thumb', 'ring'), pinky: dTip('thumb', 'pinky') },
    spreadIM: dTip('index', 'middle'),
    spreadMR: dTip('middle', 'ring'),
    crossIM: tips.index.x - tips.middle.x, // < 0 when index and middle cross
    point: yAxis, // world direction the hand points (y up)
    tips,
    mcps,
  };
}

// --- finger state helpers -------------------------------------------------
const STRAIGHT = 60;
const CLOSED = 150;
const straight = (F, f) => [F.curl[f] < STRAIGHT, `Straighten your ${f} finger`];
const closed = (F, f) => [F.curl[f] > CLOSED, `Fold your ${f} finger down`];
const curved = (F, f, lo = 45, hi = 205) => [F.curl[f] > lo && F.curl[f] < hi, F.curl[f] <= lo ? `Bend your ${f} finger more` : `Open your ${f} finger a little`];
const allClosed = (F, list = FINGER_NAMES) => list.map((f) => closed(F, f));
// fully folded into the palm: closed, and the fingertip has dropped below the knuckle
const fist = (F, f) => [F.curl[f] > CLOSED && F.tips[f].y < F.mcps[f].y - 0.1, `Fold your ${f} finger all the way down`];
const allStraight = (F, list = FINGER_NAMES) => list.map((f) => straight(F, f));
const pointsUp = (F) => [F.point.y > 0.55, 'Point your fingers up'];
const pointsSide = (F) => [Math.abs(F.point.y) < 0.6, 'Turn your hand so the fingers point sideways'];
const pointsDown = (F) => [F.point.y < -0.2, 'Point your hand down'];
const thumbOut = (F) => [F.thumbOut > 50 && F.thumb.x > F.mcps.index.x + 0.15, 'Stick your thumb out to the side'];
const thumbIn = (F) => [F.thumb.x < F.mcps.index.x + 0.12, 'Fold your thumb in'];
const thumbFront = (F) => [F.thumb.z > 0.18 && F.across > 0.15, 'Lay your thumb across the front of your fingers'];
const together = (F) => [F.spreadIM < 0.32, 'Keep the index and middle fingers together'];
const apart = (F) => [F.spreadIM > 0.3, 'Spread the index and middle fingers apart'];

export const RULES = {
  A: (F) => [...FINGER_NAMES.map((f) => fist(F, f)), [F.across < 0.02 && F.thumb.y > 0.45 && F.thumb.z < 0.4, 'Put your thumb straight up beside your index finger'], pointsUp(F)],
  B: (F) => [...allStraight(F), together(F), [F.thumb.x < F.mcps.index.x + 0.05, 'Fold your thumb across your palm'], pointsUp(F)],
  C: (F) => [...FINGER_NAMES.map((f) => curved(F, f, 50, 150)), [F.touch.index > 0.35, 'Leave a gap between thumb and fingers, like a C'], [F.thumb.z > 0.25, 'Curve your thumb forward'], pointsUp(F)],
  E: (F) => [...FINGER_NAMES.map((f) => curved(F, f, 150, 260)), [F.thumb.y < 0.7 && F.across > 0.2, 'Tuck your thumb low across your palm, under the fingertips'], pointsUp(F)],
  F: (F) => [[F.touch.index < 0.3, 'Touch your thumb and index fingertips together'], ...allStraight(F, ['middle', 'ring', 'pinky']), pointsUp(F)],
  G: (F) => [straight(F, 'index'), ...allClosed(F, ['middle', 'ring', 'pinky']), [F.thumbBend < 50 && F.thumb.y > 0.75, 'Point your thumb the same way as your index'], pointsSide(F)],
  H: (F) => [straight(F, 'index'), straight(F, 'middle'), closed(F, 'ring'), closed(F, 'pinky'), together(F), pointsSide(F)],
  I: (F) => [closed(F, 'index'), closed(F, 'middle'), closed(F, 'ring'), straight(F, 'pinky'), thumbIn(F), pointsUp(F)],
  K: (F) => [straight(F, 'index'), [F.curl.middle < 110, 'Straighten your middle finger (angled forward)'], closed(F, 'ring'), closed(F, 'pinky'), [F.thumb.y > 1.0, 'Put your thumb up between the index and middle fingers'], pointsUp(F)],
  L: (F) => [straight(F, 'index'), ...allClosed(F, ['middle', 'ring', 'pinky']), thumbOut(F), pointsUp(F)],
  M: (F) => [fist(F, 'index'), ...allClosed(F, ['middle', 'ring', 'pinky']), [F.across > 0.72 && F.thumb.y > 0.85, 'Tuck your thumb under three fingers (near the little finger)'], pointsUp(F)],
  N: (F) => [fist(F, 'index'), ...allClosed(F, ['middle', 'ring', 'pinky']), [F.across > 0.3 && F.across <= 0.72 && F.thumb.y > 0.88, 'Tuck your thumb under two fingers'], pointsUp(F)],
  O: (F) => [...FINGER_NAMES.map((f) => curved(F, f, 90, 200)), [F.touch.index < 0.32, 'Touch your fingertips to your thumb to make an O'], pointsUp(F)],
  P: (F) => [straight(F, 'index'), [F.curl.middle < 110, 'Straighten your middle finger'], closed(F, 'ring'), closed(F, 'pinky'), pointsDown(F)],
  Q: (F) => [straight(F, 'index'), ...allClosed(F, ['middle', 'ring', 'pinky']), pointsDown(F)],
  R: (F) => [straight(F, 'index'), straight(F, 'middle'), closed(F, 'ring'), closed(F, 'pinky'), [F.crossIM < 0.02, 'Cross your middle finger over your index finger'], pointsUp(F)],
  S: (F) => [...FINGER_NAMES.map((f) => fist(F, f)), thumbFront(F), [F.thumb.y > 0.68 && F.thumb.y < 0.88, F.thumb.y >= 0.88 ? 'Lower your thumb so it lies across the front of your fingers' : 'Raise your thumb so it lies across the front of your fingers'], pointsUp(F)],
  T: (F) => [...allClosed(F), [F.across > 0.0 && F.across < 0.38 && F.thumb.y > 0.95, 'Push your thumb up between your index and middle fingers'], pointsUp(F)],
  U: (F) => [straight(F, 'index'), straight(F, 'middle'), closed(F, 'ring'), closed(F, 'pinky'), together(F), [F.thumb.y < 1.0, 'Fold your thumb down over the other fingers'], [F.crossIM > -0.02, 'Do not cross your fingers'], pointsUp(F)],
  V: (F) => [straight(F, 'index'), straight(F, 'middle'), closed(F, 'ring'), closed(F, 'pinky'), apart(F), [F.thumb.y < 1.0, 'Fold your thumb down over the other fingers'], pointsUp(F)],
  W: (F) => [straight(F, 'index'), straight(F, 'middle'), straight(F, 'ring'), closed(F, 'pinky'), [F.spreadIM > 0.2 && F.spreadMR > 0.2, 'Spread your three fingers apart'], pointsUp(F)],
  X: (F) => [curved(F, 'index', 100, 220), ...['middle', 'ring', 'pinky'].map((f) => fist(F, f)), [F.tips.index.y > F.mcps.index.y, 'Hook your index finger up like a hook, not into a fist'], pointsUp(F)],
  Y: (F) => [...allClosed(F, ['index', 'middle', 'ring']), straight(F, 'pinky'), thumbOut(F)],
};
// D: the other fingers curve round to touch the thumb.
RULES.D = (F) => [straight(F, 'index'), ...['middle', 'ring', 'pinky'].map((f) => curved(F, f, 100, 270)), [F.touch.middle < 0.42, 'Touch your thumb to your middle finger'], pointsUp(F)];

export const CHECKABLE = Object.keys(RULES);

/** Check landmarks against a letter. Tries both palm chiralities and keeps the better one. */
export function check(letter, landmarks, { handedness } = {}) {
  const rule = RULES[letter];
  if (!rule) return null;
  // handedness is the signer's real hand ('Right' / 'Left'); unknown -> try both palm frames
  const flips = handedness === 'Left' ? [true] : handedness === 'Right' ? [false] : [false, true];
  let best = null;
  for (const flip of flips) {
    const F = features(landmarks, flip);
    const items = rule(F).map(([ok, hint]) => ({ ok: !!ok, hint }));
    const score = items.filter((i) => i.ok).length / items.length;
    if (!best || score > best.score) best = { score, items, features: F };
  }
  best.match = best.items.every((i) => i.ok);
  return best;
}

/** Which checkable letters match these landmarks (used for testing / free practice). */
export function recognise(landmarks, opts) {
  return CHECKABLE.filter((l) => check(l, landmarks, opts).match);
}
