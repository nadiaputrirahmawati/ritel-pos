<script setup lang="ts">
import { computed } from 'vue';
import { Package, Archive } from '@lucide/vue';
import type { Product } from '../types';
import { formatRupiah } from '../utils/formatters';

const props = defineProps<{
  product: Product;
}>();

const emit = defineEmits<{
  (e: 'add', product: Product): void;
}>();

const categoryName = computed<string>(() => {
  return props.product.category?.name ?? `Kategori ${props.product.category_id}`;
});

const unitName = computed<string>(() => props.product.unit || 'pcs');

const stockLabel = computed<string>(() => {
  return props.product.stock_quantity <= 0 ? 'Habis' : String(props.product.stock_quantity);
});

const stockBadgeClass = computed<string>(() => {
  const s = props.product.stock_quantity;
  if (s <= 0) return 'bg-[#DC2626] text-white';
  if (s <= 5) return 'bg-[#FEF3C7] text-[#92400E] border border-[#F59E0B]/50';
  return 'bg-white text-[#047857] border border-[#047857]/30';
});

const stockTextClass = computed<string>(() => {
  return props.product.stock_quantity <= 5 ? 'text-[#DC2626]' : 'text-slate-400';
});

function handleClick(): void {
  if (props.product.stock_quantity > 0) {
    emit('add', props.product);
  }
}
</script>

<template>
  <button
    type="button"
    @click="handleClick"
    :disabled="product.stock_quantity <= 0"
    :class="[
      'group relative w-full bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-left cursor-pointer select-none transition-all duration-200 flex flex-col justify-between',
      product.stock_quantity > 0
        ? 'hover:border-[#047857]/50 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98]'
        : 'opacity-50 cursor-not-allowed'
    ]"
  >
    <!-- Badge Stok (tetap dipertahankan di pojok kanan atas) -->
    <span
      class="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold shadow-sm"
      :class="stockBadgeClass"
      :title="`Stok ${product.stock_quantity} ${unitName}`"
    >
      <Archive class="w-3 h-3 shrink-0" />
      {{ stockLabel }}
    </span>

    <!-- Ikon Box Lucide (w-12 h-12 bg-[#dff0e7] rounded-xl) -->
    <div
      class="w-12 h-12 bg-[#dff0e7] rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform"
    >
      <Package class="w-6 h-6 text-[#047857]" />
    </div>

    <!-- Nama Produk -->
    <p class="font-bold text-sm text-slate-800 leading-snug line-clamp-2" :title="product.name">
      {{ product.name }}
    </p>

    <!-- Sub-info: Kategori · Satuan -->
    <p class="text-[11px] text-slate-400 font-medium mt-1 truncate">
      {{ categoryName }} · {{ unitName }}
    </p>

    <!-- Baris Bawah: Harga + Stok -->
    <div class="flex items-center justify-between mt-3 pt-1 border-t border-slate-50">
      <span class="font-extrabold text-sm text-[#047857]">
        {{ formatRupiah(product.price) }}
      </span>
      <span class="text-[10px] font-bold" :class="stockTextClass">
        Stok: {{ product.stock_quantity }}
      </span>
    </div>
  </button>
</template>
