// Tiny WebAudio beep — no assets needed
let ctx: AudioContext | null = null;
const getCtx = () => {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const C = window.AudioContext || (window as any).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  return ctx;
};

export const beep = (freq = 880, duration = 0.12, type: OscillatorType = "sine", volume = 0.15) => {
  const c = getCtx(); if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type; osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
  osc.connect(gain).connect(c.destination);
  osc.start(); osc.stop(c.currentTime + duration);
};

export const successChime = () => {
  beep(880, 0.1, "sine", 0.18);
  setTimeout(() => beep(1320, 0.16, "sine", 0.18), 110);
};

export const errorBuzz = () => beep(220, 0.25, "square", 0.12);
