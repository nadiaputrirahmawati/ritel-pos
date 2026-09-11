<script setup lang="ts">
import { computed, ref } from 'vue';
import type { ReceiptData } from '../types';
import { encodeReceipt } from '../utils/escpos';
import { formatRupiah } from '../utils/formatters';
import { printViaBluetooth, printViaRawBt, printViaBrowser } from '../services/printer';

const props = defineProps<{
  receipt: ReceiptData;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const isPrinting = ref(false);
const status = ref<string | null>(null);
const statusIsError = ref(false);

const paperWidth = computed(() => (props.receipt.shop.paper_width === 80 ? 48 : 32));
const bytes = computed(() => encodeReceipt(props.receipt, paperWidth.value));

async function handleBluetoothPrint(): Promise<void> {
  isPrinting.value = true;
  status.value = null;
  statusIsError.value = false;
  try {
    await printViaBluetooth(bytes.value, (msg) => (status.value = msg));
    statusIsError.value = false;
  } catch (err: unknown) {
    status.value = err instanceof Error ? err.message : 'Gagal mencetak via Bluetooth';
    statusIsError.value = true;
  } finally {
    isPrinting.value = false;
  }
}

function handleRawBtPrint(): void {
  status.value = null;
  statusIsError.value = false;
  try {
    printViaRawBt(bytes.value);
    status.value = 'Membuka aplikasi RawBT di HP Android... Jika tidak ada respon, pastikan aplikasi RawBT terinstal.';
    statusIsError.value = false;
  } catch (err: unknown) {
    status.value = err instanceof Error ? err.message : 'Gagal membuka aplikasi RawBT';
    statusIsError.value = true;
  }
}

function handleBrowserPrint(): void {
  status.value = null;
  statusIsError.value = false;
  printViaBrowser();
}
</script>

<template>
  <div class="w-full flex flex-col md:flex-row">
    <!-- Struk Preview -->
    <div class="flex-1 p-4 md:p-5 bg-[#f6fbf5] flex flex-col md:border-r md:border-[#E2E8F0]">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-[16px] md:text-[17px] font-bold text-[#0F172A] flex items-center gap-2">
          <span class="material-symbols-outlined text-[#047857]">receipt_long</span>
          Cetak Struk
        </h2>
        <button
          @click="emit('close')"
          class="p-2 text-[#475569] hover:bg-gray-100 rounded-lg active:scale-95 transition-transform"
          aria-label="Tutup"
        >
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <!-- Struk Preview -->
      <div class="bg-white rounded-xl shadow-sm border border-[#E2E8F0] p-4 md:p-5 mx-auto w-full max-w-xs font-mono text-[12px] md:text-[13px] text-[#181d1a]">
        <div class="text-center mb-3 md:mb-4">
          <p class="text-[15px] md:text-[16px] font-bold">{{ receipt.shop.shop_name || 'Toko Saya' }}</p>
          <p v-if="receipt.shop.address" class="mt-1 break-words">{{ receipt.shop.address }}</p>
          <p v-if="receipt.shop.phone_number">{{ receipt.shop.phone_number }}</p>
          <p class="mt-2 font-bold">{{ receipt.order.invoice_number }}</p>
        </div>
        <div class="border-t border-dashed border-[#6e7a73] pt-2 mb-2 space-y-1">
          <div class="flex justify-between gap-2">
            <span>Tanggal:</span>
            <span class="text-right">{{ receipt.order.order_date }}</span>
          </div>
          <div class="flex justify-between gap-2">
            <span>Kasir:</span>
            <span class="text-right">{{ receipt.order.cashier }}</span>
          </div>
        </div>
        <div class="border-t border-dashed border-[#6e7a73] pt-2 space-y-2">
          <div v-for="(item, i) in receipt.order.items" :key="i" class="space-y-0.5">
            <p class="break-words">{{ item.name }}</p>
            <div class="flex justify-between gap-2">
              <span>{{ item.quantity }} x {{ formatRupiah(item.price) }}</span>
              <span class="shrink-0">{{ formatRupiah(item.total) }}</span>
            </div>
          </div>
        </div>
        <div class="border-t border-dashed border-[#6e7a73] pt-2 mt-2 flex justify-between gap-2 font-bold text-[14px] md:text-[15px]">
          <span>TOTAL</span>
          <span class="shrink-0">{{ formatRupiah(receipt.order.total) }}</span>
        </div>
        <template v-if="receipt.order.paid_amount !== undefined && receipt.order.change !== undefined">
          <div class="border-t border-dashed border-[#6e7a73] pt-2 mt-2 space-y-1">
            <div class="flex justify-between gap-2">
              <span>Bayar</span>
              <span class="shrink-0">{{ formatRupiah(receipt.order.paid_amount ?? 0) }}</span>
            </div>
            <div class="flex justify-between gap-2">
              <span>Kembalian</span>
              <span class="shrink-0 font-bold text-[#047857]">{{ formatRupiah(receipt.order.change ?? 0) }}</span>
            </div>
          </div>
        </template>
        <p v-if="receipt.shop.receipt_footer" class="text-center mt-3 md:mt-4">
          {{ receipt.shop.receipt_footer }}
        </p>
      </div>
    </div>

    <!-- Tombol Cetak + Status (kompak) -->
    <div class="w-full md:w-[260px] p-3 md:p-4 bg-white flex flex-col gap-2">
      <button
        @click="handleBluetoothPrint"
        :disabled="isPrinting"
        class="w-full h-[42px] bg-[#047857] text-white rounded-lg px-3 shadow-sm hover:bg-[#005d42] active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
      >
        <span class="material-symbols-outlined text-[18px]">bluetooth</span>
        <span class="text-left leading-none">
          <span class="block font-bold text-[13px]">Cetak Bluetooth</span>
          <span class="block text-[11px] opacity-80 mt-0.5">printer BLE</span>
        </span>
      </button>

      <button
        @click="handleRawBtPrint"
        class="w-full h-[42px] bg-[#EA580C] text-white rounded-lg px-3 shadow-sm hover:bg-[#a73a00] active:scale-95 transition-all flex items-center gap-2"
      >
        <span class="material-symbols-outlined text-[18px]">smartphone</span>
        <span class="text-left leading-none">
          <span class="block font-bold text-[13px]">Cetak RawBT</span>
          <span class="block text-[11px] opacity-80 mt-0.5">via HP Android</span>
        </span>
      </button>

      <button
        @click="handleBrowserPrint"
        class="w-full h-[42px] bg-[#0F766E] text-white rounded-lg px-3 shadow-sm hover:bg-[#0e5f59] active:scale-95 transition-all flex items-center gap-2"
      >
        <span class="material-symbols-outlined text-[18px]">print</span>
        <span class="text-left leading-none">
          <span class="block font-bold text-[13px]">Cetak Browser</span>
          <span class="block text-[11px] opacity-80 mt-0.5">printer biasa</span>
        </span>
      </button>

      <p
        v-if="status"
        class="text-[12px] font-medium rounded-lg p-2.5"
        :class="statusIsError ? 'bg-red-50 text-[#DC2626]' : 'bg-[#d1fae5] text-[#065f46]'"
      >
        {{ status }}
      </p>

      <div class="mt-auto pt-2">
        <button
          @click="emit('close')"
          class="w-full h-[44px] bg-[#EA580C] text-white text-[14px] font-bold rounded-lg shadow-md hover:bg-[#a73a00] active:scale-95 transition-all flex items-center justify-center gap-1.5"
        >
          <span class="material-symbols-outlined text-[20px]">add_circle</span>
          TRANSAKSI BARU
        </button>
      </div>
    </div>
  </div>
</template>
