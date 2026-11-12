// Pose helpers shared by the sign and letter definitions.
//
// A hand pose is { s: handshape, p: [x,y,z], d: fingerDirection, n: palmFacing }
// in world coordinates (metres). The signer faces +z (toward you).
// The signer's RIGHT hand is on -x, their LEFT on +x. p is the palm centre.

import { orientation, tipOffset } from './hand.js';

export const pose = (s, p, d, n) => ({ s, p, d, n });

/** Mirror a pose to the other hand (reflect across the body midline). */
export const mirrorPose = (h) => ({ s: h.s, p: [-h.p[0], h.p[1], h.p[2]], d: [-h.d[0], h.d[1], h.d[2]], n: [-h.n[0], h.n[1], h.n[2]] });

/**
 * Pose a hand so that a contact point (fingertip etc.) sits exactly at `at`.
 * side: 'R' or 'L'.
 */
export function touch(s, point, at, d, n, side = 'R') {
  const off = tipOffset(s, point);
  if (side === 'L') off.x = -off.x;
  off.applyQuaternion(orientation(d, n));
  return pose(s, [at[0] - off.x, at[1] - off.y, at[2] - off.z], d, n);
}

/** Move a pose by dx,dy,dz (optionally change handshape or orientation). */
export const shift = (h, [dx = 0, dy = 0, dz = 0], over = {}) => ({ ...h, p: [h.p[0] + dx, h.p[1] + dy, h.p[2] + dz], ...over });

/** Hands at rest: loosely in front of the waist. */
export const REST_R = pose('REST', [-0.13, 1.0, 0.2], [0.45, -0.15, 0.88], [0.35, 1, 0]);
export const REST_L = mirrorPose(REST_R);

// Body landmarks (world coordinates, slightly in front of the surface)
export const BODY = {
  forehead: [0, 1.705, 0.102],
  temple: [-0.07, 1.68, 0.085],
  eye: [-0.034, 1.638, 0.1],
  nose: [0, 1.615, 0.118],
  mouth: [0, 1.575, 0.104],
  chin: [0, 1.53, 0.098],
  cheek: [-0.075, 1.6, 0.075],
  ear: [-0.098, 1.625, 0.02],
  chest: [0, 1.33, 0.125],
  neutral: [-0.11, 1.28, 0.32],
};

/** Keys for a circle traced by a hand pose (plane: 'xy' facing you, 'yz' side, 'xz' flat). */
export function circleKeys(h, { t0 = 0, dur = 1, r = 0.05, loops = 1, plane = 'xy', clockwise = true, phase = 90, steps = 12, side = 'R', withOther } = {}) {
  const keys = [];
  const n = Math.round(steps * loops);
  for (let i = 0; i <= n; i++) {
    const a = ((phase + (clockwise ? -1 : 1) * (360 * loops * i) / n) * Math.PI) / 180;
    const c = Math.cos(a) * r;
    const s = Math.sin(a) * r;
    const off = plane === 'xy' ? [c, s, 0] : plane === 'yz' ? [0, s, c] : [c, 0, s];
    const k = { t: t0 + (dur * i) / n, ease: i === 0 ? 'smooth' : 'linear' };
    k[side] = shift(h, off);
    if (withOther) Object.assign(k, withOther(i, n, a));
    keys.push(k);
  }
  return keys;
}
