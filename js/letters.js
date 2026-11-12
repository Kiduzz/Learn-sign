// The ASL manual alphabet and a fingerspelling timeline builder.

import { pose, shift } from './poses.js';

const SPELL_POS = [-0.165, 1.37, 0.3];
const UP = [0, 1, 0];
const FWD = [0, 0, 1];

// Orientation for each letter: [fingerDirection, palmFacing]
const ORIENT = {
  default: [UP, [0.15, 0, 1]],
  C: [UP, [0.85, 0, 0.5]],
  O: [UP, [0.85, 0, 0.5]],
  E: [UP, [0.2, 0, 1]],
  G: [[1, 0, 0.35], [0, 0, -1]],
  H: [[1, 0, 0.35], [0, 0, -1]],
  P: [[0.25, -0.3, 0.92], [0, -1, 0.2]],
  Q: [[0.2, -1, 0.25], [0, 0, -1]],
  X: [UP, [0.5, 0, 1]],
};

export const LETTER_INFO = {
  A: 'Fist with the thumb straight up along the side of the index finger.',
  B: 'Four fingers straight up and together; thumb folded across the palm.',
  C: 'Curve all fingers and the thumb to make the shape of a C.',
  D: 'Index finger up; the other fingers curve to touch the thumb.',
  E: 'Fingertips bend down to rest on the thumb, which is tucked across the palm.',
  F: 'Index finger and thumb touch to make a circle; the other three fingers are up and spread.',
  G: 'Index finger and thumb point sideways, parallel to each other.',
  H: 'Index and middle finger together, pointing sideways.',
  I: 'Little finger up; the other fingers make a fist with the thumb across.',
  J: 'Make an I, then draw a J in the air with the little finger.',
  K: 'Index up, middle finger angled forward, thumb touches between them.',
  L: 'Index finger up and thumb out to the side, making an L.',
  M: 'Three fingers fold over the thumb.',
  N: 'Two fingers fold over the thumb.',
  O: 'All fingertips curve to touch the thumb, making an O.',
  P: 'Like K, but the hand points down and forward.',
  Q: 'Like G, but the index finger and thumb point down.',
  R: 'Cross the index and middle fingers.',
  S: 'Fist with the thumb across the front of the fingers.',
  T: 'Thumb tucked between the index and middle finger.',
  U: 'Index and middle finger up and together.',
  V: 'Index and middle finger up and apart, like a V.',
  W: 'Index, middle and ring fingers up and apart.',
  X: 'Index finger bent like a hook.',
  Y: 'Thumb and little finger out; the other fingers closed.',
  Z: 'Draw a Z in the air with the index finger.',
};

export const ALPHABET = Object.keys(LETTER_INFO);
export const MOTION_LETTERS = ['J', 'Z'];

export function letterOrientation(ch) {
  return ORIENT[ch] || ORIENT.default;
}

export function letterPose(ch, offset = [0, 0, 0]) {
  const [d, n] = letterOrientation(ch);
  return shift(pose(ch, SPELL_POS, d, n), offset);
}

/** Extra keys for the letters that move. Returns {keys, dur}. */
function motionKeys(ch, t, off) {
  if (ch === 'J') {
    const a = letterPose('J', off);
    return {
      dur: 0.75,
      keys: [
        { t, R: a, label: 'J' },
        { t: t + 0.3, R: shift(a, [0, -0.06, 0]), ease: 'linear' },
        { t: t + 0.55, R: shift(pose('J', a.p, UP, [-1, 0, 0.1]), [0.01, -0.08, -0.01]), ease: 'linear' },
        { t: t + 0.75, R: shift(pose('J', a.p, UP, [-0.3, 0, -1]), [0.03, -0.07, -0.02]), ease: 'smooth' },
      ],
    };
  }
  if (ch === 'Z') {
    const d = [0, 0.75, 0.66];
    const n = [0, -0.66, 0.75];
    const P = (x, y) => pose('Z', [SPELL_POS[0] + off[0] + x, SPELL_POS[1] + off[1] + y, SPELL_POS[2] + off[2]], d, n);
    // drawn as the signer sees it: top stroke, diagonal, bottom stroke
    return {
      dur: 1.0,
      keys: [
        { t, R: P(0.04, 0.03), label: 'Z' },
        { t: t + 0.25, R: P(-0.04, 0.03), ease: 'linear' },
        { t: t + 0.6, R: P(0.04, -0.05), ease: 'linear' },
        { t: t + 0.85, R: P(-0.04, -0.05), ease: 'linear' },
        { t: t + 1.0, R: P(-0.04, -0.05) },
      ],
    };
  }
  return null;
}

/** Keyframes that fingerspell a word (letters A-Z only). */
export function spellKeys(word, { hold = 0.45, move = 0.28 } = {}) {
  const letters = word.toUpperCase().replace(/[^A-Z]/g, '').split('');
  const keys = [];
  let t = 0;
  letters.forEach((ch, i) => {
    // repeated letters slide a little to the side so they can be seen as two
    const off = i > 0 && letters[i - 1] === ch ? [-0.045, 0, 0] : [0, 0, 0];
    const m = motionKeys(ch, t, off);
    if (m) {
      keys.push(...m.keys.map((k) => ({ ...k, label: `${i}:${ch}` })));
      t += m.dur + move;
    } else {
      const p = letterPose(ch, off);
      keys.push({ t, R: p, label: `${i}:${ch}` });
      keys.push({ t: t + hold, R: p, label: `${i}:${ch}` });
      t += hold + move;
    }
  });
  return { keys, letters };
}
