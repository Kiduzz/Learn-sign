# Learn Sign

Learn Sign is a web app that teaches sign language to deaf and hard-of-hearing students. A 3D signer shows each sign with its real movement. Students can slow it down, turn it around, watch it from the signer's own eyes, and practise handshapes with their camera.

Everything is visual. The app needs no sound.

## Features

- **Signs**: 27 everyday signs (greetings, questions, school, daily needs, people). Each sign is broken into the four parts teachers use: **handshape, location, movement and palm orientation**. Each also has a practical tip.
- **Movement you can see**
  - The 3D signer uses two fully articulated hands and arms.
  - A **coloured path** draws the movement of each hand, with an arrow showing the direction (orange = right hand, blue = left hand).
  - **Speed**: ¼, ½ or normal. You can drag the timeline to any moment.
  - **Views**:
    - *Front*: like facing a teacher.
    - *Mirror*: copy with the same hand.
    - *My eyes*: the signer's own point of view.
    - *Side*: from the side.
    - *Close*: zoomed in on the hands.
  - You can also drag the picture to turn the signer.
  - The signer's eyebrows move for questions, because facial grammar is part of the sign.
- **Alphabet**: all 26 letters of the manual alphabet, with a picture card and a description for each. J and Z are animated.
- **Fingerspell**: type any name or word and watch it spelled letter by letter, with the current letter highlighted.
- **Quiz**: three modes.
  - Recognise a sign.
  - Recognise a letter.
  - Read a fingerspelled word.
- **Practice with camera**: the student copies a letter, and a checklist shows what is right (✓) and what to fix (✗), for example "Fold your ring finger down". Holding the correct shape fills a progress bar and shows a big ✓. The camera video is processed on the device and is never uploaded.
- **Inclusive**: you can choose the signer's skin tone. The signer wears a dark top so the hands stand out, as interpreters do. The app works on phones and supports dark mode and keyboard use.
- **Progress**: "learned" signs and quiz scores are saved in the browser.

> **Language note:** the signs are common **American Sign Language (ASL)** forms. Sign languages differ between countries and regions, and many signs have variants. Always check with your local Deaf community and Deaf teachers. The data format makes it easy to add another sign language (see below).

## Run it

The app is plain HTML, CSS and JavaScript. There is no build step and nothing to install. Serve the folder with any static web server:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

The camera practice needs `localhost` or HTTPS, because browsers only allow the camera on secure pages. It also needs an internet connection the first time, to load the MediaPipe hand tracker.

### Publish with GitHub Pages

1. Go to *Settings → Pages*.
2. Under *Build and deployment*, choose **Deploy from a branch**.
3. Select `main` and `/ (root)`, then save.

The site will be at `https://<user>.github.io/<repo>/`.

## Tests

The checker self-test poses the 3D hand in every letter (right and left hand). It then checks that the camera checker recognises exactly that letter.

1. Start the web server:

   ```bash
   python3 -m http.server 8765
   ```

2. In another terminal, run the tests. They need Node and Playwright:

   ```bash
   node tests/run.cjs
   ```

You can also open `tests/classifier.html` in a browser to see the results table.

## Project layout

```
index.html          app shell
css/style.css       styles (light + dark)
js/app.js           UI: tabs, sign list, alphabet, fingerspelling, quiz, practice
js/avatar.js        3D signer: body, arm IK, timeline player, motion paths, views
js/hand.js          articulated hand model + handshape library + thumb solver
js/poses.js         helpers for placing hands on the body (chin, forehead, chest...)
js/signs.js         the sign library (four parameters + keyframes)
js/letters.js       manual alphabet and fingerspelling timelines
js/classifier.js    rule-based handshape checker used by camera practice
js/practice.js      camera + MediaPipe Hand Landmarker
js/vendor/          three.js r169 (MIT)
tests/              classifier self-test and headless runner
```

## Add a sign

Signs live in `js/signs.js`. Each one has a short description and a list of keyframes:

```js
sign({
  id: 'water', gloss: 'WATER', english: 'Water', category: 'daily', trace: 'index',
  how: { handshape: 'W', location: 'Index finger at the chin', movement: 'Tap the chin twice', palm: 'Facing the side' },
  tip: 'W is for Water.',
  keys: [
    { t: 0,    R: away },
    { t: 0.22, R: at },   // R = right hand, L = left hand ('mirror' copies R)
    { t: 0.45, R: away },
  ],
})
```

A hand pose is written `pose(handshape, palmCentre, fingerDirection, palmFacing)`, in metres. The signer faces +z, and the signer's right hand is on −x.

You can place a fingertip exactly on the body with `touch(shape, 'index' | 'middle' | 'thumb' | 'bunch', point, dir, palm)`. Body points are listed in `BODY` in `js/poses.js`.

New handshapes go in `SHAPES` in `js/hand.js`:

- **Fingers** take three bend angles, in degrees.
- **The thumb** can be given as a tip target, for example `at(x, y, z)`. The joint angles are then solved automatically.

## Credits

- 3D rendering: [three.js](https://threejs.org) (MIT, vendored in `js/vendor`).
- Hand tracking: [MediaPipe Hand Landmarker](https://developers.google.com/mediapipe/solutions/vision/hand_landmarker) (Apache 2.0), loaded from a CDN.
