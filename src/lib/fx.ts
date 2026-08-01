/**
 * Sound + haptics for ColorZAO.
 * Audio is synthesised with the Web Audio API (no asset downloads) and the
 * whole module is a no-op during SSR or when the browser blocks audio.
 */

let ctx: AudioContext | null = null;
let muted = false;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** Must be called from a user gesture once so iOS unlocks audio. */
export function unlockAudio() {
  audio();
}

export function setMuted(value: boolean) {
  muted = value;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem("colorzao:muted", value ? "1" : "0");
    } catch {
      /* ignore */
    }
  }
}

export function isMuted() {
  return muted;
}

export function loadMutePreference() {
  if (typeof window === "undefined") return false;
  try {
    muted = window.localStorage.getItem("colorzao:muted") === "1";
  } catch {
    muted = false;
  }
  return muted;
}

function tone(
  freq: number,
  duration: number,
  type: OscillatorType = "sine",
  gain = 0.08,
  delay = 0,
) {
  const ac = audio();
  if (!ac || muted) return;
  const osc = ac.createOscillator();
  const amp = ac.createGain();
  const start = ac.currentTime + delay;
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  amp.gain.setValueAtTime(0.0001, start);
  amp.gain.exponentialRampToValueAtTime(gain, start + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(amp).connect(ac.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

let noiseBuffer: AudioBuffer | null = null;
let lastBrush = 0;

/** Soft filtered noise "brush" sound, rate-limited so drags stay pleasant. */
export function brushSound() {
  const ac = audio();
  if (!ac || muted) return;
  const now = performance.now();
  if (now - lastBrush < 110) return;
  lastBrush = now;

  if (!noiseBuffer) {
    const length = Math.floor(ac.sampleRate * 0.4);
    noiseBuffer = ac.createBuffer(1, length, ac.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
  }

  const src = ac.createBufferSource();
  src.buffer = noiseBuffer;
  const filter = ac.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 900 + Math.random() * 700;
  filter.Q.value = 0.7;
  const amp = ac.createGain();
  amp.gain.setValueAtTime(0.0001, ac.currentTime);
  amp.gain.exponentialRampToValueAtTime(0.035, ac.currentTime + 0.02);
  amp.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.18);
  src.connect(filter).connect(amp).connect(ac.destination);
  src.start();
  src.stop(ac.currentTime + 0.2);
}

export const sfx = {
  tap: () => tone(620, 0.06, "triangle", 0.05),
  brush: brushSound,
  milestone: () => tone(880, 0.09, "sine", 0.05),
  reveal: () => {
    tone(523.25, 0.22, "sine", 0.07);
    tone(659.25, 0.24, "sine", 0.06, 0.09);
    tone(783.99, 0.4, "sine", 0.06, 0.18);
  },
  smash: () => {
    tone(196, 0.16, "sawtooth", 0.05);
    tone(392, 0.24, "triangle", 0.06, 0.05);
  },
  pass: () => tone(330, 0.16, "sine", 0.045),
  success: () => {
    tone(659.25, 0.14, "sine", 0.06);
    tone(987.77, 0.3, "sine", 0.05, 0.1);
  },
  next: () => tone(440, 0.1, "triangle", 0.05),
};

type HapticStrength = "light" | "medium" | "heavy" | "success" | "warning";

const vibrationMap: Record<HapticStrength, number | number[]> = {
  light: 8,
  medium: 18,
  heavy: 32,
  success: [12, 40, 22],
  warning: [18, 60, 18],
};

/** Farcaster native haptics when available, otherwise the Vibration API. */
export async function haptic(strength: HapticStrength = "light") {
  if (typeof window === "undefined" || import.meta.env.SSR) return;
  try {
    const sdkModule = (await new Function("return import('@farcaster/miniapp-sdk')")()) as {
      sdk: {
        getCapabilities: () => Promise<string[]>;
        haptics: {
          notificationOccurred: (strength: string) => Promise<void>;
          impactOccurred: (strength: string) => Promise<void>;
        };
      };
    };
    const { sdk } = sdkModule;
    const capabilities = await sdk.getCapabilities().catch(() => [] as string[]);
    if (strength === "success" || strength === "warning") {
      if (capabilities.includes("haptics.notificationOccurred")) {
        await sdk.haptics.notificationOccurred(strength);
        return;
      }
    } else if (capabilities.includes("haptics.impactOccurred")) {
      await sdk.haptics.impactOccurred(strength);
      return;
    }
  } catch {
    /* not inside a Farcaster client */
  }
  try {
    navigator.vibrate?.(vibrationMap[strength]);
  } catch {
    /* unsupported */
  }
}
