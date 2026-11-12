// Sign library (American Sign Language, common citation forms).
//
// Every sign is described by the four parameters teachers use:
//   handshape, location, movement and palm orientation,
// plus keyframes the 3D signer performs. Times are in seconds at normal speed.
// Many signs have regional or personal variants; these are one common form.

import { pose, touch, shift, mirrorPose, circleKeys, BODY } from './poses.js';

const UP = [0, 1, 0];
const DOWN = [0, -1, 0];
const FWD = [0, 0, 1];
const BACK = [0, 0, -1];
const TO_LEFT = [1, 0, 0];   // toward the signer's left (the body midline, for the right hand)
const TO_RIGHT = [-1, 0, 0];

// Left "base" hand, flat with palm up, fingers pointing forward-right
const BASE_PALM_UP = pose('FLAT', [0.03, 1.2, 0.3], [-0.45, 0, 0.9], UP);

export const CATEGORIES = [
  { id: 'greetings', name: 'Greetings & manners' },
  { id: 'questions', name: 'Questions & answers' },
  { id: 'school', name: 'School' },
  { id: 'daily', name: 'Daily needs' },
  { id: 'people', name: 'People' },
];

function sign(def) {
  return { trace: 'palm', ...def };
}

export const SIGNS = [
  // ------------------------------------------------------------ greetings
  (() => {
    const start = touch('B', 'index', [-0.035, 1.695, 0.108], [0.78, 0.62, 0], [0, -0.25, 1]);
    return sign({
      id: 'hello', gloss: 'HELLO', english: 'Hello / Hi', category: 'greetings',
      how: { handshape: 'B (flat hand, thumb folded in)', location: 'Fingertips at the side of the forehead', movement: 'Move the hand out and away, like a small salute', palm: 'Facing forward' },
      tip: 'Keep the fingers together. The movement is smooth and friendly, not sharp.',
      keys: [
        { t: 0, R: start },
        { t: 0.25, R: start },
        { t: 0.85, R: pose('B', [-0.3, 1.6, 0.3], [0.35, 0.8, 0.3], [0, -0.1, 1]) },
      ],
    });
  })(),
  (() => {
    const start = touch('FLAT', 'middle', [-0.01, 1.535, 0.11], UP, BACK);
    return sign({
      id: 'thank-you', gloss: 'THANK-YOU', english: 'Thank you', category: 'greetings',
      how: { handshape: 'Flat hand', location: 'Fingertips start at the chin', movement: 'Move the hand forward and down toward the person you thank', palm: 'Toward you, ending facing up' },
      tip: 'Add a nod and a smile; your face is part of the sign.',
      keys: [
        { t: 0, R: start },
        { t: 0.25, R: start },
        { t: 0.9, R: pose('FLAT', [-0.06, 1.36, 0.36], [0, 0.45, 1], [0, 1, -0.45]) },
      ],
    });
  })(),
  (() => {
    const h = pose('FLAT', [-0.03, 1.33, 0.155], [0.7, 0.7, 0], BACK);
    return sign({
      id: 'please', gloss: 'PLEASE', english: 'Please', category: 'greetings',
      how: { handshape: 'Flat hand', location: 'On the chest', movement: 'Rub in a circle on the chest', palm: 'Flat against the chest' },
      tip: 'Keep the palm touching your chest during the whole circle.',
      keys: circleKeys(h, { t0: 0, dur: 1.4, r: 0.05, loops: 2, plane: 'xy', clockwise: true }),
    });
  })(),
  (() => {
    const h = pose('A', [-0.02, 1.33, 0.17], UP, BACK);
    return sign({
      id: 'sorry', gloss: 'SORRY', english: 'Sorry', category: 'greetings',
      how: { handshape: 'A (fist, thumb up the side)', location: 'On the chest', movement: 'Rub in a circle on the chest', palm: 'Toward the chest' },
      tip: 'Same movement as PLEASE but with a fist. Show a sorry face.',
      keys: circleKeys(h, { t0: 0, dur: 1.4, r: 0.045, loops: 2, plane: 'xy', clockwise: true }),
    });
  })(),
  (() => {
    const h = pose('ILY', [-0.14, 1.38, 0.3], UP, FWD);
    return sign({
      id: 'i-love-you', gloss: 'I-LOVE-YOU', english: 'I love you', category: 'greetings',
      how: { handshape: 'ILY: thumb, index and pinky out', location: 'In front of the shoulder', movement: 'Hold, with a small push forward', palm: 'Facing forward' },
      tip: 'This one handshape combines the letters I, L and Y.',
      keys: [
        { t: 0, R: h },
        { t: 0.5, R: shift(h, [0, 0, 0.06]) },
        { t: 1.1, R: shift(h, [0, 0, 0.06]) },
      ],
    });
  })(),
  (() => {
    const start = touch('FLAT', 'middle', [-0.01, 1.535, 0.11], UP, BACK);
    const end = pose('FLAT', [-0.02, 1.245, 0.31], [0.25, 0.15, 1], UP);
    return sign({
      id: 'good', gloss: 'GOOD', english: 'Good', category: 'questions',
      how: { handshape: 'Flat hands', location: 'Starts at the chin', movement: 'Move the dominant hand down into the other palm', palm: 'Dominant palm turns from you to facing up' },
      tip: 'Looks like THANK-YOU, but the hand lands on the other palm.',
      keys: [
        { t: 0, R: start, L: BASE_PALM_UP },
        { t: 0.25, R: start },
        { t: 0.95, R: end },
      ],
    });
  })(),

  // ------------------------------------------------------------ questions
  (() => {
    const up = pose('S', [-0.11, 1.33, 0.32], UP, FWD);
    const down = pose('S', [-0.11, 1.31, 0.34], [0, 0.25, 1], [0, -1, 0.25]);
    return sign({
      id: 'yes', gloss: 'YES', english: 'Yes', category: 'questions',
      how: { handshape: 'S (fist, thumb across the front)', location: 'In front of the shoulder', movement: 'Bend the wrist down and up, like a head nodding', palm: 'Facing forward' },
      tip: 'Nod your head at the same time.',
      keys: [
        { t: 0, R: up }, { t: 0.25, R: down }, { t: 0.5, R: up }, { t: 0.75, R: down }, { t: 1.0, R: up },
      ],
    });
  })(),
  (() => {
    const open = pose('NO_OPEN', [-0.11, 1.36, 0.31], [0, 0.85, 0.5], [0, -0.5, 0.85]);
    const closed = { ...open, s: 'NO_CLOSED' };
    return sign({
      id: 'no', gloss: 'NO', english: 'No', category: 'questions',
      how: { handshape: 'Index and middle finger with the thumb', location: 'In front of the shoulder', movement: 'Snap the two fingers closed onto the thumb, twice', palm: 'Facing forward / down' },
      tip: 'Shake your head slightly while signing.',
      keys: [
        { t: 0, R: open }, { t: 0.22, R: closed }, { t: 0.45, R: open }, { t: 0.67, R: closed }, { t: 0.9, R: closed },
      ],
    });
  })(),
  (() => {
    const r = pose('FIVE', [-0.16, 1.2, 0.3], [0.1, 0.15, 1], UP);
    return sign({
      id: 'what', gloss: 'WHAT', english: 'What?', category: 'questions',
      how: { handshape: '5 (all fingers spread)', location: 'In front of the waist', movement: 'Small side-to-side shake', palm: 'Facing up' },
      tip: 'For WH-questions (what, where, who) lower your eyebrows.',
      keys: [
        { t: 0, R: r, L: mirrorPose(r), brows: -1 },
        { t: 0.2, R: shift(r, [0.02, 0, 0]), L: mirrorPose(shift(r, [0.02, 0, 0])), brows: -1 },
        { t: 0.4, R: shift(r, [-0.02, 0, 0]), L: mirrorPose(shift(r, [-0.02, 0, 0])), brows: -1 },
        { t: 0.6, R: shift(r, [0.02, 0, 0]), L: mirrorPose(shift(r, [0.02, 0, 0])), brows: -1 },
        { t: 0.8, R: r, L: mirrorPose(r), brows: -1 },
      ],
    });
  })(),
  (() => {
    const a = pose('ONE', [-0.13, 1.37, 0.3], [0.3, 1, 0], FWD);
    const b = pose('ONE', [-0.13, 1.37, 0.3], [-0.3, 1, 0], FWD);
    return sign({
      id: 'where', gloss: 'WHERE', english: 'Where?', category: 'questions', trace: 'index',
      how: { handshape: '1 (index finger up)', location: 'In front of the shoulder', movement: 'Wag the finger side to side', palm: 'Facing forward' },
      tip: 'Lower your eyebrows: it is a WH-question.',
      keys: [
        { t: 0, R: a, brows: -1 }, { t: 0.25, R: b, brows: -1 }, { t: 0.5, R: a, brows: -1 }, { t: 0.75, R: b, brows: -1 }, { t: 0.95, R: a, brows: -1 },
      ],
    });
  })(),
  (() => {
    const s = pose('S', [-0.15, 1.6, 0.13], [0.1, 1, 0], [0.5, 0, -1]);
    return sign({
      id: 'understand', gloss: 'UNDERSTAND', english: 'Understand', category: 'questions', trace: 'index',
      how: { handshape: 'S, then the index flicks up (1)', location: 'Beside the forehead', movement: 'Flick the index finger up, like a light bulb turning on', palm: 'Toward you' },
      tip: 'Raise your eyebrows to ask "Do you understand?"',
      keys: [
        { t: 0, R: s }, { t: 0.35, R: s }, { t: 0.55, R: { ...s, s: 'ONE' } }, { t: 1.0, R: { ...s, s: 'ONE' } },
      ],
    });
  })(),

  // ------------------------------------------------------------ school
  (() => {
    const grab = pose('CLAW', [0.0, 1.29, 0.31], [0, -0.9, 0.4], [0, -0.4, -0.9]);
    const head = touch('FLAT_O', 'bunch', [-0.03, 1.70, 0.105], [-0.3, 0.95, 0.05], [0, 0, -1]);
    return sign({
      id: 'learn', gloss: 'LEARN', english: 'Learn', category: 'school',
      how: { handshape: 'Open hand closing to flat O', location: 'From the other palm to the forehead', movement: 'Pick up knowledge from the palm and put it into your head', palm: 'Down, then toward the forehead' },
      tip: 'The base hand is a flat palm like a page of a book.',
      keys: [
        { t: 0, R: grab, L: BASE_PALM_UP },
        { t: 0.3, R: grab },
        { t: 0.5, R: { ...grab, s: 'FLAT_O' } },
        { t: 1.1, R: head },
        { t: 1.3, R: head },
      ],
    });
  })(),
  (() => {
    const closed = pose('FLAT', [-0.022, 1.27, 0.34], [0, 0.25, 1], TO_LEFT);
    const open = pose('FLAT', [-0.075, 1.24, 0.34], [0, 0.2, 1], [-0.15, 1, 0]);
    return sign({
      id: 'book', gloss: 'BOOK', english: 'Book', category: 'school',
      how: { handshape: 'Flat hands', location: 'In front of the chest', movement: 'Open the hands like opening a book', palm: 'Palms together, ending facing up' },
      tip: 'Keep the little-finger edges together, like the book spine.',
      keys: [
        { t: 0, R: closed, L: mirrorPose(closed) },
        { t: 0.3, R: closed, L: 'mirror' },
        { t: 0.85, R: open, L: 'mirror' },
        { t: 1.1, R: open, L: 'mirror' },
      ],
    });
  })(),
  (() => {
    const base = pose('FLAT', [0.025, 1.21, 0.3], [-0.5, 0, 0.85], UP);
    const hit = pose('FLAT', [-0.02, 1.245, 0.3], [0.5, 0, 0.85], DOWN);
    const lift = shift(hit, [0, 0.1, 0]);
    return sign({
      id: 'school', gloss: 'SCHOOL', english: 'School', category: 'school',
      how: { handshape: 'Flat hands', location: 'In front of the chest', movement: 'Clap the top hand onto the bottom hand twice', palm: 'Top hand down, bottom hand up' },
      tip: 'Like a teacher clapping to call the class.',
      keys: [
        { t: 0, R: lift, L: base }, { t: 0.22, R: hit }, { t: 0.45, R: lift }, { t: 0.67, R: hit }, { t: 0.9, R: hit },
      ],
    });
  })(),
  (() => {
    const L = pose('H', [0.055, 1.25, 0.33], [-0.6, 0, 0.8], [-0.8, 0, -0.6]);
    const Rdown = pose('H', [-0.052, 1.283, 0.33], [0.6, 0, 0.8], [0.8, 0, -0.6]);
    const Rup = shift(Rdown, [0, 0.06, 0]);
    return sign({
      id: 'name', gloss: 'NAME', english: 'Name', category: 'school',
      how: { handshape: 'H (index and middle finger together, sideways)', location: 'In front of the chest', movement: 'Tap the top fingers on the bottom fingers twice', palm: 'Palms facing in, hands crossed' },
      tip: 'Use with WHAT to ask: YOUR NAME WHAT?',
      keys: [
        { t: 0, R: Rup, L }, { t: 0.22, R: Rdown }, { t: 0.42, R: Rup }, { t: 0.62, R: Rdown }, { t: 0.85, R: Rdown },
      ],
    });
  })(),
  (() => {
    const r = pose('ONE', [-0.08, 1.3, 0.32], [0.45, 0.85, 0.2], FWD);
    const l = mirrorPose(r);
    return sign({
      id: 'sign', gloss: 'SIGN (language)', english: 'Sign / sign language', category: 'school', trace: 'index',
      how: { handshape: '1 (index fingers)', location: 'In front of the chest', movement: 'Circle the hands back toward you, one after the other', palm: 'Facing forward' },
      tip: 'Like pedalling a bicycle backwards with your fingers.',
      keys: circleKeys(r, {
        t0: 0, dur: 1.6, r: 0.055, loops: 2, plane: 'yz', clockwise: false, phase: 90, steps: 12,
        withOther: (i, n, a) => ({ L: shift(l, [0, Math.sin(a + Math.PI) * 0.055, Math.cos(a + Math.PI) * 0.055]) }),
      }),
    });
  })(),
  (() => {
    const d = [0.35, 0.9, 0.1];
    const ear = touch('ONE', 'index', BODY.cheek, d, [1, 0, 0.25]);
    const mouth = touch('ONE', 'index', [-0.032, 1.56, 0.1], d, [1, 0, 0.25]);
    return sign({
      id: 'deaf', gloss: 'DEAF', english: 'Deaf', category: 'school', trace: 'index',
      how: { handshape: '1 (index finger)', location: 'Cheek near the ear, then near the mouth', movement: 'Touch near the ear, then near the mouth', palm: 'Toward the face' },
      tip: 'Many people also sign it from the mouth to the ear. Both are used.',
      keys: [
        { t: 0, R: ear }, { t: 0.3, R: ear }, { t: 0.75, R: mouth }, { t: 1.0, R: mouth },
      ],
    });
  })(),
  (() => {
    const base = pose('FLAT', [0.06, 1.2, 0.3], [-0.85, 0, 0.5], UP);
    const r = pose('A', [-0.0, 1.255, 0.31], [0.25, 0, 1], [1, 0, -0.25]);
    return sign({
      id: 'help', gloss: 'HELP', english: 'Help', category: 'school',
      how: { handshape: 'A (thumb up) on a flat palm', location: 'In front of the chest', movement: 'Lift both hands up together', palm: 'Base hand palm up' },
      tip: 'Move it toward a person to mean "help you".',
      keys: [
        { t: 0, R: r, L: base }, { t: 0.3, R: r, L: base }, { t: 0.9, R: shift(r, [0, 0.12, 0]), L: shift(base, [0, 0.12, 0]) },
      ],
    });
  })(),

  // ------------------------------------------------------------ daily
  (() => {
    const apart = pose('FLAT_O', [-0.19, 1.3, 0.32], [0.6, 0.8, 0], [0.8, -0.6, 0]);
    const together = touch('FLAT_O', 'bunch', [-0.004, 1.3, 0.32], [0.6, 0.8, 0], [0.8, -0.6, 0]);
    return sign({
      id: 'more', gloss: 'MORE', english: 'More', category: 'daily',
      how: { handshape: 'Flat O (fingertips together)', location: 'In front of the chest', movement: 'Tap the fingertips of both hands together twice', palm: 'Facing each other / down' },
      tip: 'Useful at lunch: MORE EAT? (more food?)',
      keys: [
        { t: 0, R: apart, L: mirrorPose(apart) },
        { t: 0.25, R: together, L: 'mirror' },
        { t: 0.45, R: shift(together, [-0.05, 0, 0]), L: 'mirror' },
        { t: 0.65, R: together, L: 'mirror' },
        { t: 0.85, R: together, L: 'mirror' },
      ],
    });
  })(),
  (() => {
    const a = pose('FIVE', [-0.12, 1.33, 0.25], UP, BACK);
    const b = pose('FIVE', [-0.22, 1.3, 0.34], [-0.4, 0.75, 0.55], [-0.2, -0.5, 1]);
    return sign({
      id: 'finish', gloss: 'FINISH', english: 'Finish / done', category: 'daily',
      how: { handshape: '5 (fingers spread)', location: 'In front of the chest', movement: 'Flip both hands outward quickly', palm: 'Toward you, then outward' },
      tip: 'Also used as "already" for things that are done.',
      keys: [
        { t: 0, R: a, L: mirrorPose(a) }, { t: 0.3, R: a, L: 'mirror' }, { t: 0.65, R: b, L: 'mirror' }, { t: 0.85, R: b, L: 'mirror' },
      ],
    });
  })(),
  (() => {
    const at = touch('FLAT_O', 'bunch', [-0.008, 1.572, 0.108], [-0.15, 1, 0.05], [0, 0, -1]);
    const away = shift(at, [0, -0.01, 0.06]);
    return sign({
      id: 'eat', gloss: 'EAT', english: 'Eat / food', category: 'daily',
      how: { handshape: 'Flat O (fingertips together)', location: 'At the mouth', movement: 'Tap the fingertips to the lips twice', palm: 'Facing down / toward you' },
      tip: 'Like putting food into your mouth.',
      keys: [
        { t: 0, R: away }, { t: 0.22, R: at }, { t: 0.45, R: away }, { t: 0.67, R: at }, { t: 0.9, R: at },
      ],
    });
  })(),
  (() => {
    const cup = pose('C', [-0.03, 1.43, 0.22], UP, TO_LEFT);
    const tilt = pose('C', [-0.025, 1.49, 0.2], [0, 0.6, -0.8], [1, 0, 0]);
    return sign({
      id: 'drink', gloss: 'DRINK', english: 'Drink', category: 'daily',
      how: { handshape: 'C (curved hand)', location: 'In front of the chin', movement: 'Tip the hand toward the mouth like drinking from a cup', palm: 'Facing the side' },
      tip: 'Imagine you hold a cup.',
      keys: [
        { t: 0, R: cup }, { t: 0.3, R: cup }, { t: 0.8, R: tilt }, { t: 1.05, R: tilt },
      ],
    });
  })(),
  (() => {
    const at = touch('W', 'index', [-0.004, 1.53, 0.108], UP, TO_LEFT);
    const away = shift(at, [0, -0.005, 0.045]);
    return sign({
      id: 'water', gloss: 'WATER', english: 'Water', category: 'daily', trace: 'index',
      how: { handshape: 'W (three fingers up)', location: 'Index finger at the chin', movement: 'Tap the chin twice', palm: 'Facing the side' },
      tip: 'W is for Water.',
      keys: [
        { t: 0, R: away }, { t: 0.22, R: at }, { t: 0.45, R: away }, { t: 0.67, R: at }, { t: 0.9, R: at },
      ],
    });
  })(),

  // ------------------------------------------------------------ people
  (() => {
    const at = touch('FIVE', 'thumb', [-0.004, 1.528, 0.108], UP, TO_LEFT);
    const away = shift(at, [0, 0, 0.045]);
    return sign({
      id: 'mother', gloss: 'MOTHER', english: 'Mother / mom', category: 'people',
      how: { handshape: '5 (fingers spread)', location: 'Thumb on the chin', movement: 'Tap the chin twice', palm: 'Facing the side' },
      tip: 'Female signs are often near the chin, male signs near the forehead.',
      keys: [
        { t: 0, R: away }, { t: 0.22, R: at }, { t: 0.45, R: away }, { t: 0.67, R: at }, { t: 0.9, R: at },
      ],
    });
  })(),
  (() => {
    const at = touch('FIVE', 'thumb', [-0.004, 1.705, 0.108], UP, TO_LEFT);
    const away = shift(at, [0, 0, 0.045]);
    return sign({
      id: 'father', gloss: 'FATHER', english: 'Father / dad', category: 'people',
      how: { handshape: '5 (fingers spread)', location: 'Thumb on the forehead', movement: 'Tap the forehead twice', palm: 'Facing the side' },
      tip: 'Compare with MOTHER: same hand, higher place.',
      keys: [
        { t: 0, R: away }, { t: 0.22, R: at }, { t: 0.45, R: away }, { t: 0.67, R: at }, { t: 0.9, R: at },
      ],
    });
  })(),
  (() => {
    const top = pose('X', [-0.035, 1.31, 0.31], [1, 0, 0.15], DOWN);
    const low = pose('X', [-0.035, 1.25, 0.31], [1, 0, 0.15], UP);
    const lTop = pose('X', [0.035, 1.31, 0.31], [-1, 0, 0.15], DOWN);
    const lLow = pose('X', [0.035, 1.25, 0.31], [-1, 0, 0.15], UP);
    return sign({
      id: 'friend', gloss: 'FRIEND', english: 'Friend', category: 'people', trace: 'index',
      how: { handshape: 'X (hooked index fingers)', location: 'In front of the chest', movement: 'Hook the index fingers together, then flip and hook again', palm: 'One down, one up; then they swap' },
      tip: 'Two people linked together.',
      keys: [
        { t: 0, R: top, L: lLow }, { t: 0.35, R: top, L: lLow },
        { t: 0.75, R: shift(low, [-0.04, 0.03, 0.04]), L: shift(lTop, [0.04, -0.03, 0.04]) },
        { t: 1.1, R: low, L: lTop }, { t: 1.35, R: low, L: lTop },
      ],
    });
  })(),
  (() => {
    const start = pose('F', [-0.045, 1.31, 0.34], UP, FWD);
    return sign({
      id: 'family', gloss: 'FAMILY', english: 'Family', category: 'people',
      how: { handshape: 'F (thumb and index make a circle)', location: 'In front of the chest', movement: 'Start together, circle outward and around until the little fingers meet', palm: 'Forward, ending toward you' },
      tip: 'The circle shows everyone in the group.',
      keys: [
        { t: 0, R: start, L: mirrorPose(start) },
        { t: 0.25, R: start, L: 'mirror' },
        { t: 0.6, R: pose('F', [-0.17, 1.31, 0.3], [0, 1, 0], [0.6, 0, 0.8]), L: 'mirror' },
        { t: 0.95, R: pose('F', [-0.11, 1.31, 0.2], [0, 1, 0], [1, 0, -0.4]), L: 'mirror' },
        { t: 1.2, R: pose('F', [-0.04, 1.31, 0.2], UP, BACK), L: 'mirror' },
      ],
    });
  })(),
];

export const SIGN_BY_ID = Object.fromEntries(SIGNS.map((s) => [s.id, s]));
