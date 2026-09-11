import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '../services/api';
import type { ShopSettings } from '../types';

export const useShopStore = defineStore('shop', () => {
  const settings = ref<ShopSettings | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchSettings(force = false) {
    if (settings.value && !force) return; // sudah dimuat — jangan fetch ulang
    loading.value = true;
    error.value = null;
    try {
      const { data } = await api.get<{ data: ShopSettings }>('/shop-settings');
      settings.value = data.data;
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Gagal memuat pengaturan toko';
      // JANGAN throw — kasir tetap bisa bekerja; struk fallback ke 'Toko Saya'
    } finally {
      loading.value = false;
    }
  }

  function clear() {
    settings.value = null;
  }

  return { settings, loading, error, fetchSettings, clear };
});
