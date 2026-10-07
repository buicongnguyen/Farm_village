// Sounds and music, synthesised with Web Audio (no files to download). Starts on the first tap, as browsers require.
// sfx(name) plays a short sound; music runs a gentle pentatonic loop. Volumes come from the settings (0–1).
let ctx = null, master = null, musicGain = null, sfxGain = null, timer = 0, beat = 0;
const vol = { sound: 0.8, music: 0.6 };
export function setVolumes({ sound, music }) {
  if (sound != null) vol.sound = sound; if (music != null) vol.music = music;
  if (sfxGain) sfxGain.gain.value = vol.sound * 0.5;
  if (musicGain) musicGain.gain.value = vol.music * 0.18;
}
export function unlockAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = globalThis.AudioContext ?? globalThis.webkitAudioContext; if (!AC) return;
  ctx = new AC(); master = ctx.createGain(); master.connect(ctx.destination);
  sfxGain = ctx.createGain(); sfxGain.connect(master); musicGain = ctx.createGain(); musicGain.connect(master);
  setVolumes({}); startMusic();
}
function tone(freq, start, dur, { type = 'sine', gain = 0.3, to = null, out = sfxGain } = {}) {
  const o = ctx.createOscillator(), g = ctx.createGain(), t0 = ctx.currentTime + start;
  o.type = type; o.frequency.setValueAtTime(freq, t0); if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(gain, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(out); o.start(t0); o.stop(t0 + dur + 0.05);
}
const SFX = {
  pop: () => tone(620, 0, 0.12, { to: 940, gain: 0.25 }),
  coin: () => { tone(988, 0, 0.12, { type: 'triangle', gain: 0.2 }); tone(1319, 0.07, 0.2, { type: 'triangle', gain: 0.2 }); },
  place: () => tone(180, 0, 0.18, { type: 'triangle', to: 90, gain: 0.35 }),
  level: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.3, { type: 'triangle', gain: 0.22 })),
  error: () => tone(240, 0, 0.16, { type: 'square', gain: 0.06, to: 200 }),
  click: () => tone(1400, 0, 0.04, { gain: 0.08 }),
  cheer: () => [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.07, 0.35, { type: 'triangle', gain: 0.18 })),
};
export function sfx(name) { if (ctx && vol.sound > 0 && ctx.state === 'running') SFX[name]?.(); }
// A soft loop: a pad chord every two bars and a pluck melody wandering on the major pentatonic.
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16], CHORDS = [[0, 4, 7], [-3, 0, 4], [-7, -3, 0], [-5, -1, 2]];
let note = 2;
function startMusic() {
  clearInterval(timer);
  timer = setInterval(() => {
    if (!ctx || ctx.state !== 'running' || vol.music <= 0 || document.hidden) return;
    const root = 261.63, step = beat % 16;
    if (step === 0) for (const n of CHORDS[(beat / 16 | 0) % 4]) tone(root / 2 * 2 ** (n / 12), 0, 3.6, { gain: 0.12, out: musicGain });
    if (Math.random() < 0.55) { note = Math.max(0, Math.min(SCALE.length - 1, note + [-2, -1, 1, 2][Math.random() * 4 | 0])); tone(root * 2 ** (SCALE[note] / 12), 0, 0.5, { type: 'triangle', gain: 0.16, out: musicGain }); }
    beat++;
  }, 260);
}
