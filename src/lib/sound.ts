'use client';

export type ChessSoundType =
  | 'move-self'
  | 'move-opponent'
  | 'capture'
  | 'castle'
  | 'check'
  | 'promote'
  | 'game-end';

const STORAGE_KEY = 'chessweb-sound-muted';

let audioCtx: AudioContext | null = null;
let noiseBuffer: AudioBuffer | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function getNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate) {
    return noiseBuffer;
  }
  const length = Math.floor(ctx.sampleRate * 0.12);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    // Pink-weighted noise for warmer wooden grain texture
    const white = Math.random() * 2 - 1;
    data[i] = white * Math.exp(-i / (ctx.sampleRate * 0.035));
  }
  noiseBuffer = buffer;
  return buffer;
}

/**
 * Synthesizes a realistic weighted wooden Staunton piece hitting a wooden board
 * using modal resonators (base thud + rosewood cavity knock + rim click transient).
 */
function triggerWoodTap(
  ctx: AudioContext,
  startTime: number,
  options: {
    pitchMultiplier?: number;
    gain?: number;
    sharpness?: number;
  } = {}
) {
  const pitch = options.pitchMultiplier ?? 1.0;
  const masterLevel = options.gain ?? 0.55;
  const sharpness = options.sharpness ?? 1.0;

  const out = ctx.createGain();
  out.gain.setValueAtTime(masterLevel, startTime);
  out.connect(ctx.destination);

  // 1. Weighted base thud (low wood resonance ~140Hz -> 92Hz)
  const baseOsc = ctx.createOscillator();
  const baseGain = ctx.createGain();
  baseOsc.type = 'sine';
  baseOsc.frequency.setValueAtTime(148 * pitch, startTime);
  baseOsc.frequency.exponentialRampToValueAtTime(92 * pitch, startTime + 0.045);

  baseGain.gain.setValueAtTime(0.001, startTime);
  baseGain.gain.linearRampToValueAtTime(0.65, startTime + 0.002);
  baseGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.055);

  baseOsc.connect(baseGain);
  baseGain.connect(out);
  baseOsc.start(startTime);
  baseOsc.stop(startTime + 0.06);

  // 2. Hollow boxwood/rosewood body knock (~345Hz -> 265Hz)
  const bodyOsc = ctx.createOscillator();
  const bodyGain = ctx.createGain();
  bodyOsc.type = 'triangle';
  bodyOsc.frequency.setValueAtTime(355 * pitch, startTime);
  bodyOsc.frequency.exponentialRampToValueAtTime(260 * pitch, startTime + 0.032);

  bodyGain.gain.setValueAtTime(0.001, startTime);
  bodyGain.gain.linearRampToValueAtTime(0.42 * sharpness, startTime + 0.0015);
  bodyGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.038);

  bodyOsc.connect(bodyGain);
  bodyGain.connect(out);
  bodyOsc.start(startTime);
  bodyOsc.stop(startTime + 0.042);

  // 3. Upper wood grain transient click (bandpass-filtered noise burst)
  const noiseSrc = ctx.createBufferSource();
  noiseSrc.buffer = getNoiseBuffer(ctx);

  const bandpass = ctx.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.frequency.setValueAtTime(1280 * pitch * sharpness, startTime);
  bandpass.Q.setValueAtTime(2.4, startTime);

  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.setValueAtTime(2600 * sharpness, startTime);

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.001, startTime);
  noiseGain.gain.linearRampToValueAtTime(0.75 * sharpness, startTime + 0.001);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.022);

  noiseSrc.connect(bandpass);
  bandpass.connect(lowpass);
  lowpass.connect(noiseGain);
  noiseGain.connect(out);

  noiseSrc.start(startTime);
  noiseSrc.stop(startTime + 0.028);
}

/**
 * Plays a Chess.com-style wooden sound effect for the given sound type.
 */
export function playChessSound(type: ChessSoundType): void {
  if (isSoundMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  switch (type) {
    case 'move-self': {
      triggerWoodTap(ctx, now, { pitchMultiplier: 1.0, gain: 0.55, sharpness: 1.0 });
      break;
    }

    case 'move-opponent': {
      // Slightly deeper wooden tone for opponent moves (matches Chess.com)
      triggerWoodTap(ctx, now, { pitchMultiplier: 0.91, gain: 0.55, sharpness: 0.95 });
      break;
    }

    case 'capture': {
      // Piece-on-piece clack followed immediately by heavier board impact
      triggerWoodTap(ctx, now, { pitchMultiplier: 1.38, gain: 0.42, sharpness: 1.35 });
      triggerWoodTap(ctx, now + 0.011, { pitchMultiplier: 0.86, gain: 0.68, sharpness: 1.25 });
      break;
    }

    case 'castle': {
      // Signature Chess.com double wooden tap (King then Rook)
      triggerWoodTap(ctx, now, { pitchMultiplier: 1.0, gain: 0.55, sharpness: 1.0 });
      triggerWoodTap(ctx, now + 0.072, { pitchMultiplier: 1.12, gain: 0.48, sharpness: 1.05 });
      break;
    }

    case 'check': {
      // Sharp wooden impact + resonant woodblock/marimba alert overtone
      triggerWoodTap(ctx, now, { pitchMultiplier: 1.15, gain: 0.58, sharpness: 1.2 });

      const chimeOsc = ctx.createOscillator();
      const chimeGain = ctx.createGain();
      chimeOsc.type = 'triangle';
      chimeOsc.frequency.setValueAtTime(587.33, now); // D5
      chimeOsc.frequency.setValueAtTime(783.99, now + 0.045); // G5

      chimeGain.gain.setValueAtTime(0.001, now);
      chimeGain.gain.linearRampToValueAtTime(0.18, now + 0.004);
      chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      chimeOsc.connect(chimeGain);
      chimeGain.connect(ctx.destination);
      chimeOsc.start(now);
      chimeOsc.stop(now + 0.17);
      break;
    }

    case 'promote': {
      // Rising double wooden knock
      triggerWoodTap(ctx, now, { pitchMultiplier: 1.0, gain: 0.52, sharpness: 1.05 });
      triggerWoodTap(ctx, now + 0.065, { pitchMultiplier: 1.28, gain: 0.6, sharpness: 1.15 });
      break;
    }

    case 'game-end': {
      // Final resonant double wood knock
      triggerWoodTap(ctx, now, { pitchMultiplier: 1.05, gain: 0.55, sharpness: 1.1 });
      triggerWoodTap(ctx, now + 0.095, { pitchMultiplier: 0.78, gain: 0.65, sharpness: 0.95 });
      break;
    }
  }
}

/**
 * Infers the appropriate Chess.com move sound from a move's SAN and color.
 */
export function playMoveSound(move: {
  san: string;
  turn?: 'w' | 'b';
}): void {
  const { san, turn } = move;
  if (!san) return;

  if (san.includes('#')) {
    playChessSound('check');
    setTimeout(() => playChessSound('game-end'), 90);
    return;
  }
  if (san.includes('+')) {
    playChessSound('check');
    return;
  }
  if (san.includes('=')) {
    playChessSound('promote');
    return;
  }
  if (san.startsWith('O-O')) {
    playChessSound('castle');
    return;
  }
  if (san.includes('x')) {
    playChessSound('capture');
    return;
  }

  playChessSound(turn === 'b' ? 'move-opponent' : 'move-self');
}

export function isSoundMuted(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setSoundMuted(muted: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, muted ? 'true' : 'false');
  } catch {
    // ignore storage errors
  }
}
