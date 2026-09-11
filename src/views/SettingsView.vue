<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import {
  ArrowLeft,
  Store,
  RefreshCw,
  Trash2,
  LogOut,
  AlertTriangle,
  CheckCircle2,
  User,
  Printer,
  MapPin,
  Phone,
  FileText,
  Volume2,
  VolumeX,
  Settings as SettingsIcon,
} from '@lucide/vue';
import { useAuthStore } from '../stores/auth';
import { useCartStore } from '../stores/cart';
import { useShopStore } from '../stores/shop';
import { useAudioSettingsStore } from '../stores/audioSettings';
import { api } from '../services/api';

const router = useRouter();
const auth = useAuthStore();
const cart = useCartStore();
const shop = useShopStore();
const audioSettings = useAudioSettingsStore();

const syncing = ref(false);
const clearing = ref(false);
const loggingOut = ref(false);
const showLogoutConfirm = ref(false);
const toast = ref<{ type: 'success' | 'error'; message: string } | null>(null);

const roleLabel = computed(() =>
  auth.user?.role === 'admin' ? 'Admin' : 'Kasir'
);

const paperWidthLabel = computed(() =>
  shop.settings?.paper_width === 80 ? '80mm (lebar)' : '58mm (umum)'
);

function showToast(type: 'success' | 'error', message: string): void {
  toast.value = { type, message };
  setTimeout(() => {
    toast.value = null;
  }, 3000);
}

async function handleSync(): Promise<void> {
  syncing.value = true;
  try {
    await shop.fetchSettings(true);
    if (shop.error) {
      showToast('error', 'Sinkronisasi gagal: ' + shop.error);
    } else {
      showToast('success', 'Data toko berhasil disinkronkan dari server');
    }
  } finally {
    syncing.value = false;
  }
}

function handleClearCache(): void {
  clearing.value = true;
  try {
    // Hapus data lokal toko + keranjang, tanpa menghapus sesi login
    shop.clear();
    cart.clear();
    // Hapus cache localStorage selain token & data user (agar tidak logout)
    const keep = ['pos_token', 'pos_user'];
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && !keep.includes(key)) keys.push(key);
    }
    for (const key of keys) localStorage.removeItem(key);
    showToast('success', 'Cache lokal berhasil dibersihkan');
  } catch {
    showToast('error', 'Gagal membersihkan cache');
  } finally {
    clearing.value = false;
  }
}

async function handleLogout(): Promise<void> {
  loggingOut.value = true;
  showLogoutConfirm.value = false;
  try {
    try {
      await api.post('/auth/logout');
    } catch {
      // abaikan — tetap logout lokal
    }
    auth.clearAuth();
    cart.clear();
    shop.clear();
    router.push('/login');
  } finally {
    loggingOut.value = false;
  }
}
</script>

<template>
  <div class="bg-[#f6fbf5] min-h-screen pb-24 md:pb-8">
    <!-- Header -->
    <header class="fixed top-0 w-full z-40 flex items-center gap-2 px-4 sm:px-6 h-[56px] bg-white border-b border-[#e5e9e4]">
      <button
        @click="router.push('/')"
        class="flex items-center justify-center w-[38px] h-[38px] text-[#181d1a] hover:bg-[#f0f5f0] rounded-lg active:scale-95 transition-all"
        aria-label="Kembali ke kasir"
      >
        <ArrowLeft class="w-5 h-5" />
      </button>
      <div class="flex items-center gap-2">
        <SettingsIcon class="w-6 h-6 text-[#005d42]" />
        <h1 class="text-[17px] font-bold text-[#181d1a] leading-tight">Pengaturan</h1>
      </div>
    </header>

    <!-- Toast -->
    <div
      v-if="toast"
      class="fixed top-[64px] inset-x-0 z-50 flex justify-center px-4 pointer-events-none"
    >
      <div
        class="flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-white text-[13px] font-bold"
        :class="toast.type === 'success' ? 'bg-[#047857]' : 'bg-[#DC2626]'"
      >
        <CheckCircle2 v-if="toast.type === 'success'" class="w-4 h-4 shrink-0" />
        <AlertTriangle v-else class="w-4 h-4 shrink-0" />
        {{ toast.message }}
      </div>
    </div>

    <main class="max-w-lg mx-auto px-4 sm:px-6 pt-[80px] flex flex-col gap-4">
      <!-- Akun yang login -->
      <section class="bg-white rounded-xl border border-[#e5e9e4] p-4 flex items-center gap-3">
        <div class="w-12 h-12 rounded-full bg-[#005d42] text-white flex items-center justify-center shrink-0">
          <User class="w-6 h-6" />
        </div>
        <div class="min-w-0">
          <p class="text-[15px] font-bold text-[#181d1a] truncate">{{ auth.user?.name || 'Pengguna' }}</p>
          <p class="text-[13px] text-[#475569] font-medium truncate">{{ auth.user?.email }} · {{ roleLabel }}</p>
        </div>
      </section>

      <!-- Sinkronisasi data toko -->
      <section class="bg-white rounded-xl border border-[#e5e9e4] p-4 flex flex-col gap-3">
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-xl bg-[#005d42]/10 text-[#005d42] flex items-center justify-center shrink-0">
            <Store class="w-5 h-5" />
          </div>
          <div class="flex-1 min-w-0">
            <h2 class="text-[15px] font-bold text-[#181d1a]">Data Toko</h2>
            <p class="text-[13px] text-[#475569] font-medium leading-snug">
              Nama toko, alamat, telepon, dan teks struk untuk keperluan cetak. Sinkronkan untuk mengambil data terbaru dari server.
            </p>
          </div>
        </div>

        <!-- Detail data toko -->
        <div v-if="shop.settings" class="rounded-lg bg-[#f0f5f0] p-3 flex flex-col gap-2">
          <p class="text-[14px] font-bold text-[#181d1a] flex items-center gap-2">
            <Store class="w-4 h-4 text-[#005d42] shrink-0" />
            {{ shop.settings.shop_name || 'Toko Saya' }}
          </p>
          <p v-if="shop.settings.address" class="text-[13px] text-[#475569] font-medium flex items-start gap-2">
            <MapPin class="w-4 h-4 text-[#005d42] shrink-0 mt-0.5" />
            {{ shop.settings.address }}
          </p>
          <p v-if="shop.settings.phone_number" class="text-[13px] text-[#475569] font-medium flex items-center gap-2">
            <Phone class="w-4 h-4 text-[#005d42] shrink-0" />
            {{ shop.settings.phone_number }}
          </p>
          <p v-if="shop.settings.receipt_footer" class="text-[13px] text-[#475569] font-medium flex items-center gap-2">
            <FileText class="w-4 h-4 text-[#005d42] shrink-0" />
            {{ shop.settings.receipt_footer }}
          </p>
          <p class="text-[13px] text-[#475569] font-medium flex items-center gap-2">
            <Printer class="w-4 h-4 text-[#005d42] shrink-0" />
            Lebar kertas struk: {{ paperWidthLabel }}
          </p>
        </div>
        <p v-else class="text-[13px] text-[#475569] font-medium">
          Belum ada data toko. Tekan "Sinkronkan" untuk mengambil data dari server.
        </p>

        <button
          @click="handleSync"
          :disabled="syncing"
          class="w-full h-[46px] bg-[#005d42] text-white text-[14px] font-bold rounded-xl shadow-sm hover:bg-[#004d37] active:scale-95 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': syncing }" />
          {{ syncing ? 'Menyinkronkan...' : 'Sinkronkan Data Toko' }}
        </button>
      </section>

      <!-- Suara & Audio -->
      <section class="bg-white rounded-xl border border-[#e5e9e4] p-4 flex flex-col gap-3">
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-xl bg-[#005d42]/10 text-[#005d42] flex items-center justify-center shrink-0">
            <Volume2 class="w-5 h-5" />
          </div>
          <div class="flex-1 min-w-0">
            <h2 class="text-[15px] font-bold text-[#181d1a]">Suara & Audio</h2>
            <p class="text-[13px] text-[#475569] font-medium leading-snug">
              Atur suara ucapan (speech) saat produk ditambahkan atau barcode dipindai.
            </p>
          </div>
        </div>

        <!-- Toggle suara ucapan -->
        <div class="flex items-center justify-between gap-3 rounded-lg bg-[#f0f5f0] p-3">
          <div class="flex items-center gap-2 min-w-0">
            <VolumeX
              v-if="!audioSettings.speechEnabled"
              class="w-4 h-4 text-[#6e7a73] shrink-0"
            />
            <Volume2
              v-else
              class="w-4 h-4 text-[#005d42] shrink-0"
            />
            <div class="min-w-0">
              <p class="text-[14px] font-bold text-[#181d1a]">Suara Ucapan (Speech)</p>
              <p class="text-[12px] text-[#475569] font-medium">
                {{ audioSettings.speechEnabled ? 'Aktif' : 'Mati' }}
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            :aria-checked="audioSettings.speechEnabled"
            :aria-label="audioSettings.speechEnabled ? 'Matikan suara ucapan' : 'Nyalakan suara ucapan'"
            @click="audioSettings.setSpeechEnabled(!audioSettings.speechEnabled)"
            class="relative w-[52px] h-[30px] rounded-full transition-colors duration-200 shrink-0"
            :class="audioSettings.speechEnabled ? 'bg-[#005d42]' : 'bg-[#cbd5d1]'"
          >
            <span
              class="absolute top-[3px] w-[24px] h-[24px] rounded-full bg-white shadow-md transition-all duration-200"
              :class="audioSettings.speechEnabled ? 'left-[25px]' : 'left-[3px]'"
            ></span>
          </button>
        </div>

        <!-- Slider volume -->
        <div
          v-if="audioSettings.speechEnabled"
          class="rounded-lg bg-[#f0f5f0] p-3 flex flex-col gap-2"
        >
          <div class="flex items-center justify-between">
            <p class="text-[14px] font-bold text-[#181d1a] flex items-center gap-2">
              <Volume2 class="w-4 h-4 text-[#005d42] shrink-0" />
              Volume Suara
            </p>
            <span class="text-[13px] font-bold text-[#005d42]">
              {{ Math.round(audioSettings.speechVolume * 100) }}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            :value="audioSettings.speechVolume"
            @input="audioSettings.setSpeechVolume(Number(($event.target as HTMLInputElement).value))"
            class="w-full accent-[#005d42]"
            aria-label="Volume suara ucapan"
          />
        </div>
      </section>

      <!-- Bersihkan cache -->
      <section class="bg-white rounded-xl border border-[#e5e9e4] p-4 flex flex-col gap-3">
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-xl bg-[#EA580C]/10 text-[#EA580C] flex items-center justify-center shrink-0">
            <Trash2 class="w-5 h-5" />
          </div>
          <div class="flex-1 min-w-0">
            <h2 class="text-[15px] font-bold text-[#181d1a]">Bersihkan Cache</h2>
            <p class="text-[13px] text-[#475569] font-medium leading-snug">
              Menghapus cache lokal (data toko & keranjang) tanpa keluar dari akun. Berguna saat data tampak usang.
            </p>
          </div>
        </div>
        <button
          @click="handleClearCache"
          :disabled="clearing"
          class="w-full h-[46px] bg-white border-2 border-[#EA580C] text-[#EA580C] text-[14px] font-bold rounded-xl hover:bg-[#EA580C]/5 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Trash2 class="w-4 h-4" />
          {{ clearing ? 'Membersihkan...' : 'Bersihkan Cache' }}
        </button>
      </section>

      <!-- Keluar -->
      <section class="bg-white rounded-xl border border-[#e5e9e4] p-4 flex flex-col gap-3">
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-xl bg-[#DC2626]/10 text-[#DC2626] flex items-center justify-center shrink-0">
            <LogOut class="w-5 h-5" />
          </div>
          <div class="flex-1 min-w-0">
            <h2 class="text-[15px] font-bold text-[#181d1a]">Keluar</h2>
            <p class="text-[13px] text-[#475569] font-medium leading-snug">
              Akhiri sesi kasir dan kembali ke halaman login.
            </p>
          </div>
        </div>
        <button
          @click="showLogoutConfirm = true"
          :disabled="loggingOut"
          class="w-full h-[46px] bg-[#DC2626] text-white text-[14px] font-bold rounded-xl shadow-sm hover:bg-red-700 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <LogOut class="w-4 h-4" />
          {{ loggingOut ? 'Keluar...' : 'Keluar dari Akun' }}
        </button>
      </section>
    </main>

    <!-- Konfirmasi logout -->
    <Teleport to="body">
      <div
        v-if="showLogoutConfirm"
        class="fixed inset-0 z-[90] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
        @click.self="showLogoutConfirm = false"
      >
        <div class="bg-white rounded-2xl p-5 shadow-2xl max-w-sm w-full flex flex-col items-center text-center gap-3">
          <div class="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center text-[#DC2626]">
            <AlertTriangle class="w-7 h-7" />
          </div>
          <div>
            <h3 class="font-bold text-[17px] text-slate-800">Keluar dari Akun?</h3>
            <p class="text-[13px] text-slate-500 mt-1 leading-snug">
              Anda akan kembali ke halaman login. Sesi kasir saat ini akan diakhiri.
            </p>
          </div>
          <div class="flex gap-2 w-full mt-2">
            <button
              @click="showLogoutConfirm = false"
              class="flex-1 h-[44px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[14px] rounded-xl active:scale-95 transition-all"
            >
              Batal
            </button>
            <button
              @click="handleLogout"
              :disabled="loggingOut"
              class="flex-1 h-[44px] bg-[#DC2626] hover:bg-red-700 text-white font-bold text-[14px] rounded-xl active:scale-95 transition-all disabled:opacity-50"
            >
              {{ loggingOut ? 'Keluar...' : 'Ya, Keluar' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
