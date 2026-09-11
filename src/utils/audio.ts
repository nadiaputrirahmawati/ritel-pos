// Web Audio API & Web Speech API utility for POS feedback

import { useAudioSettingsStore } from '../stores/audioSettings';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      audioCtx = new AudioCtx();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Pre-initialize / unlock AudioContext and Web Speech API on user interaction.
 * Web browsers block audio playback and speech synthesis until the user interacts with the page.
 */
export function initAudioOnUserInteraction(): void {
  if (typeof window === 'undefined') return;

  const unlock = () => {
    // 1. Resume Audio Context
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    // 2. Pre-warm SpeechSynthesis (speak silent/empty utterance to load voices and unlock engine)
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.getVoices();
        const silentUtterance = new SpeechSynthesisUtterance('');
        silentUtterance.volume = 0;
        window.speechSynthesis.speak(silentUtterance);
      } catch {
        // ignore
      }
    }

    // Remove listeners once unlocked
    window.removeEventListener('click', unlock);
    window.removeEventListener('keydown', unlock);
    window.removeEventListener('touchstart', unlock);
  };

  window.addEventListener('click', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });
  window.addEventListener('touchstart', unlock, { once: true });
}

/**
 * Play a pleasant scanner beep (high pitch sine chirp, standard POS sound)
 */
export function playBeep(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Frequency sweep from 1800Hz to 2400Hz (short crisp beep)
    osc.frequency.setValueAtTime(1800, now);
    osc.frequency.exponentialRampToValueAtTime(2400, now + 0.08);

    // Smooth envelope
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  } catch {
    // Audio context failed or blocked by browser policy
  }
}

/**
 * Play an error beep (two short lower pitch tones)
 */
export function playErrorBeep(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    [0, 0.1].forEach((delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(440, now + delay);

      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(0.15, now + delay + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.07);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + delay);
      osc.stop(now + delay + 0.07);
    });
  } catch {
    // ignore
  }
}

/**
 * Speak text using Web Speech API in Indonesian (id-ID)
 */
export function speakText(text: string): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  // Hormati pengaturan suara dari halaman Pengaturan
  const audioSettings = useAudioSettingsStore();
  if (!audioSettings.speechEnabled) return;

  const speak = () => {
    try {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'id-ID';
      utterance.rate = 1.05; // slightly faster for quick POS response
      utterance.pitch = 1.0;
      utterance.volume = audioSettings.speechVolume;

      window.speechSynthesis.speak(utterance);
    } catch {
      // Speech synthesis unavailable or blocked
    }
  };

  // Chrome loads voices asynchronously after page load; if none are ready yet,
  // wait for the voiceschanged event before speaking (otherwise speech is dropped).
  // IMPORTANT: guard against double-speak — `voiceschanged` can fire multiple times
  // and the fallback timer can race with it. Without the guard, `speak()` would run
  // twice, calling `cancel()` mid-speech and restarting the utterance from the start.
  if (window.speechSynthesis.getVoices().length === 0) {
    let spoken = false;
    let fallbackTimer: number | undefined;

    const onVoicesChanged = () => {
      if (spoken) return;
      spoken = true;
      window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
      if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer);
      speak();
    };

    fallbackTimer = window.setTimeout(() => {
      if (spoken) return;
      spoken = true;
      window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
      speak();
    }, 1000);

    window.speechSynthesis.addEventListener('voiceschanged', onVoicesChanged);
  } else {
    speak();
  }
}
