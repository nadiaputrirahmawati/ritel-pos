<script setup lang="ts">
import { ref, watch } from 'vue';
import { Zap, ZapOff, Focus, QrCode, X, AlertTriangle } from '@lucide/vue';
import { useBarcodeScanner } from '../composables/useBarcodeScanner';
import { api, isAxiosError } from '../services/api';
import type { Product } from '../types';

const props = defineProps<{
  show: boolean;
  onScanned: (product: Product) => void;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const {
  startScan,
  stopScan,
  handleTorchClick,
  triggerFocus,
  isTorchOn,
  scannerNotice,
} = useBarcodeScanner();

const searching = ref(false);
const notFound = ref(false);
const cameraError = ref<string | null>(null);
const scannerElementId = 'barcode-scanner-region';

watch(
  () => props.show,
  async (val) => {
    if (val) {
      notFound.value = false;
      cameraError.value = null;
      setTimeout(() => {
        startScan(
          scannerElementId,
          handleDecoded,
          { fps: 25, qrbox: { width: 280, height: 280 } }
        ).catch((err: unknown) => {
          cameraError.value = err instanceof Error ? err.message : 'Gagal membuka kamera';
        });
      }, 3000);
    } else {
      await stopScan();
    }
  }
);

async function handleDecoded(barcode: string): Promise<void> {
  if (searching.value) return;
  searching.value = true;
  notFound.value = false;
  try {
    const res = await api.get<{ success: boolean; data: Product }>(
      `/products/barcode/${encodeURIComponent(barcode)}`
    );
    const product = res.data.data;
    if (product) {
      await stopScan();
      props.onScanned(product);
    } else {
      notFound.value = true;
    }
  } catch (err: unknown) {
    if (isAxiosError(err) && err.response?.status === 404) {
      notFound.value = true;
    } else {
      cameraError.value = 'Tidak dapat terhubung ke server';
    }
  } finally {
    searching.value = false;
  }
}

async function handleClose(): Promise<void> {
  await stopScan();
  emit('close');
}

function handleCameraTap(): void {
  triggerFocus();
}
</script>

<template>
  <div
    v-if="show"
    class="fixed inset-0 z-[100] bg-slate-950 flex flex-col justify-between"
  >
    <!-- Top bar -->
    <header class="bg-[#047857] text-white h-[60px] flex items-center justify-between px-4 shadow-md shrink-0">
      <div class="flex items-center gap-2">
        <QrCode class="w-6 h-6 text-emerald-300" />
        <h1 class="text-[18px] font-bold">Scan Barcode Kasir</h1>
      </div>

      <!-- Controls: Flash Light & Focus -->
      <div class="flex items-center gap-2">
        <button
          type="button"
          @click="handleTorchClick"
          :class="[
            'p-2 rounded-xl border font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95',
            isTorchOn
              ? 'bg-amber-400 text-slate-900 border-amber-300 shadow-lg shadow-amber-400/20'
              : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
          ]"
          :title="isTorchOn ? 'Matikan Senter' : 'Nyalakan Senter'"
        >
          <Zap v-if="isTorchOn" class="w-4 h-4 fill-slate-900" />
          <ZapOff v-else class="w-4 h-4" />
          <span>{{ isTorchOn ? 'Senter ON' : 'Senter' }}</span>
        </button>

        <button
          type="button"
          @click="triggerFocus"
          class="p-2 bg-white/10 text-white hover:bg-white/20 rounded-xl border border-white/20 active:scale-95 transition-all flex items-center gap-1.5 text-xs font-semibold"
          title="Fokuskan Kamera"
        >
          <Focus class="w-4 h-4 text-emerald-300" />
          <span>Fokus</span>
        </button>
      </div>
    </header>

    <!-- Camera viewfinder -->
    <main class="flex-1 relative bg-black flex flex-col items-center justify-center p-4 overflow-hidden">
      <div class="relative z-10 flex flex-col items-center justify-center w-full max-w-sm">
        <!-- Spinner overlay when searching -->
        <div v-if="searching" class="mb-4 flex flex-col items-center bg-black/60 px-6 py-3 rounded-2xl backdrop-blur-md">
          <div class="animate-spin h-10 w-10 border-4 border-emerald-400 border-t-transparent rounded-full mb-2"></div>
          <span class="text-[16px] text-white font-bold">Mencari Produk...</span>
        </div>

        <!-- Camera region container with tap-to-focus -->
        <div
          @click="handleCameraTap"
          title="Klik untuk fokus kamera"
          class="relative cursor-pointer group rounded-2xl overflow-hidden border-2 border-emerald-400/80 shadow-[0_0_30px_rgba(52,211,153,0.3)] bg-black/50"
        >
          <div
            :id="scannerElementId"
            class="w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] relative overflow-hidden bg-transparent"
          ></div>

          <!-- Tap overlay tip -->
          <div class="absolute bottom-2 inset-x-0 text-center pointer-events-none">
            <span class="inline-flex items-center gap-1 bg-black/60 text-emerald-300 text-[11px] px-2.5 py-1 rounded-full backdrop-blur-sm border border-emerald-500/30">
              <Focus class="w-3 h-3" />
              Ketuk area kamera untuk fokus
            </span>
          </div>
        </div>

        <p class="mt-4 text-[14px] text-white/90 text-center font-medium bg-slate-900/80 px-4 py-1.5 rounded-full border border-white/10">
          Arahkan barcode ke dalam kotak kamera
        </p>

        <!-- Error toast: barcode not found -->
        <div
          v-if="notFound"
          class="w-full bg-red-600/90 text-white rounded-xl p-3 mt-4 flex items-center justify-center gap-2 shadow-lg text-sm font-bold animate-bounce"
        >
          <AlertTriangle class="w-5 h-5 shrink-0 text-amber-300" />
          <span>Barcode tidak ditemukan di sistem</span>
        </div>

        <!-- Notice toast (e.g. senter tidak didukung) -->
        <div
          v-if="scannerNotice"
          class="w-full bg-slate-800/95 text-emerald-200 rounded-xl p-3 mt-4 flex items-center justify-center gap-2 shadow-lg text-sm font-semibold border border-emerald-500/30"
        >
          <ZapOff class="w-5 h-5 shrink-0 text-amber-300" />
          <span>{{ scannerNotice }}</span>
        </div>

        <!-- Error toast: camera error -->
        <div
          v-if="cameraError"
          class="w-full bg-red-600/90 text-white rounded-xl p-3 mt-4 flex items-center justify-center gap-2 shadow-lg text-sm font-semibold"
        >
          <AlertTriangle class="w-5 h-5 shrink-0" />
          <span>{{ cameraError }}</span>
        </div>
      </div>
    </main>

    <!-- Bottom controls -->
    <footer class="bg-slate-900 border-t border-slate-800 w-full p-4 flex flex-col gap-2 shrink-0">
      <button
        type="button"
        @click="handleClose"
        class="w-full h-[50px] bg-red-600 hover:bg-red-700 text-white font-bold text-[16px] rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
      >
        <X class="w-5 h-5" />
        <span>BATAL</span>
      </button>
    </footer>
  </div>
</template>
