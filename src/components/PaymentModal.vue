<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useCartStore } from '../stores/cart';
import { useShopStore } from '../stores/shop';
import { api, isAxiosError } from '../services/api';
import { formatRupiah, formatTanggalId } from '../utils/formatters';
import type { CheckoutPaymentInfo, CheckoutResponse, Order, ReceiptData } from '../types';
import ReceiptModal from './ReceiptModal.vue';

const props = defineProps<{
  show: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'success'): void;
}>();

const cart = useCartStore();
const shopStore = useShopStore();

const paidAmountText = ref<string>('');
const isSubmitting = ref(false);
const errorMessage = ref<string | null>(null);
const completedOrder = ref<Order | null>(null);
const completedPayment = ref<CheckoutPaymentInfo | null>(null);

const paidAmount = computed<number>(() => {
  const val = parseInt(paidAmountText.value, 10);
  return isNaN(val) ? 0 : val;
});

const changeAmount = computed<number>(() => {
  return paidAmount.value - cart.total;
});

const isPaymentValid = computed<boolean>(() => {
  return paidAmount.value >= cart.total;
});

function mapOrder(order: Order, payment?: CheckoutPaymentInfo | null): ReceiptData['order'] {
  return {
    invoice_number: order.invoice_number,
    order_date: formatTanggalId(order.order_date),
    cashier: order.cashier?.name ?? '-',
    total: order.total_amount,
    paid_amount: payment?.paid_amount,
    change: payment?.change,
    items: order.items.map((it) => ({
      name: it.product.name,
      quantity: it.quantity,
      price: it.price,
      total: it.total,
    })),
  };
}

const completedReceipt = computed<ReceiptData | null>(() => {
  if (!completedOrder.value) return null;
  const shop = shopStore.settings;
  return {
    shop: {
      shop_name: shop?.shop_name ?? 'Toko Saya',
      address: shop?.address ?? '',
      phone_number: shop?.phone_number ?? '',
      receipt_footer: shop?.receipt_footer ?? '',
      paper_width: shop?.paper_width ?? 58,
    },
    order: mapOrder(completedOrder.value, completedPayment.value),
  };
});

watch(
  () => props.show,
  (val) => {
    if (val) {
      paidAmountText.value = cart.total.toString();
      errorMessage.value = null;
      completedOrder.value = null;
      completedPayment.value = null;
      if (!shopStore.settings) {
        shopStore.fetchSettings();
      }
    }
  }
);

onMounted(() => {
  if (!shopStore.settings) {
    shopStore.fetchSettings();
  }
});

function appendNumber(digit: string): void {
  if (paidAmountText.value === '0') {
    paidAmountText.value = digit;
  } else {
    paidAmountText.value += digit;
  }
}

function clearAmount(): void {
  paidAmountText.value = '0';
}

function selectPreset(amount: number): void {
  paidAmountText.value = amount.toString();
}

async function handlePay(): Promise<void> {
  if (!isPaymentValid.value) return;

  isSubmitting.value = true;
  errorMessage.value = null;

  try {
    const payload = {
      items: cart.items.map((i) => ({
        product_id: i.product.id,
        quantity: i.quantity,
      })),
      paid_amount: paidAmount.value,
    };

    const res = await api.post<CheckoutResponse>('/pos/checkout', payload);
    if (res.data.success) {
      completedOrder.value = res.data.data;
      completedPayment.value = res.data.payment ?? null;
      cart.clear();
      emit('success');
    }
  } catch (err: unknown) {
    if (isAxiosError(err)) {
      errorMessage.value = err.response?.data?.message || 'Gagal memproses pembayaran';
    } else {
      errorMessage.value = 'Tidak dapat terhubung ke server';
    }
  } finally {
    isSubmitting.value = false;
  }
}

function handleNewTransaction(): void {
  completedOrder.value = null;
  emit('close');
}
</script>

<template>
  <div
    v-if="show"
    class="fixed inset-0 z-[70] overflow-y-auto"
  >
    <div
      class="flex min-h-full items-end md:items-center justify-center p-0 md:p-4 bg-[#2c322e]/60 backdrop-blur-sm"
    >
      <div
        class="bg-white rounded-t-3xl md:rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] md:max-h-[90vh] flex flex-col overflow-hidden"
      >
      <!-- Mode 1: Payment Numpad (Before success) -->
      <template v-if="!completedOrder">
        <!-- Scrollable Body: Numpad + Ringkasan -->
        <div class="flex flex-col md:flex-row overflow-y-auto flex-1 min-h-0">
        <!-- Left Column: Numpad & Live Change -->
        <div class="flex-1 p-4 md:p-6 flex flex-col bg-[#f6fbf5] border-b md:border-b-0 md:border-r border-[#E2E8F0]">
          <!-- Header -->
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-[18px] md:text-[20px] font-bold text-[#0F172A] flex items-center gap-2">
              <span class="material-symbols-outlined text-[#047857]">payments</span>
              Pembayaran Tunai
            </h2>
            <button
              @click="emit('close')"
              class="p-2 text-[#475569] hover:bg-gray-100 rounded-lg active:scale-95 transition-transform"
              aria-label="Tutup"
            >
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <!-- Total Display -->
          <div class="mb-3 text-center bg-white rounded-xl p-3 md:p-4 shadow-sm border border-[#E2E8F0]">
            <p class="text-[13px] md:text-[14px] text-[#475569] mb-1 font-medium">Total Tagihan</p>
            <h3 class="text-[24px] md:text-[28px] font-bold text-[#0F172A] leading-none">
              {{ formatRupiah(cart.total) }}
            </h3>
          </div>

          <!-- Uang Dibayar Input Display -->
          <div class="mb-3">
            <div
              :class="[
                'flex justify-between items-center bg-white border-2 rounded-xl px-4 h-[52px] md:h-[60px]',
                isPaymentValid ? 'border-[#047857]' : 'border-[#DC2626]'
              ]"
            >
              <span class="text-[15px] md:text-[16px] text-[#475569] font-medium">Uang Dibayar</span>
              <span class="text-[20px] md:text-[22px] font-extrabold text-[#0F172A]">
                {{ formatRupiah(paidAmount) }}
              </span>
            </div>
          </div>

          <!-- Live Change / Warning Display -->
          <div
            v-if="isPaymentValid"
            class="mb-3 rounded-xl p-3 md:p-4 bg-[#d1fae5] border-2 border-[#10b981] flex flex-col items-center justify-center shadow-inner"
          >
            <span class="text-[13px] md:text-[14px] text-[#065f46] font-medium">Kembalian</span>
            <span class="text-[22px] md:text-[24px] font-extrabold text-[#065f46] leading-none">
              {{ formatRupiah(changeAmount) }}
            </span>
          </div>
          <div
            v-else
            class="mb-3 rounded-xl p-3 bg-red-100 border-2 border-[#DC2626] flex items-center justify-center gap-2 text-[#DC2626] font-bold text-[15px]"
          >
            <span class="material-symbols-outlined text-[20px]">warning</span>
            <span>Uang dibayar kurang {{ formatRupiah(Math.abs(changeAmount)) }}</span>
          </div>

          <!-- Quick presets -->
          <div class="grid grid-cols-3 gap-2 mb-3">
            <button
              @click="selectPreset(cart.total)"
              class="py-2 px-2 bg-white rounded-lg border border-[#E2E8F0] font-bold text-[13px] md:text-[14px] hover:bg-gray-50 active:scale-95 transition-transform"
            >
              Uang Pas
            </button>
            <button
              @click="selectPreset(50000)"
              class="py-2 px-2 bg-white rounded-lg border border-[#E2E8F0] font-bold text-[13px] md:text-[14px] hover:bg-gray-50 active:scale-95 transition-transform"
            >
              Rp 50.000
            </button>
            <button
              @click="selectPreset(100000)"
              class="py-2 px-2 bg-white rounded-lg border border-[#E2E8F0] font-bold text-[13px] md:text-[14px] hover:bg-gray-50 active:scale-95 transition-transform"
            >
              Rp 100.000
            </button>
          </div>

          <!-- Error Alert from backend -->
          <div v-if="errorMessage" class="mb-3 bg-[#DC2626] text-white p-3 rounded-xl font-bold text-center text-sm">
            {{ errorMessage }}
          </div>

          <!-- Numpad Grid -->
          <div class="grid grid-cols-3 gap-2 mt-auto">
            <button
              v-for="num in ['1','2','3','4','5','6','7','8','9']"
              :key="num"
              @click="appendNumber(num)"
              class="h-[48px] md:h-[56px] bg-white rounded-xl border border-[#E2E8F0] shadow-sm active:scale-95 transition-transform text-[22px] md:text-[24px] font-bold text-[#0F172A] hover:bg-gray-50"
            >
              {{ num }}
            </button>
            <button
              @click="clearAmount"
              class="h-[48px] md:h-[56px] bg-[#ffdad6] text-[#93000a] rounded-xl border border-[#E2E8F0] shadow-sm active:scale-95 transition-transform text-[16px] font-bold hover:bg-[#ffb4ac]"
            >
              C
            </button>
            <button
              @click="appendNumber('0')"
              class="h-[48px] md:h-[56px] bg-white rounded-xl border border-[#E2E8F0] shadow-sm active:scale-95 transition-transform text-[22px] md:text-[24px] font-bold text-[#0F172A] hover:bg-gray-50"
            >
              0
            </button>
            <button
              @click="appendNumber('000')"
              class="h-[48px] md:h-[56px] bg-white rounded-xl border border-[#E2E8F0] shadow-sm active:scale-95 transition-transform text-[20px] md:text-[22px] font-bold text-[#0F172A] hover:bg-gray-50"
            >
              000
            </button>
          </div>

        </div>

        <!-- Right Column: Cart Item Summary preview -->
        <div class="w-full md:w-[360px] bg-white p-4 md:p-6 flex flex-col">
          <h3 class="text-[17px] md:text-[18px] font-bold text-[#0F172A] mb-3 pb-2 border-b border-[#E2E8F0]">
            Ringkasan Pesanan
          </h3>
          <div class="flex-1 space-y-2.5 pr-1">
            <div
              v-for="item in cart.items"
              :key="item.product.id"
              class="flex justify-between items-start text-sm"
            >
              <div>
                <p class="font-bold text-[#0F172A]">{{ item.product.name }}</p>
                <p class="text-[#475569] text-xs">{{ item.quantity }} x {{ formatRupiah(item.product.price) }}</p>
              </div>
              <span class="font-bold text-[#0F172A]">
                {{ formatRupiah(item.quantity * item.product.price) }}
              </span>
            </div>
          </div>
          <div class="border-t border-[#E2E8F0] pt-3 mt-3 space-y-2">
            <div class="flex justify-between text-base font-bold text-[#0F172A]">
              <span>Total</span>
              <span>{{ formatRupiah(cart.total) }}</span>
            </div>
          </div>
        </div>
        </div>
        <!-- end scrollable body -->

        <!-- Pinned Footer: Total + PROSES BAYAR (selalu terlihat di semua ukuran layar) -->
        <div class="border-t border-[#E2E8F0] bg-white p-3 md:p-4 shrink-0 flex items-center justify-between gap-3">
          <div class="hidden md:block">
            <p class="text-[12px] text-[#475569] font-medium">Total Tagihan</p>
            <p class="text-[22px] font-extrabold text-[#0F172A] leading-none">
              {{ formatRupiah(cart.total) }}
            </p>
          </div>
          <button
            @click="handlePay"
            :disabled="!isPaymentValid || isSubmitting"
            class="w-full md:w-[280px] h-[52px] md:h-[56px] bg-[#047857] text-white font-bold text-[16px] md:text-[17px] rounded-xl shadow-lg hover:bg-[#005d42] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span class="material-symbols-outlined text-[22px]">check_circle</span>
            {{ isSubmitting ? 'Memproses...' : 'PROSES BAYAR' }}
          </button>
        </div>
      </template>

      <!-- Mode 2: Struk + Opsi Cetak (After success) -->
      <template v-else>
        <div class="overflow-y-auto flex-1 min-h-0">
          <ReceiptModal
            v-if="completedReceipt"
            :receipt="completedReceipt"
            @close="handleNewTransaction"
          />
        </div>
      </template>
    </div>
    </div>
  </div>
</template>
