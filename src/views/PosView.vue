<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { Store, Plus, Settings, Search, ScanBarcode, ShoppingBag, X } from '@lucide/vue';
import { useAuthStore } from '../stores/auth';
import { useCartStore } from '../stores/cart';
import { api, isAxiosError } from '../services/api';
import { useDebounce } from '../composables/useDebounce';
import { formatRupiah } from '../utils/formatters';
import { playBeep, playErrorBeep, speakText } from '../utils/audio';
import type { Category, PaginatedResponse, Product } from '../types';
import ProductCard from '../components/ProductCard.vue';
import CartPanel from '../components/CartPanel.vue';
import PaymentModal from '../components/PaymentModal.vue';
import BarcodeScannerModal from '../components/BarcodeScannerModal.vue';

const router = useRouter();
const auth = useAuthStore();
const cart = useCartStore();

// Products
const products = ref<Product[]>([]);
const categories = ref<Category[]>([]);
const selectedCategory = ref<number | null>(null);
const searchTerm = ref('');
const debouncedSearch = useDebounce(searchTerm, 300);
const isLoading = ref(false);
const page = ref(1);
const lastPage = ref(1);

// UI state
const showPayment = ref(false);
const showScanner = ref(false);
const showMobileCart = ref(false);
const barcodeError = ref<string | null>(null);
const isBarcodeLoading = ref(false);
const toast = ref<string | null>(null);

const roleLabel = computed(() =>
  auth.user?.role === 'admin' ? 'Admin' : 'Kasir'
);

const activeCategoryLabel = computed(() => {
  if (selectedCategory.value === null) return 'Semua';
  const cat = categories.value.find((c) => c.id === selectedCategory.value);
  return cat?.name || 'Semua';
});

const filteredProducts = computed(() => products.value);

async function fetchCategories(): Promise<void> {
  try {
    const res = await api.get<{ data: Category[] }>('/categories');
    categories.value = res.data.data;
  } catch {
    // silent fail
  }
}

async function fetchProducts(reset = false): Promise<void> {
  if (reset) {
    page.value = 1;
    products.value = [];
  }
  isLoading.value = true;
  try {
    const params: Record<string, string | number> = {
      page: page.value,
      per_page: 24,
    };
    if (debouncedSearch.value.trim()) {
      params.search = debouncedSearch.value.trim();
    }
    if (selectedCategory.value !== null) {
      params.category_id = selectedCategory.value;
    }
    const res = await api.get<PaginatedResponse<Product>>('/products', { params });
    products.value = reset ? res.data.data : [...products.value, ...res.data.data];
    lastPage.value = res.data.meta.last_page;
  } catch (err: unknown) {
    if (isAxiosError(err) && err.response?.status !== 401) {
      toast.value = 'Tidak dapat memuat produk';
    }
  } finally {
    isLoading.value = false;
  }
}

watch(debouncedSearch, () => fetchProducts(true));
watch(selectedCategory, () => fetchProducts(true));

function selectCategory(id: number | null): void {
  selectedCategory.value = id;
}

function handleAddToCart(product: Product): void {
  cart.addItem(product);
  playBeep();
  speakText(`${product.name} ditambahkan`);
  showToast(`"${product.name}" ditambahkan ke keranjang`);
}

async function handleBarcodeScanned(product: Product): Promise<void> {
  cart.addItem(product);
  showScanner.value = false;
  playBeep();
  speakText(`${product.name} ditemukan`);
  showToast(`Barcode ditemukan: "${product.name}" ditambahkan`);
}

async function handleSearchSubmit(): Promise<void> {
  const q = searchTerm.value.trim();
  if (!q) return;
  isBarcodeLoading.value = true;
  barcodeError.value = null;
  try {
    const res = await api.get<{ success: boolean; data: Product }>(
      `/products/barcode/${encodeURIComponent(q)}`
    );
    cart.addItem(res.data.data);
    searchTerm.value = '';
    playBeep();
    speakText(`${res.data.data.name} ditemukan`);
    showToast(`Barcode ditemukan: "${res.data.data.name}" ditambahkan`);
  } catch (err: unknown) {
    if (isAxiosError(err) && err.response?.status === 404) {
      barcodeError.value = `"${q}" tidak ditemukan sebagai barcode`;
      playErrorBeep();
      speakText(`Barcode ${q} tidak ditemukan`);
    } else {
      barcodeError.value = 'Tidak dapat terhubung ke server';
      playErrorBeep();
      speakText('Tidak dapat terhubung ke server');
    }
  } finally {
    isBarcodeLoading.value = false;
  }
}


function openPayment(): void {
  if (cart.items.length > 0) {
    showPayment.value = true;
  }
}

function onPaymentSuccess(): void {
  // PENTING: Jangan langsung tutup showPayment.value agar ReceiptModal tetap tampil!
  showMobileCart.value = false;
  showToast('Transaksi berhasil diproses');
  // Refresh stok produk
  fetchProducts(true);
}

function showToast(message: string): void {
  toast.value = message;
  setTimeout(() => {
    toast.value = null;
  }, 2500);
}

onMounted(async () => {
  await fetchCategories();
  await fetchProducts(true);
});

function loadMore(): void {
  if (page.value < lastPage.value && !isLoading.value) {
    page.value += 1;
    fetchProducts();
  }
}
</script>

<template>
  <div class="bg-[#f6fbf5] min-h-screen pb-24 md:pb-8 md:mr-[360px]">
    <!-- Top App Bar -->
    <header class="fixed top-0 w-full z-40 flex justify-between items-center px-4 sm:px-6 h-[56px] bg-white border-b border-[#e5e9e4]">
      <div class="flex items-center gap-2.5 min-w-0">
        <Store class="w-7 h-7 text-[#005d42] shrink-0" />
        <div class="min-w-0">
          <h1 class="text-[17px] font-bold text-[#181d1a] leading-tight truncate">Warung Pintar</h1>
          <p class="text-[11px] text-[#475569] font-medium leading-tight truncate">
            {{ auth.user?.name }} · {{ roleLabel }}
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2 shrink-0">
        <button
          @click="router.push('/products/create')"
          class="flex items-center justify-center gap-1.5 h-[38px] px-3.5 rounded-lg bg-[#EA580C] text-white font-bold text-[13px] shadow-sm hover:opacity-90 active:scale-95 transition-all"
        >
          <Plus class="w-4 h-4" />
          <span class="hidden sm:inline">Tambah Produk</span>
          <span class="sm:hidden">Produk</span>
        </button>
        <button
          @click="router.push('/settings')"
          class="flex items-center justify-center w-[38px] h-[38px] text-[#181d1a] hover:bg-[#f0f5f0] rounded-lg transition-transform active:scale-95 duration-200"
          aria-label="Pengaturan"
        >
          <Settings class="w-5 h-5" />
        </button>
      </div>
    </header>

    <!-- Main Content -->
    <main class="px-4 sm:px-6 max-w-7xl mx-auto flex flex-col gap-4 pt-[72px]">
      <!-- Toolbar: Combined Search / Barcode Input + Camera Scanner Button -->
      <section class="flex flex-col gap-2">
        <form @submit.prevent="handleSearchSubmit" class="flex gap-2 sm:gap-3">
          <div class="flex-1 relative">
            <Search class="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#3e4943]" />
            <input
              v-model="searchTerm"
              type="text"
              placeholder="Cari nama produk / ketik barcode + Enter..."
              class="w-full h-[48px] pl-12 pr-4 rounded-lg border-2 border-[#e5e9e4] bg-white focus:border-[#005d42] focus:ring-0 text-[14px] sm:text-[15px] font-bold shadow-sm transition-colors"
            />
          </div>
          <button
            type="button"
            @click="showScanner = true"
            class="w-[48px] h-[48px] bg-[#005d42] text-white rounded-lg flex items-center justify-center shadow-sm hover:bg-[#006c4e] active:scale-95 transition-transform duration-200 shrink-0"
            title="Scan lewat kamera HP / webcam"
            aria-label="Scan Barcode Kamera"
          >
            <ScanBarcode class="w-6 h-6" />
          </button>
        </form>
        <p v-if="barcodeError" class="text-[13px] font-bold text-[#DC2626]">
          {{ barcodeError }}
        </p>
      </section>

      <!-- Categories Chips -->
      <section class="flex overflow-x-auto gap-2 pb-1 hide-scrollbar">
        <button
          @click="selectCategory(null)"
          :class="[
            'min-w-fit px-4 h-[40px] rounded-full text-[14px] font-bold shadow-sm active:scale-95 transition-transform',
            selectedCategory === null
              ? 'bg-[#005d42] text-white'
              : 'bg-white text-[#181d1a] border border-[#e5e9e4] hover:bg-[#f0f5f0]'
          ]"
        >
          Semua
        </button>
        <button
          v-for="cat in categories"
          :key="cat.id"
          @click="selectCategory(cat.id)"
          :class="[
            'min-w-fit px-4 h-[40px] rounded-full text-[14px] font-bold shadow-sm active:scale-95 transition-transform',
            selectedCategory === cat.id
              ? 'bg-[#005d42] text-white'
              : 'bg-white text-[#181d1a] border border-[#e5e9e4] hover:bg-[#f0f5f0]'
          ]"
        >
          {{ cat.name }}
        </button>
      </section>

      <!-- Product Grid -->
      <section class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        <ProductCard
          v-for="product in filteredProducts"
          :key="product.id"
          :product="product"
          @add="handleAddToCart"
        />
      </section>

      <!-- Loading -->
      <div v-if="isLoading" class="flex justify-center py-6">
        <div class="animate-spin h-8 w-8 border-4 border-[#047857] border-t-transparent rounded-full"></div>
      </div>

      <!-- Empty state -->
      <div v-else-if="filteredProducts.length === 0" class="text-center py-10 text-[15px] text-[#475569]">
        Tidak ada produk yang cocok dengan pencarian "{{ searchTerm }}" pada kategori {{ activeCategoryLabel }}
      </div>

      <!-- Load more button -->
      <button
        v-if="page < lastPage"
        @click="loadMore"
        :disabled="isLoading"
        class="mx-auto px-6 h-[44px] bg-white border-2 border-[#e5e9e4] rounded-lg font-bold text-[#005d42] active:scale-95 transition-transform disabled:opacity-50"
      >
        Muat Lebih Banyak
      </button>
    </main>

    <!-- Mobile: Bottom Sheet Cart Trigger (fixed bar, above bottom nav) -->
    <div
      v-if="showMobileCart"
      class="fixed inset-0 z-40 bg-[#2c322e]/50"
      @click="showMobileCart = false"
    ></div>
    <div
      v-if="showMobileCart"
      class="fixed bottom-[56px] left-0 right-0 z-40 bg-white rounded-t-2xl shadow-[0_-4px_12px_rgba(0,0,0,0.1)] max-h-[75vh] flex flex-col md:hidden"
    >
      <button
        @click="showMobileCart = false"
        class="absolute top-3 right-3 p-2 text-[#475569]"
        aria-label="Tutup keranjang"
      >
        <X class="w-5 h-5" />
      </button>
      <div class="overflow-y-auto">
        <CartPanel @checkout="openPayment" />
      </div>
    </div>

    <!-- Desktop: Right Cart Panel -->
    <aside
      class="hidden md:block fixed right-0 top-[56px] bottom-0 w-[360px] bg-white border-l border-[#e5e9e4] shadow-lg z-30"
    >
      <CartPanel @checkout="openPayment" />
    </aside>

    <!-- Sticky Bottom Bar (Mobile) -->
    <div
      v-if="cart.totalItems > 0 && !showMobileCart"
      class="fixed bottom-[56px] inset-x-0 bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.1)] rounded-t-2xl z-40 border-t border-[#e5e9e4] p-3 md:hidden"
    >
      <button
        @click="showMobileCart = true"
        class="w-full h-[56px] bg-[#EA580C] text-white text-[16px] font-bold rounded-xl shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
      >
        <ShoppingBag class="w-5 h-5" />
        Lihat Keranjang ({{ cart.totalItems }}) — {{ formatRupiah(cart.total) }}
      </button>
    </div>

    <!-- Modals -->
    <PaymentModal
      :show="showPayment"
      @close="showPayment = false"
      @success="onPaymentSuccess"
    />
    <BarcodeScannerModal
      :show="showScanner"
      :on-scanned="handleBarcodeScanned"
      @close="showScanner = false"
    />
  </div>
</template>
