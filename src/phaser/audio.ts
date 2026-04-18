// Procedural audio via WebAudio (no external assets)
let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let musicGain: GainNode | null = null;
let ambientNodes: { osc: OscillatorNode; gain: GainNode }[] = [];
let muted = false;
let masterVol = 0.6;
let musicVol = 0.4;

function ensure() {
  if (!ctx) {
    ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.gain.value = masterVol;
    masterGain.connect(ctx.destination);
    musicGain = ctx.createGain();
    musicGain.gain.value = musicVol;
    musicGain.connect(masterGain);
  }
  return ctx!;
}

export function setMuted(m: boolean) {
  muted = m;
  if (masterGain) masterGain.gain.value = m ? 0 : masterVol;
}
export function setMasterVolume(v: number) {
  masterVol = v;
  if (masterGain && !muted) masterGain.gain.value = v;
}
export function setMusicVolume(v: number) {
  musicVol = v;
  if (musicGain) musicGain.gain.value = v;
}
export function getAudioState() {
  return { muted, masterVol, musicVol };
}

function tone(freq: number, dur: number, type: OscillatorType = "sine", vol = 0.3) {
  if (muted) return;
  const c = ensure();
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0, c.currentTime);
  g.gain.linearRampToValueAtTime(vol, c.currentTime + 0.005);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
  osc.connect(g).connect(masterGain!);
  osc.start();
  osc.stop(c.currentTime + dur + 0.02);
}

export const sfx = {
  hit: () => tone(180, 0.12, "square", 0.25),
  shoot: () => tone(820, 0.08, "triangle", 0.18),
  enemyShoot: () => tone(420, 0.1, "sawtooth", 0.15),
  pickup: () => {
    tone(660, 0.07, "triangle", 0.2);
    setTimeout(() => tone(990, 0.09, "triangle", 0.18), 60);
  },
  levelup: () => {
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.15, "triangle", 0.22), i * 80));
  },
  die: () => tone(120, 0.4, "sawtooth", 0.3),
  victory: () => {
    [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => tone(f, 0.25, "triangle", 0.25), i * 130));
  },
  boss: () => {
    tone(80, 0.5, "sawtooth", 0.35);
    setTimeout(() => tone(60, 0.6, "sawtooth", 0.3), 100);
  },
  uiClick: () => tone(880, 0.05, "square", 0.12),
};

export function startAmbient(biome: number) {
  stopAmbient();
  const c = ensure();
  const baseFreqs = biome === 0 ? [55, 82] : biome === 1 ? [49, 73, 98] : [41, 62, 87];
  baseFreqs.forEach((f, i) => {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = i === 0 ? "sawtooth" : "sine";
    osc.frequency.value = f;
    g.gain.value = 0.05 - i * 0.01;
    osc.connect(g).connect(musicGain!);
    osc.start();
    ambientNodes.push({ osc, gain: g });
  });
}
export function stopAmbient() {
  ambientNodes.forEach(({ osc, gain }) => {
    try {
      gain.gain.linearRampToValueAtTime(0, ctx!.currentTime + 0.3);
      osc.stop(ctx!.currentTime + 0.4);
    } catch {}
  });
  ambientNodes = [];
}

export function unlockAudio() {
  ensure();
  if (ctx!.state === "suspended") ctx!.resume();
}
