"""Farm Village sound effects, made from scratch (juice package). Every clip is synthesised here with numpy and
encoded to mono AAC (.m4a) with ffmpeg; no recordings or third-party samples are used (CC0, see
docs/assets/juice-provenance.md).

    python public/assets/sfx/src/make_sfx.py [path/to/ffmpeg]

Writes public/assets/sfx/<name>.m4a. Seeded, so the same script makes the same sounds.
"""
import os, subprocess, sys, tempfile, wave
import numpy as np
from scipy import signal

SR = 44100
OUT = os.path.normpath(os.path.join(os.path.dirname(__file__), '..'))
FFMPEG = sys.argv[1] if len(sys.argv) > 1 else 'ffmpeg'
rng = np.random.default_rng(20261007)


def t_of(dur):
    return np.arange(int(dur * SR)) / SR


def env(n, attack=0.005, decay=0.2, hold=0.0):
    """Attack, hold, then an exponential decay with time constant `decay` (seconds)."""
    t = np.arange(n) / SR
    e = np.minimum(1.0, t / max(attack, 1e-4))
    tail = np.clip(t - attack - hold, 0, None)
    return e * np.exp(-tail / decay)


def fade(x, a=0.004, b=0.02):
    n = len(x); x = x.copy()
    ia, ib = int(a * SR), int(b * SR)
    if ia: x[:ia] *= np.linspace(0, 1, ia)
    if ib: x[-ib:] *= np.linspace(1, 0, ib)
    return x


def bp(x, lo, hi, order=2):
    sos = signal.butter(order, [lo, hi], btype='band', fs=SR, output='sos')
    return signal.sosfilt(sos, x)


def lp(x, f, order=2):
    return signal.sosfilt(signal.butter(order, f, btype='low', fs=SR, output='sos'), x)


def hp(x, f, order=2):
    return signal.sosfilt(signal.butter(order, f, btype='high', fs=SR, output='sos'), x)


def resonate(x, f, q):
    b, a = signal.iirpeak(f, q, fs=SR)
    return signal.lfilter(b, a, x)


def formants(src, fs_q_g):
    return sum(g * resonate(src, f, q) for f, q, g in fs_q_g)


def phase(freq):
    """Phase (radians) of a tone whose frequency follows the array `freq`."""
    return 2 * np.pi * np.cumsum(freq) / SR


def glottal(freq, shape=0.7):
    """A soft buzz: a band-limited-ish saw built from harmonics, for voices."""
    ph = phase(freq)
    out = np.zeros_like(ph)
    for k in range(1, 28):
        mask = (freq * k) < SR / 2.2
        out += mask * np.sin(k * ph) / k ** shape
    return out


def noise(n):
    return rng.standard_normal(n)


def bell(f, dur, decay=0.25, partials=((1, 1), (2.76, 0.35), (5.4, 0.12), (8.9, 0.05))):
    t = t_of(dur)
    return sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t / (decay / (1 + r * 0.6))) for r, a in partials) * np.minimum(1, t / 0.002)


def place(buf, clip, at):
    i = int(at * SR); j = min(len(buf), i + len(clip))
    buf[i:j] += clip[: j - i]
    return buf


def norm(x, peak=0.8):
    m = np.max(np.abs(x))
    return x * (peak / m) if m > 0 else x


# ── the clips ──

def harvest():
    d = 0.42; out = np.zeros(int(d * SR))
    for k in range(9):        # leafy crackles
        g = noise(int(0.03 * SR)) * env(int(0.03 * SR), 0.001, 0.008)
        place(out, bp(g, 2500 + rng.uniform(0, 2500), 9000) * rng.uniform(0.4, 1), 0.01 + k * 0.022 + rng.uniform(0, 0.01))
    sw = noise(len(out)) * env(len(out), 0.02, 0.09)
    out += bp(sw, 1200, 6000) * 0.35
    t = t_of(0.12); pl = np.sin(phase(np.linspace(520, 260, len(t)))) * env(len(t), 0.002, 0.04)
    place(out, pl * 0.9, 0.05)
    return norm(fade(out))


def pop():
    t = t_of(0.16); f = 380 + 900 * (1 - np.exp(-t / 0.025))
    x = np.sin(phase(f)) * env(len(t), 0.002, 0.05) + 0.25 * np.sin(2 * phase(f)) * env(len(t), 0.002, 0.03)
    x[:60] += noise(60) * 0.3
    return norm(fade(x))


def cluck():
    d = 0.52; out = np.zeros(int(d * SR))
    for at, f0, dur, amp in ((0.0, 430, 0.075, 0.8), (0.12, 400, 0.07, 0.7), (0.26, 520, 0.16, 1.0)):
        t = t_of(dur); f = f0 * (1 + 0.25 * np.exp(-t / 0.02)) * (1 - 0.18 * t / dur)
        src = glottal(f, 0.9) + 0.15 * noise(len(t))
        v = formants(src, ((800, 6, 1.0), (1700, 7, 0.8), (3000, 8, 0.35)))
        place(out, v * env(len(t), 0.004, dur * 0.45, dur * 0.25) * amp, at)
    return norm(fade(hp(out, 250)))


def moo():
    d = 1.25; t = t_of(d); k = t / d
    f0 = 112 + 38 * np.sin(np.pi * np.clip(k * 1.15, 0, 1)) ** 1.5 - 18 * k + 2.5 * np.sin(2 * np.pi * 5.2 * t) * k
    src = glottal(f0, 0.75) + 0.05 * noise(len(t))
    m = np.clip((k - 0.12) / 0.3, 0, 1)                         # mmm → ooo
    v1 = formants(src, ((260, 5, 1.0), (1000, 8, 0.15), (2300, 8, 0.08)))
    v2 = formants(src, ((560, 5, 1.0), (920, 6, 0.6), (2500, 8, 0.12)))
    a = np.minimum(1, t / 0.12) * np.clip((d - t) / 0.35, 0, 1) ** 1.2
    return norm(fade(lp(v1 * (1 - m) + v2 * m, 3200) * a))


def oink():
    d = 0.5; out = np.zeros(int(d * SR))
    for at, dur in ((0.0, 0.17), (0.24, 0.22)):
        t = t_of(dur); f = 210 * (1 + 0.35 * np.sin(np.pi * t / dur)) * (1 + 0.04 * noise(len(t)).cumsum() / np.sqrt(np.arange(1, len(t) + 1)))
        src = glottal(f, 0.6) * (0.75 + 0.25 * np.sign(np.sin(phase(np.full(len(t), 32))))) + 0.45 * noise(len(t))
        v = formants(src, ((450, 4, 1.0), (1200, 6, 0.6), (2600, 6, 0.2)))
        place(out, v * env(len(t), 0.01, dur * 0.5, dur * 0.3), at)
    return norm(fade(hp(out, 150)))


def coin():
    out = np.zeros(int(0.5 * SR))
    place(out, bell(1568, 0.25, 0.08), 0)
    place(out, bell(2093, 0.45, 0.22), 0.075)
    return norm(fade(out))


def tick():
    return norm(fade(bell(2637, 0.12, 0.04, ((1, 1), (2.76, 0.25), (5.4, 0.08)))), 0.7)


def coins():
    d = 1.0; out = np.zeros(int(d * SR)); notes = [1760, 2093, 2349, 2637, 3136, 2349, 2637, 3520]
    at = 0.0
    for i, f in enumerate(notes):
        place(out, bell(f * rng.uniform(0.995, 1.005), 0.4, 0.12) * (1 - i * 0.07), at)
        at += rng.uniform(0.045, 0.085)
    sh = bp(noise(len(out)), 6000, 14000) * env(len(out), 0.01, 0.25) * 0.08
    return norm(fade(out + sh))


def thud():
    t = t_of(0.4); x = np.sin(phase(70 + 80 * np.exp(-t / 0.03))) * env(len(t), 0.002, 0.12)
    knock = bp(noise(len(t)), 300, 1400) * env(len(t), 0.001, 0.025) * 0.8
    tock = np.sin(2 * np.pi * 620 * t) * env(len(t), 0.001, 0.03) * 0.25
    return norm(fade(x + knock + tock))


def brass(f, dur, amp=1.0):
    t = t_of(dur); fr = f * (1 + 0.006 * np.sin(2 * np.pi * 5.5 * t) * np.clip(t / 0.25, 0, 1))
    x = glottal(fr, 1.0)
    cutoff = 900 + 3200 * np.clip(t / 0.06, 0, 1) * np.exp(-t / 0.9)
    # time-varying low-pass in short blocks
    out = np.zeros_like(x); blk = 512
    zi = None
    for i in range(0, len(x), blk):
        sos = signal.butter(2, min(cutoff[i], SR / 2.3), fs=SR, output='sos')
        if zi is None: zi = signal.sosfilt_zi(sos) * 0
        out[i:i + blk], zi = signal.sosfilt(sos, x[i:i + blk], zi=zi)
    return out * env(len(t), 0.02, dur * 0.6, dur * 0.35) * amp


def level():
    d = 1.6; out = np.zeros(int(d * SR))
    for i, f in enumerate((523.25, 659.25, 783.99)):
        place(out, brass(f, 0.22, 0.8), i * 0.11)
    for f in (523.25, 659.25, 783.99, 1046.5):
        place(out, brass(f, 1.1, 0.55), 0.36)
    for i, f in enumerate((2093, 2637, 3136, 4186)):
        place(out, bell(f, 0.5, 0.18) * 0.25, 0.4 + i * 0.06)
    return norm(fade(out, 0.002, 0.15))


def cheer():
    d = 1.9; out = np.zeros(int(d * SR))
    for i, f in enumerate((392, 523.25, 659.25, 783.99, 1046.5)):
        place(out, brass(f, 0.2, 0.75), i * 0.085)
    for f in (392, 523.25, 659.25, 783.99, 1046.5):
        place(out, brass(f, 1.3, 0.5), 0.44)
    for i in range(10):
        place(out, bell(rng.choice([2093, 2349, 2637, 3136, 3520, 4186]), 0.5, 0.15) * 0.22, 0.45 + i * 0.05)
    return norm(fade(out, 0.002, 0.2))


def page():
    d = 0.38; t = t_of(d); x = noise(len(t))
    out = np.zeros_like(x); blk = 256
    for i in range(0, len(x), blk):
        c = 1200 + 4200 * (i / len(x))
        out[i:i + blk] = bp(x[max(0, i - 2048):i + blk], c * 0.6, min(c * 1.6, 15000))[-len(x[i:i + blk]):]
    a = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 1.5
    cr = np.zeros_like(x)
    for k in range(5): place(cr, hp(noise(200), 3000) * env(200, 0.0005, 0.002), 0.08 + k * 0.05 + rng.uniform(0, 0.02))
    return norm(fade(out * a + cr * 0.4))


def click():
    t = t_of(0.05); return norm(fade(np.sin(2 * np.pi * 1800 * t) * env(len(t), 0.0005, 0.008) + bp(noise(len(t)), 2000, 8000) * env(len(t), 0.0005, 0.004) * 0.4), 0.6)


def error():
    out = np.zeros(int(0.32 * SR))
    for at, f in ((0, 330), (0.11, 262)):
        t = t_of(0.18); x = signal.square(2 * np.pi * f * t, 0.4) * 0.5 + np.sin(2 * np.pi * f * t)
        place(out, lp(x, 1400) * env(len(t), 0.004, 0.06), at)
    return norm(fade(out), 0.6)


def brook(n):
    x = noise(n)
    base = lp(bp(x, 180, 1400) * 0.5 + bp(x, 1400, 3200) * 0.06, 2600, 4)
    mod = lp(noise(n), 3) * 6 + 1
    out = base * np.clip(mod, 0.4, 2.0)
    i = 0
    while i < n:                 # babble: little bubbles
        d = int(rng.uniform(0.015, 0.05) * SR); f0 = rng.uniform(500, 1500)
        t = np.arange(d) / SR; b = np.sin(phase(f0 * (1 + 2.5 * t / t[-1]))) * np.sin(np.pi * t / t[-1]) ** 2
        place(out, b * rng.uniform(0.08, 0.25), i / SR)
        i += int(rng.uniform(0.02, 0.09) * SR)
    return out


def chirp(f0, f1, dur, amp):
    t = t_of(dur); f = f0 + (f1 - f0) * (t / dur) ** 0.7
    return np.sin(phase(f) + 0.8 * np.sin(2 * np.pi * 70 * t)) * np.sin(np.pi * t / dur) ** 2 * amp


def ambience_day():
    d = 9.0; n = int(d * SR); out = brook(n) * 0.5
    for start in (0.6, 3.4, 6.6):
        at = start
        for k in range(rng.integers(3, 6)):
            f0 = rng.uniform(2800, 4200)
            place(out, chirp(f0, f0 * rng.uniform(1.15, 1.5), rng.uniform(0.05, 0.11), 0.45), at)
            at += rng.uniform(0.09, 0.16)
    for at in (1.9, 5.2, 7.9):   # a far trill
        for k in range(8): place(out, chirp(5200, 4600, 0.03, 0.14), at + k * 0.04)
    return norm(out, 0.6)


def ambience_night():
    d = 8.0; n = int(d * SR); out = brook(n) * 0.25; t = np.arange(n) / SR
    for f, rate, pulses, amp, off in ((4600, 2.6, 4, 0.18, 0.0), (4150, 1.9, 3, 0.12, 0.3)):
        gate = np.zeros(n)
        for c in np.arange(off, d, 1 / rate):
            for p in range(pulses):
                i = int((c + p * 0.034) * SR); j = min(n, i + int(0.022 * SR))
                if i < n: gate[i:j] = np.sin(np.linspace(0, np.pi, j - i))
        out += np.sin(2 * np.pi * f * t) * gate * amp
    return norm(out, 0.55)


CLIPS = {
    'harvest': harvest, 'pop': pop, 'cluck': cluck, 'moo': moo, 'oink': oink, 'coin': coin, 'tick': tick, 'coins': coins,
    'place': thud, 'level': level, 'cheer': cheer, 'page': page, 'click': click, 'error': error,
    'ambience-day': ambience_day, 'ambience-night': ambience_night,
}
RATE = {'ambience-day': '40k', 'ambience-night': '32k'}

if __name__ == '__main__':
    tmp = tempfile.mkdtemp()
    total = 0
    for name, make in CLIPS.items():
        x = np.clip(make(), -1, 1)
        wav = os.path.join(tmp, f'{name}.wav')
        with wave.open(wav, 'wb') as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x * 32767).astype('<i2').tobytes())
        out = os.path.join(OUT, f'{name}.m4a')
        subprocess.run([FFMPEG, '-y', '-loglevel', 'error', '-i', wav, '-c:a', 'aac', '-b:a', RATE.get(name, '48k'), '-ac', '1', '-movflags', '+faststart', '-map_metadata', '-1', '-fflags', '+bitexact', out], check=True)
        size = os.path.getsize(out); total += size
        print(f'{name:16s} {len(x) / SR:5.2f} s {size / 1024:6.1f} KB')
    print(f'total {total / 1024:.1f} KB')
