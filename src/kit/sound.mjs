// Sounds and music. Starts on the first tap, as browsers require; nothing is downloaded before it.
// sfx(name) plays a short clip from public/assets/sfx (made from scratch by public/assets/sfx/src/make_sfx.py, about
// 150 KB in all), each time at a pitch within ±6% so repeats never sound mechanical; until the clips have loaded, or if
// they cannot be decoded, a synthesised tone stands in. Under the effects lies a quiet ambience bed (brook and birds by
// day, brook and crickets at night), and music runs a gentle pentatonic loop. Volumes come from the settings (0–1).
let ctx = null, master = null, musicGain = null, sfxGain = null, ambGain = null, timer = 0, beat = 0;
const vol = { sound: 0.8, music: 0.6 };
export const SFX_BASE = './assets/sfx/';     // relative to the page (dist/index.html)
export const CLIPS = ['harvest', 'pop', 'cluck', 'moo', 'oink', 'coin', 'tick', 'coins', 'place', 'level', 'cheer', 'page', 'click', 'error', 'ambience-day', 'ambience-night'];
const buffers = new Map();
const lastPlayed = new Map();
export function setVolumes({ sound, music }) {
  if (sound != null) vol.sound = sound; if (music != null) vol.music = music;
  if (sfxGain) sfxGain.gain.value = vol.sound * 0.6;
  if (musicGain) musicGain.gain.value = vol.music * 0.18;
  if (ambGain) ambGain.gain.setTargetAtTime(vol.sound * 0.22, ctx.currentTime, 0.3);
}
export function unlockAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = globalThis.AudioContext ?? globalThis.webkitAudioContext; if (!AC) return;
  ctx = new AC(); master = ctx.createGain(); master.connect(ctx.destination);
  sfxGain = ctx.createGain(); sfxGain.connect(master); musicGain = ctx.createGain(); musicGain.connect(master);
  ambGain = ctx.createGain(); ambGain.gain.value = 0; ambGain.connect(master);
  setVolumes({}); startMusic(); loadClips();
}
/** What the sound system has (for tests): clips decoded, whether audio has started. */
export const soundInfo = () => ({ started: !!ctx, state: ctx?.state ?? 'none', clips: [...buffers.keys()] });

function loadClips() {
  for (const name of CLIPS) {
    fetch(`${SFX_BASE}${name}.m4a`).then(r => r.ok ? r.arrayBuffer() : Promise.reject(r.status))
      .then(data => new Promise((ok, no) => ctx.decodeAudioData(data, ok, no)))
      .then(buf => { buffers.set(name, buf); if (name.startsWith('ambience')) ambience(); })
      .catch(() => {});                                  // the synthesised stand-in keeps playing
  }
}
function play(name, { gain = 1, rate = 1 } = {}) {
  const buf = buffers.get(name); if (!buf) return false;
  const src = ctx.createBufferSource(), g = ctx.createGain();
  src.buffer = buf; src.playbackRate.value = rate * (1 + (Math.random() * 2 - 1) * 0.06);
  g.gain.value = gain; src.connect(g); g.connect(sfxGain); src.start();
  return true;
}
function tone(freq, start, dur, { type = 'sine', gain = 0.3, to = null, out = sfxGain } = {}) {
  const o = ctx.createOscillator(), g = ctx.createGain(), t0 = ctx.currentTime + start;
  o.type = type; o.frequency.setValueAtTime(freq, t0); if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(gain, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(out); o.start(t0); o.stop(t0 + dur + 0.05);
}
// stand-ins while the clips load (and the only sounds if they cannot be decoded)
const SYNTH = {
  pop: () => tone(620, 0, 0.12, { to: 940, gain: 0.25 }),
  harvest: () => tone(520, 0, 0.08, { to: 300, gain: 0.15 }),
  coin: () => { tone(988, 0, 0.12, { type: 'triangle', gain: 0.2 }); tone(1319, 0.07, 0.2, { type: 'triangle', gain: 0.2 }); },
  coins: () => [1319, 1568, 1760, 2093].forEach((f, i) => tone(f, i * 0.06, 0.18, { type: 'triangle', gain: 0.14 })),
  tick: () => tone(2637, 0, 0.06, { type: 'triangle', gain: 0.08 }),
  place: () => tone(180, 0, 0.18, { type: 'triangle', to: 90, gain: 0.35 }),
  level: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.3, { type: 'triangle', gain: 0.22 })),
  error: () => tone(240, 0, 0.16, { type: 'square', gain: 0.06, to: 200 }),
  click: () => tone(1400, 0, 0.04, { gain: 0.08 }),
  cheer: () => [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.07, 0.35, { type: 'triangle', gain: 0.18 })),
  page: () => tone(900, 0, 0.12, { to: 2400, gain: 0.03 }),
};
// how loud each clip sits in the mix, and a minimum gap so a sweep is not a din
const MIX = { harvest: [0.7, 45], pop: [0.6, 40], cluck: [0.75, 250], moo: [0.7, 600], oink: [0.7, 300], coin: [0.6, 60], tick: [0.35, 40], coins: [0.7, 200],
  place: [0.9, 80], level: [0.8, 500], cheer: [0.8, 500], page: [0.6, 120], click: [0.5, 30], error: [0.55, 120] };
export function sfx(name) {
  if (!ctx || vol.sound <= 0 || ctx.state !== 'running') return;
  const [gain, gap] = MIX[name] ?? [0.7, 40], now = performance.now();
  if (now - (lastPlayed.get(name) ?? -1e9) < gap) return;
  lastPlayed.set(name, now);
  // every coin reward (orders, rent, gifts, the stall) pours the cascade; a plain 'coin' clip stays for single coins
  const clip = name === 'coin' ? 'coins' : name;
  if (!play(clip, { gain })) SYNTH[name]?.();
}
// The ambience bed: two overlapping copies of a clip crossfade so the loop never clicks; day or night follows the page.
let ambNow = null, ambTimer = 0;
function ambience() {
  if (ambTimer || !ctx) return;
  const next = () => {
    const name = document.body.classList.contains('night') && buffers.has('ambience-night') ? 'ambience-night' : 'ambience-day';
    const buf = buffers.get(name); if (!buf) { ambTimer = setTimeout(next, 1000); return; }
    const src = ctx.createBufferSource(), g = ctx.createGain(), t0 = ctx.currentTime, dur = buf.duration, x = 1.2;
    src.buffer = buf; g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(1, t0 + x);
    g.gain.setValueAtTime(1, t0 + dur - x); g.gain.linearRampToValueAtTime(0, t0 + dur);
    src.connect(g); g.connect(ambGain); src.start(t0); src.stop(t0 + dur + 0.05);
    ambNow = name;
    ambTimer = setTimeout(next, (dur - x) * 1000);
  };
  setVolumes({});
  next();
}
document.addEventListener?.('visibilitychange', () => { if (ambGain && ctx) ambGain.gain.setTargetAtTime(document.hidden ? 0 : vol.sound * 0.22, ctx.currentTime, 0.2); });
// A soft loop: a pad chord every two bars and a pluck melody wandering on the major pentatonic.
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16], CHORDS = [[0, 4, 7], [-3, 0, 4], [-7, -3, 0], [-5, -1, 2]];
let note = 2, mood = null;
/** The tune's mood: null (the gentle everyday loop) or 'festival' (the Harvest Festival: quicker, fuller, with a drum). */
export function setMood(next = null) { if (next === mood) return; mood = next; if (timer) startMusic(); }
function startMusic() {
  clearInterval(timer);
  const festive = mood === 'festival';
  timer = setInterval(() => {
    if (!ctx || ctx.state !== 'running' || vol.music <= 0 || document.hidden) return;
    const root = 261.63, step = beat % 16;
    if (step === 0) for (const n of CHORDS[(beat / 16 | 0) % 4]) tone(root / 2 * 2 ** (n / 12), 0, festive ? 2.6 : 3.6, { gain: 0.12, out: musicGain });
    if (Math.random() < (festive ? 0.85 : 0.55)) { note = Math.max(0, Math.min(SCALE.length - 1, note + [-2, -1, 1, 2][Math.random() * 4 | 0])); tone(root * 2 ** (SCALE[note] / 12), 0, festive ? 0.32 : 0.5, { type: 'triangle', gain: 0.16, out: musicGain }); }
    if (festive && step % 4 === 0) tone(step % 8 ? 150 : 95, 0, 0.14, { type: 'sine', gain: 0.2, to: 50, out: musicGain });   // a soft drum: low on the bar, higher between
    beat++;
  }, festive ? 190 : 260);
}
