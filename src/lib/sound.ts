let ctx: AudioContext | null = null;
let lastAt = 0;

function audio() {
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return ctx;
}

function tone(f: number, d: number, v: number, t0: number, type: OscillatorType = 'sine') {
  const c = audio();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f, t0);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(v, t0 + 0.02);
  gain.gain.linearRampToValueAtTime(0, t0 + d);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + d);
}

export function playUiSound(kind: 'add' | 'remove' | 'order-confirm' | 'order-success' | 'order-error' | 'position-closed' | 'position-opened' | 'warning') {
  try {
    const pref = localStorage.getItem('mfapp.soundEnabled');
    if (pref === 'false') return;
    const c = audio();
    const now = Math.max(c.currentTime, lastAt + 0.01);
    lastAt = now;
    if (kind === 'add') {
      tone(920, 0.12, 0.08, now);
    } else if (kind === 'remove') {
      tone(340, 0.12, 0.08, now);
    } else if (kind === 'order-confirm') {
      tone(780, 0.14, 0.09, now);
    } else if (kind === 'order-success') {
      tone(900, 0.12, 0.08, now);
      tone(1100, 0.12, 0.08, now + 0.14);
    } else if (kind === 'order-error') {
      tone(260, 0.18, 0.09, now, 'triangle');
    } else if (kind === 'position-opened') {
      tone(600, 0.1, 0.08, now);
      tone(800, 0.1, 0.08, now + 0.12);
    } else if (kind === 'position-closed') {
      tone(800, 0.1, 0.08, now);
      tone(600, 0.1, 0.08, now + 0.12);
    } else if (kind === 'warning') {
      tone(700, 0.09, 0.08, now);
      tone(700, 0.09, 0.08, now + 0.14);
      tone(700, 0.09, 0.08, now + 0.28);
    }
  } catch {}
}
