import { Avatar, HandSnapshot, buildTimeline } from './avatar.js';
import { SIGNS, CATEGORIES, SIGN_BY_ID } from './signs.js';
import { ALPHABET, LETTER_INFO, MOTION_LETTERS, letterOrientation, spellKeys } from './letters.js';
import { CHECKABLE } from './classifier.js';

const $ = (id) => document.getElementById(id);
const isNarrow = () => matchMedia('(max-width: 900px)').matches;

// ---------------------------------------------------------------- storage
const STORE_KEY = 'learn-sign:v1';
const store = (() => {
  let data = {};
  try { data = JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch { /* private mode */ }
  return {
    get: (k, d) => (data[k] === undefined ? d : data[k]),
    set: (k, v) => { data[k] = v; try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch { /* ignore */ } },
  };
})();
const learned = new Set(store.get('learned', []));

// ---------------------------------------------------------------- avatar
const viewer = $('viewer');
const avatar = new Avatar(viewer, { skin: store.get('skin', 'brown') });
let snap = null;
const snapshot = () => (snap ||= new HandSnapshot(220, store.get('skin', 'brown')));

let captionMode = 'gloss'; // 'gloss' | 'letters' | 'hidden'
let captionText = '';
const caption = $('caption');
function setCaption(t) { captionText = t || ''; caption.textContent = captionMode === 'hidden' ? '' : captionText; }

let onLetter = null;
avatar.onLabel = (label) => {
  if (!label) return;
  const [i, ch] = label.split(':');
  if (captionMode === 'letters') caption.textContent = ch;
  onLetter && onLetter(+i, ch);
};

const scrub = $('scrub');
let scrubbing = false;
avatar.onTime = (t, d) => { if (!scrubbing) scrub.value = Math.round((Math.min(t, d) / d) * 1000); };
scrub.addEventListener('input', () => {
  scrubbing = true;
  setPlaying(false);
  if (avatar.timeline) avatar.seek((scrub.value / 1000) * avatar.timeline.duration);
});
scrub.addEventListener('change', () => { scrubbing = false; });

const btnPlay = $('btnPlay');
function setPlaying(p) {
  avatar.setPlaying(p);
  btnPlay.textContent = p ? '❚❚' : '▶';
  btnPlay.setAttribute('aria-label', p ? 'Pause' : 'Play');
}
btnPlay.addEventListener('click', () => {
  if (!avatar.playing && avatar.timeline && avatar.time >= avatar.timeline.duration) avatar.seek(0);
  setPlaying(!avatar.playing);
});
$('btnReplay').addEventListener('click', () => { avatar.seek(0); setPlaying(true); });

function segGroup(selector, attr, onPick, initial) {
  const btns = [...document.querySelectorAll(selector)];
  const pick = (val) => {
    btns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset[attr] === String(val))));
    onPick(val);
  };
  btns.forEach((b) => b.addEventListener('click', () => pick(b.dataset[attr])));
  if (initial !== undefined) pick(initial);
  return pick;
}
segGroup('[data-speed]', 'speed', (v) => { avatar.setSpeed(+v); store.set('speed', +v); }, store.get('speed', 0.5));
segGroup('[data-view]', 'view', (v) => avatar.setView(v), 'front');

$('chkPath').addEventListener('change', (e) => { avatar.setTrail(e.target.checked); $('legend').hidden = !e.target.checked; });
$('chkLoop').addEventListener('change', (e) => { avatar.loop = e.target.checked; if (e.target.checked) setPlaying(true); });
avatar.onEnd = () => setPlaying(false);
const selSkin = $('selSkin');
selSkin.value = store.get('skin', 'brown');
selSkin.addEventListener('change', () => {
  store.set('skin', selSkin.value);
  avatar.setSkin(selSkin.value);
  if (snap) { snap.setSkin(selSkin.value); letterImgs.clear(); renderLetterGrid(); if (currentSign) showSignDetail(currentSign); }
});

function playKeys(keys, { trace = 'palm', mode = 'gloss', text = '' } = {}) {
  captionMode = mode;
  onLetter = null;
  avatar.play(buildTimeline(keys), { autoplay: true, showTrail: $('chkPath').checked, trace });
  avatar.loop = $('chkLoop').checked;
  setPlaying(true);
  setCaption(mode === 'letters' ? '' : text);
}

function showStage() {
  if (isNarrow()) viewer.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

let toastTimer;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

// ---------------------------------------------------------------- tabs
let currentTab = 'signs';
const tabButtons = [...document.querySelectorAll('[data-tab]')];
function openTab(name) {
  currentTab = name;
  tabButtons.forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === name)));
  document.querySelectorAll('.tab-pane').forEach((p) => { p.hidden = p.dataset.pane !== name; });
  if (name !== 'practice') stopPractice();
  if (name === 'signs') playSign(currentSign || SIGNS[0], false);
  if (name === 'alphabet') { renderLetterGrid(); showLetter(currentLetter || 'A'); }
  if (name === 'spell') spellWord($('spellInput').value || 'DEAF');
  if (name === 'quiz') newQuestion();
  if (name === 'practice') setupPractice();
  try { history.replaceState(null, '', '#' + name); } catch { /* file:// */ }
}
tabButtons.forEach((b) => b.addEventListener('click', () => openTab(b.dataset.tab)));

// ---------------------------------------------------------------- signs
let currentSign = null;
let currentCat = 'all';
function renderCats() {
  const wrap = $('catChips');
  wrap.innerHTML = '';
  for (const c of [{ id: 'all', name: 'All' }, ...CATEGORIES]) {
    const b = document.createElement('button');
    b.className = 'chip';
    b.textContent = c.name;
    b.setAttribute('aria-pressed', String(c.id === currentCat));
    b.addEventListener('click', () => { currentCat = c.id; renderCats(); renderSignList(); });
    wrap.appendChild(b);
  }
}
function filteredSigns() {
  const q = $('search').value.trim().toLowerCase();
  return SIGNS.filter((s) => (currentCat === 'all' || s.category === currentCat) &&
    (!q || s.gloss.toLowerCase().includes(q) || s.english.toLowerCase().includes(q)));
}
function renderSignList() {
  const list = $('signList');
  list.innerHTML = '';
  const items = filteredSigns();
  if (!items.length) list.innerHTML = '<p class="note">No signs match. Try the Fingerspell tab to spell it.</p>';
  for (const s of items) {
    const b = document.createElement('button');
    b.className = 'sign-card';
    b.innerHTML = `<span class="g"></span><span class="e"></span>${learned.has(s.id) ? '<span class="done" aria-label="learned">✓</span>' : ''}`;
    b.querySelector('.g').textContent = s.gloss;
    b.querySelector('.e').textContent = s.english;
    if (currentSign && s.id === currentSign.id) b.setAttribute('aria-current', 'true');
    b.addEventListener('click', () => { playSign(s); showStage(); });
    list.appendChild(b);
  }
  $('learnedCount').textContent = `${learned.size} / ${SIGNS.length} learned`;
}
$('search').addEventListener('input', renderSignList);

function playSign(s, updateList = true) {
  currentSign = s;
  playKeys(s.keys, { trace: s.trace, text: s.gloss });
  showSignDetail(s);
  if (updateList) renderSignList();
  try { history.replaceState(null, '', '#sign=' + s.id); } catch { /* ignore */ }
}
function showSignDetail(s) {
  $('signDetail').hidden = false;
  $('detailGloss').textContent = s.gloss;
  $('detailEnglish').textContent = s.english;
  $('pHandshape').textContent = s.how.handshape;
  $('pLocation').textContent = s.how.location;
  $('pMovement').textContent = s.how.movement;
  $('pPalm').textContent = s.how.palm;
  $('detailTip').textContent = s.tip;
  const first = s.keys[0].R;
  const shape = first.s === 'REST' ? 'B' : first.s;
  $('detailShape').src = snapshot().render(shape, [0, 1, 0], [0.15, 0, 1]);
  $('detailShape').alt = `Handshape for ${s.gloss}`;
  const btn = $('btnLearned');
  const done = learned.has(s.id);
  btn.textContent = done ? '✓ Learned' : 'Mark as learned';
  btn.classList.toggle('primary', !done);
}
$('btnLearned').addEventListener('click', () => {
  if (!currentSign) return;
  if (learned.has(currentSign.id)) learned.delete(currentSign.id);
  else { learned.add(currentSign.id); toast(`Great! ${currentSign.gloss} learned.`); }
  store.set('learned', [...learned]);
  showSignDetail(currentSign);
  renderSignList();
});
$('btnNextSign').addEventListener('click', () => {
  const list = filteredSigns();
  const i = list.findIndex((s) => s.id === currentSign?.id);
  playSign(list[(i + 1) % list.length]);
  showStage();
});

// ---------------------------------------------------------------- alphabet
let currentLetter = null;
const letterImgs = new Map();
function letterImage(ch) {
  if (!letterImgs.has(ch)) {
    const [d, n] = letterOrientation(ch);
    letterImgs.set(ch, snapshot().render(ch, d, n));
  }
  return letterImgs.get(ch);
}
function renderLetterGrid() {
  const grid = $('letterGrid');
  grid.innerHTML = '';
  for (const ch of ALPHABET) {
    const b = document.createElement('button');
    b.className = 'letter-card';
    b.innerHTML = `<img alt="" src="${letterImage(ch)}"><span>${ch}</span>`;
    b.setAttribute('aria-label', `Letter ${ch}`);
    if (ch === currentLetter) b.setAttribute('aria-current', 'true');
    b.addEventListener('click', () => { showLetter(ch); showStage(); });
    grid.appendChild(b);
  }
}
function showLetter(ch) {
  currentLetter = ch;
  playKeys(spellKeys(ch, { hold: 1.2 }).keys, { trace: MOTION_LETTERS.includes(ch) ? (ch === 'J' ? 'pinky' : 'index') : 'palm', text: ch });
  $('letterInfo').hidden = false;
  $('letterBig').textContent = ch;
  $('letterText').textContent = LETTER_INFO[ch];
  document.querySelectorAll('.letter-card').forEach((b) => b.toggleAttribute('aria-current', b.textContent.trim() === ch));
}

// ---------------------------------------------------------------- fingerspell
const SPELL_WORDS = ['DEAF', 'HELLO', 'SCHOOL', 'FAMILY', 'BOOK', 'JAZZ', 'COFFEE'];
function renderSpellChips() {
  const wrap = $('spellChips');
  wrap.innerHTML = '';
  for (const w of SPELL_WORDS) {
    const b = document.createElement('button');
    b.className = 'chip';
    b.textContent = w;
    b.addEventListener('click', () => { $('spellInput').value = w; spellWord(w); showStage(); });
    wrap.appendChild(b);
  }
}
function spellWord(word) {
  const clean = word.toUpperCase().replace(/[^A-Z]/g, '');
  if (!clean) { toast('Type letters A to Z'); return; }
  const { keys, letters } = spellKeys(clean);
  const strip = $('spellStrip');
  strip.innerHTML = '';
  const spans = letters.map((ch) => { const s = document.createElement('span'); s.textContent = ch; strip.appendChild(s); return s; });
  playKeys(keys, { trace: 'index', mode: 'letters' });
  onLetter = (i) => spans.forEach((s, j) => { s.classList.toggle('on', j === i); s.classList.toggle('past', j < i); });
}
$('spellForm').addEventListener('submit', (e) => { e.preventDefault(); spellWord($('spellInput').value); showStage(); });

// ---------------------------------------------------------------- quiz
const QUIZ_WORDS = ['CAT', 'DOG', 'SUN', 'BOOK', 'HELP', 'MILK', 'FISH', 'HAND', 'LOVE', 'BUS', 'TEA', 'RED', 'BLUE', 'HAT', 'CUP', 'PEN'];
let quizMode = 'signs';
let quiz = null;
let score = store.get('quiz', { right: 0, total: 0 });
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pickOther = (pool, answer, n) => shuffle(pool.filter((x) => x !== answer)).slice(0, n);

function updateScore() { $('quizScore').textContent = `${score.right} / ${score.total}`; }
segGroup('[data-mode]', 'mode', (m) => { quizMode = m; if (currentTab === 'quiz') newQuestion(); }, 'signs');

function newQuestion() {
  updateScore();
  const fb = $('quizFeedback');
  fb.textContent = '';
  fb.className = 'feedback';
  const opts = $('quizOptions');
  opts.innerHTML = '';
  $('quizWordForm').hidden = quizMode !== 'words';
  opts.hidden = quizMode === 'words';
  avatar.loop = true;
  $('chkLoop').checked = true;

  if (quizMode === 'signs') {
    const answer = SIGNS[(Math.random() * SIGNS.length) | 0];
    quiz = { answer: answer.gloss };
    $('quizPrompt').textContent = 'Watch the signer. Which sign is it?';
    playKeys(answer.keys, { trace: answer.trace, mode: 'hidden' });
    const choices = shuffle([answer.gloss, ...pickOther(SIGNS.map((s) => s.gloss), answer.gloss, 3)]);
    renderChoices(choices);
  } else if (quizMode === 'letters') {
    const answer = ALPHABET[(Math.random() * ALPHABET.length) | 0];
    quiz = { answer };
    $('quizPrompt').textContent = 'Which letter is the signer showing?';
    playKeys(spellKeys(answer, { hold: 1.2 }).keys, { trace: 'index', mode: 'hidden' });
    renderChoices(shuffle([answer, ...pickOther(ALPHABET, answer, 3)]));
  } else {
    const answer = QUIZ_WORDS[(Math.random() * QUIZ_WORDS.length) | 0];
    quiz = { answer };
    $('quizPrompt').textContent = 'Read the fingerspelling. Type the word.';
    playKeys(spellKeys(answer).keys, { trace: 'index', mode: 'hidden' });
    $('quizWordInput').value = '';
  }
}
function renderChoices(choices) {
  const opts = $('quizOptions');
  for (const c of choices) {
    const b = document.createElement('button');
    b.textContent = c;
    b.addEventListener('click', () => answerQuiz(c, b));
    opts.appendChild(b);
  }
}
function answerQuiz(given, btn) {
  if (!quiz || quiz.done) return;
  quiz.done = true;
  const ok = given.toUpperCase() === quiz.answer;
  score.total++;
  if (ok) score.right++;
  store.set('quiz', score);
  updateScore();
  const fb = $('quizFeedback');
  fb.className = 'feedback ' + (ok ? 'ok' : 'bad');
  fb.textContent = ok ? `✓ Correct! It is ${quiz.answer}.` : `✗ Not quite. It is ${quiz.answer}.`;
  [...$('quizOptions').children].forEach((b) => {
    b.disabled = true;
    if (b.textContent === quiz.answer) b.classList.add('right');
  });
  if (btn && !ok) btn.classList.add('wrong');
  captionMode = 'gloss';
  setCaption(quiz.answer);
}
$('quizWordForm').addEventListener('submit', (e) => { e.preventDefault(); answerQuiz($('quizWordInput').value.trim()); });
$('btnQuizNext').addEventListener('click', () => { newQuestion(); showStage(); });

// ---------------------------------------------------------------- practice
let practice = null;
let practiceLetter = 'A';
let holdStart = 0;
const PRACTICE_LETTERS = ALPHABET.filter((l) => CHECKABLE.includes(l));

function setupPractice() {
  const sel = $('practiceLetter');
  if (!sel.options.length) {
    for (const l of PRACTICE_LETTERS) sel.add(new Option(l, l));
    sel.addEventListener('change', () => choosePracticeLetter(sel.value));
  }
  choosePracticeLetter(practiceLetter);
}
function choosePracticeLetter(l) {
  practiceLetter = l;
  $('practiceLetter').value = l;
  practice && practice.setLetter(l);
  holdStart = 0;
  $('holdFill').style.width = '0';
  $('camSuccess').hidden = true;
  playKeys(spellKeys(l, { hold: 1.5 }).keys, { trace: 'palm', text: l });
  renderChecklist(null);
}
$('btnPracticeNext').addEventListener('click', () => {
  const i = PRACTICE_LETTERS.indexOf(practiceLetter);
  choosePracticeLetter(PRACTICE_LETTERS[(i + 1) % PRACTICE_LETTERS.length]);
});

function renderChecklist(result) {
  const ul = $('checklist');
  ul.innerHTML = '';
  if (!result) {
    const li = document.createElement('li');
    li.innerHTML = '<span class="m">✋</span><span></span>';
    li.lastChild.textContent = practice ? 'Show one hand to the camera, palm facing the camera.' : 'Turn on the camera to get feedback.';
    ul.appendChild(li);
    return;
  }
  const items = [...result.items].sort((a, b) => a.ok - b.ok);
  for (const it of items) {
    const li = document.createElement('li');
    li.className = it.ok ? 'ok' : 'bad';
    li.innerHTML = '<span class="m"></span><span></span>';
    li.firstChild.textContent = it.ok ? '✓' : '✗';
    li.lastChild.textContent = it.hint; // failed: what to fix; passed: shown with a tick
    ul.appendChild(li);
  }
}

function stopPractice() {
  if (practice) { practice.stop(); practice = null; }
  $('camMsg').hidden = false;
}

$('btnCamera').addEventListener('click', async () => {
  const msg = $('camMsg');
  const status = (t) => { msg.querySelector('p').textContent = t || ''; };
  if (!navigator.mediaDevices?.getUserMedia) { status('This browser cannot use the camera. Try Chrome, Edge, Firefox or Safari.'); return; }
  $('btnCamera').disabled = true;
  try {
    const { Practice } = await import('./practice.js');
    practice = new Practice({
      video: $('camVideo'),
      canvas: $('camCanvas'),
      onStatus: status,
      onResult: (r) => {
        renderChecklist(r);
        const fill = $('holdFill');
        if (r && r.match) {
          holdStart ||= performance.now();
          const p = Math.min(1, (performance.now() - holdStart) / 1000);
          fill.style.width = p * 100 + '%';
          if (p >= 1 && $('camSuccess').hidden) {
            $('camSuccess').hidden = false;
            toast(`Well done! That is ${practiceLetter}.`);
            setTimeout(() => {
              const i = PRACTICE_LETTERS.indexOf(practiceLetter);
              choosePracticeLetter(PRACTICE_LETTERS[(i + 1) % PRACTICE_LETTERS.length]);
            }, 1600);
          }
        } else {
          holdStart = 0;
          fill.style.width = '0';
        }
      },
    });
    practice.setLetter(practiceLetter);
    await practice.start();
    msg.hidden = true;
    renderChecklist(null);
  } catch (err) {
    console.error(err);
    practice = null;
    status(err && err.name === 'NotAllowedError' ? 'Camera permission was blocked. Allow the camera in your browser settings and try again.' : 'Could not start the camera or hand tracker. Check your internet connection and try again.');
  } finally {
    $('btnCamera').disabled = false;
  }
});

// ---------------------------------------------------------------- start
renderCats();
renderSignList();
renderSpellChips();
updateScore();
const hash = location.hash.slice(1);
if (hash.startsWith('sign=') && SIGN_BY_ID[hash.slice(5)]) { currentSign = SIGN_BY_ID[hash.slice(5)]; openTab('signs'); }
else if (['signs', 'alphabet', 'spell', 'quiz', 'practice'].includes(hash)) openTab(hash);
else openTab('signs');
window.__ready = true;
