import { defineStore } from 'pinia';
import { ref } from 'vue';

const SPEECH_ENABLED_KEY = 'pos_speech_enabled';
const SPEECH_VOLUME_KEY = 'pos_speech_volume';

function loadBoolean(key: string, fallback: boolean): boolean {
  const raw = localStorage.getItem(key);
  if (raw === null) return fallback;
  return raw === '1' || raw === 'true';
}

function loadNumber(key: string, fallback: number): number {
  const raw = localStorage.getItem(key);
  if (raw === null) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : fallback;
}

export const useAudioSettingsStore = defineStore('audioSettings', () => {
  const speechEnabled = ref<boolean>(loadBoolean(SPEECH_ENABLED_KEY, true));
  const speechVolume = ref<number>(loadNumber(SPEECH_VOLUME_KEY, 1));

  function setSpeechEnabled(value: boolean): void {
    speechEnabled.value = value;
    localStorage.setItem(SPEECH_ENABLED_KEY, value ? '1' : '0');
    // Hentikan ucapan yang sedang berjalan saat dimatikan
    if (!value && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  function setSpeechVolume(value: number): void {
    speechVolume.value = Math.min(1, Math.max(0, value));
    localStorage.setItem(SPEECH_VOLUME_KEY, String(speechVolume.value));
  }

  return { speechEnabled, speechVolume, setSpeechEnabled, setSpeechVolume };
});