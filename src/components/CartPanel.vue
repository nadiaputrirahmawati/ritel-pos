<script setup lang="ts">
import { ref } from 'vue';
import { ShoppingBag, Trash2, CreditCard, Plus, Minus, AlertTriangle } from '@lucide/vue';
import { useCartStore } from '../stores/cart';
import { formatRupiah } from '../utils/formatters';
import type { CartItem } from '../types';

const cart = useCartStore();

const emit = defineEmits<{
  (e: 'checkout'): void;
}>();

const showClearConfirm = ref(false);
function canIncrement(item: CartItem): boolean {
  return item.quantity < item.product.stock_quantity;
}

function confirmClear(): void {
  cart.clear();
  showClearConfirm.value = false;
}
</script>

<template>
  <div class="flex flex-col h-full relative">
    <!-- Header -->
    <div class="flex items-center justify-between p-4 border-b border-[#e5e9e4] bg-white">
      <h2 class="text-[16px] font-bold text-[#181d1a] flex items-center gap-2">
        <ShoppingBag class="w-5 h-5 text-[#005d42]" />
        Keranjang
        <span
          v-if="cart.totalItems > 0"
          class="bg-[#005d42] text-white text-[12px] font-bold rounded-full min-w-[22px] h-[22px] flex items-center justify-center px-1.5"
        >
          {{ cart.totalItems }}
        </span>
      </h2>
      <button
        v-if="cart.items.length > 0"
        @click="showClearConfirm = true"
        class="flex items-center gap-1.5 text-[#DC2626] text-[13px] font-bold px-3 py-1.5 rounded-lg hover:bg-red-50 active:scale-95 transition-all"
      >
        <Trash2 class="w-4 h-4" />
        Kosongkan
      </button>
    </div>

    <!-- Empty state -->
    <div v-if="cart.items.length === 0" class="flex-1 flex flex-col items-center justify-center gap-3 text-center p-6">
      <div class="w-20 h-20 rounded-full bg-[#f0f5f0] flex items-center justify-center">
        <ShoppingBag class="w-10 h-10 text-[#005d42]/40" />
      </div>
      <p class="text-[15px] text-[#475569] font-medium max-w-[240px]">
        Keranjang masih kosong. Klik produk atau scan barcode untuk memulai.
      </p>
    </div>

    <!-- Cart items -->
    <div v-else class="flex-1 overflow-y-auto divide-y divide-[#e5e9e4]">
      <div v-for="item in cart.items" :key="item.product.id" class="p-4 flex flex-col gap-3 hover:bg-slate-50/50 transition-colors">
        <div class="flex items-start justify-between gap-3">
          <div class="flex-1 min-w-0">
            <p class="text-[14px] font-bold text-[#181d1a] leading-snug line-clamp-2">
              {{ item.product.name }}
            </p>
            <p class="text-[13px] text-[#475569] font-medium mt-0.5">
              {{ formatRupiah(item.product.price) }} / {{ item.product.unit || 'pcs' }}
            </p>
          </div>
          <button
            @click="cart.removeItem(item.product.id)"
            class="flex items-center gap-1 text-slate-400 hover:text-[#DC2626] hover:bg-red-50 rounded-lg px-2 py-1.5 text-[12px] font-bold active:scale-95 transition-all shrink-0"
            title="Hapus item"
            aria-label="Hapus item"
          >
            <Trash2 class="w-4 h-4" />
            Hapus
          </button>
        </div>

        <div class="flex items-center justify-between gap-3">
          <!-- Quantity stepper -->
          <div class="flex items-center gap-2">
            <button
              @click="cart.decrement(item.product.id)"
              class="w-[38px] h-[38px] rounded-xl bg-[#f0f5f0] text-[#181d1a] flex items-center justify-center active:scale-95 transition-transform shadow-sm hover:bg-gray-200"
              aria-label="Kurangi"
            >
              <Minus class="w-4 h-4" />
            </button>
            <span class="text-[16px] font-extrabold text-[#181d1a] min-w-[32px] text-center">
              {{ item.quantity }}
            </span>
            <button
              @click="cart.increment(item.product.id)"
              :disabled="!canIncrement(item)"
              class="w-[38px] h-[38px] rounded-xl bg-[#005d42] text-white flex items-center justify-center active:scale-95 transition-transform shadow-sm hover:bg-[#004d37] disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Tambah"
            >
              <Plus class="w-4 h-4" />
            </button>
          </div>
          <span class="text-[16px] font-extrabold text-[#181d1a]">
            {{ formatRupiah(item.quantity * item.product.price) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Footer: total + bayar -->
    <div class="border-t border-[#e5e9e4] p-4 flex flex-col gap-3 bg-white">
      <div class="flex items-center justify-between">
        <span class="text-[14px] font-medium text-[#475569]">
          Total Tagihan ({{ cart.totalItems }} Item)
        </span>
        <span class="text-[24px] font-extrabold text-[#047857] tracking-tight leading-none">
          {{ formatRupiah(cart.total) }}
        </span>
      </div>
      <button
        @click="emit('checkout')"
        :disabled="cart.items.length === 0"
        class="w-full h-[52px] bg-[#EA580C] text-white text-[16px] font-bold rounded-xl shadow-lg hover:bg-[#c2410c] active:scale-95 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <CreditCard class="w-5 h-5" />
        BAYAR
      </button>
    </div>

    <!-- Confirmation Dialog (Kosongkan Keranjang) — teleport ke body agar full layar & di tengah -->
    <Teleport to="body">
      <div
        v-if="showClearConfirm"
        class="fixed inset-0 z-[90] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
        @click.self="showClearConfirm = false"
      >
        <div class="bg-white rounded-2xl p-5 shadow-2xl max-w-sm w-full flex flex-col items-center text-center gap-3">
          <div class="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center text-[#DC2626]">
            <AlertTriangle class="w-7 h-7" />
          </div>
          <div>
            <h3 class="font-bold text-[17px] text-slate-800">Kosongkan Keranjang?</h3>
            <p class="text-[13px] text-slate-500 mt-1 leading-snug">
              Semua item yang ada di keranjang akan dihapus.
            </p>
          </div>
          <div class="flex gap-2 w-full mt-2">
            <button
              @click="showClearConfirm = false"
              class="flex-1 h-[44px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[14px] rounded-xl active:scale-95 transition-all"
            >
              Batal
            </button>
            <button
              @click="confirmClear"
              class="flex-1 h-[44px] bg-[#DC2626] hover:bg-red-700 text-white font-bold text-[14px] rounded-xl active:scale-95 transition-all"
            >
              Ya, Hapus
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
