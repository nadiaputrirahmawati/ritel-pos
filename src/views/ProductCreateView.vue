<script setup lang="ts">
import { ref, onMounted, computed, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import {
  ArrowLeft,
  Package,
  Tag,
  Banknote,
  Boxes,
  ScanBarcode,
  Save,
  AlertTriangle,
  CheckCircle2,
  Barcode as BarcodeIcon,
  Sparkles,
  X,
  Zap,
  ZapOff,
  Focus,
} from '@lucide/vue';
import { api, isAxiosError } from '../services/api';
import type { Category, CreateProductPayload, Product } from '../types';
import { useBarcodeScanner } from '../composables/useBarcodeScanner';

const router = useRouter();
const {
  startScan,
  stopScan,
  handleTorchClick,
  triggerFocus,
  isTorchOn,
  scannerNotice,
} = useBarcodeScanner();

const categories = ref<Category[]>([]);
const isLoadingCategories = ref(false);
const isSubmitting = ref(false);
const toast = ref<string | null>(null);
const formError = ref<string | null>(null);
const errors = ref<Record<string, string[]>>({});
const showScanner = ref(false);
const cameraError = ref<string | null>(null);
const scannerElementId = 'product-create-scanner-region';

const nameInputRef = ref<HTMLInputElement | null>(null);

const form = ref<CreateProductPayload>({
  category_id: 0,
  name: '',
  sku: '',
  barcode: '',
  cost_price: 0,
  price: 0,
  stock_quantity: 0,
  unit: 'pcs',
});

const unitOptions = ['pcs', 'pack', 'botol', 'kg', 'liter', 'dus', 'sachet', 'porsi', 'kaleng', 'bungkus'];

const priceTooLow = computed(() => {
  return form.value.price > 0 && form.value.cost_price > form.value.price;
});

const estimatedProfit = computed(() => {
  if (form.value.price > 0 && form.value.cost_price > 0) {
    return form.value.price - form.value.cost_price;
  }
  return 0;
});

const profitPercentage = computed(() => {
  if (form.value.cost_price > 0 && estimatedProfit.value > 0) {
    return Math.round((estimatedProfit.value / form.value.cost_price) * 100);
  }
  return 0;
});

async function fetchCategories(): Promise<void> {
  isLoadingCategories.value = true;
  try {
    const res = await api.get<{ data: Category[] }>('/categories');
    categories.value = res.data.data;
  } catch {
    formError.value = 'Gagal memuat daftar kategori';
  } finally {
    isLoadingCategories.value = false;
  }
}

function validate(): boolean {
  errors.value = {};
  let ok = true;

  if (!form.value.name.trim()) {
    errors.value.name = ['Nama produk wajib diisi'];
    ok = false;
  }
  if (!form.value.category_id) {
    errors.value.category_id = ['Pilih salah satu kategori'];
    ok = false;
  }
  if (form.value.cost_price <= 0) {
    errors.value.cost_price = ['Harga beli harus lebih dari 0'];
    ok = false;
  }
  if (form.value.price <= 0) {
    errors.value.price = ['Harga jual harus lebih dari 0'];
    ok = false;
  } else if (form.value.price < form.value.cost_price) {
    errors.value.price = ['Harga jual tidak boleh kurang dari harga beli'];
    ok = false;
  }

  return ok;
}

async function handleSubmit(): Promise<void> {
  if (!validate()) return;
  isSubmitting.value = true;
  formError.value = null;

  const payload: CreateProductPayload = {
    ...form.value,
    barcode: form.value.barcode?.trim() || null,
    sku: form.value.sku?.trim() || null,
  };

  try {
    const res = await api.post<{ success: boolean; message: string; data: Product }>(
      '/products',
      payload
    );
    if (res.data.success) {
      showToast(res.data.message || 'Produk berhasil disimpan!');
      resetForm();
    }
  } catch (err: unknown) {
    if (isAxiosError(err)) {
      if (err.response?.status === 422 && err.response.data.errors) {
        errors.value = err.response.data.errors;
        formError.value = err.response.data.message;
      } else {
        formError.value = err.response?.data?.message || 'Gagal menyimpan produk';
      }
    } else {
      formError.value = 'Tidak dapat terhubung ke server';
    }
  } finally {
    isSubmitting.value = false;
  }
}

function resetForm(): void {
  form.value = {
    category_id: 0,
    name: '',
    sku: '',
    barcode: '',
    cost_price: 0,
    price: 0,
    stock_quantity: 0,
    unit: 'pcs',
  };
  errors.value = {};
  nextTick(() => {
    nameInputRef.value?.focus();
  });
}

async function handleScannedBarcode(barcode: string): Promise<void> {
  form.value.barcode = barcode;
  showScanner.value = false;
  await stopScan();
  showToast(`Barcode ${barcode} tersimpan`);
  nextTick(() => {
    nameInputRef.value?.focus();
  });
}

function openScanner(): void {
  showScanner.value = true;
  cameraError.value = null;
  setTimeout(() => {
    startScan(
      scannerElementId,
      (barcode) => {
        handleScannedBarcode(barcode);
      },
      { fps: 25, qrbox: { width: 260, height: 260 } }
    ).catch((err: unknown) => {
      cameraError.value = err instanceof Error ? err.message : 'Gagal membuka kamera';
    });
  }, 300);
}

function closeScanner(): void {
  showScanner.value = false;
  stopScan();
}

function showToast(message: string): void {
  toast.value = message;
  setTimeout(() => {
    toast.value = null;
  }, 2500);
}

onMounted(() => {
  fetchCategories();
  nextTick(() => {
    nameInputRef.value?.focus();
  });
});
</script>

<template>
  <div class="bg-[#f6fbf5] text-[#181d1a] min-h-screen pb-24 md:pb-12">
    <!-- Header -->
    <header class="bg-[#047857] text-white sticky top-0 z-40 shadow-sm border-b border-[#0369a1]/20">
      <div class="max-w-3xl mx-auto px-4 h-[56px] flex items-center justify-between">
        <div class="flex items-center gap-3">
          <button
            type="button"
            @click="router.push('/')"
            class="p-2 -ml-2 rounded-xl hover:bg-white/10 active:scale-95 transition-transform flex items-center justify-center"
            aria-label="Kembali"
          >
            <ArrowLeft class="w-5 h-5 text-white" />
          </button>
          <div>
            <h1 class="text-[17px] md:text-[19px] font-bold leading-tight">Tambah Produk</h1>
            <p class="text-[11px] text-white/80 leading-none">Isi data produk untuk ditambahkan ke toko</p>
          </div>
        </div>

        <button
          type="button"
          @click="handleSubmit"
          :disabled="isSubmitting || isLoadingCategories"
          class="flex items-center gap-2 bg-white text-[#047857] px-3.5 sm:px-4 h-[38px] rounded-xl font-bold text-[13px] sm:text-sm shadow-sm hover:bg-emerald-50 active:scale-95 transition-all disabled:opacity-50"
        >
          <Save class="w-4 h-4" />
          <span>{{ isSubmitting ? 'Simpan...' : 'Simpan' }}</span>
        </button>
      </div>
    </header>

    <!-- Toast Floating -->
    <div
      v-if="toast"
      class="fixed top-16 left-1/2 -translate-x-1/2 z-[90] bg-[#047857] text-white px-4 py-2.5 rounded-2xl shadow-xl font-medium text-sm flex items-center gap-2 max-w-[90vw] animate-in fade-in slide-in-from-top duration-200"
    >
      <CheckCircle2 class="w-5 h-5 text-emerald-200 shrink-0" />
      <span>{{ toast }}</span>
    </div>

    <!-- Container Utama -->
    <main class="max-w-3xl mx-auto px-4 py-5 flex flex-col gap-4">
      <!-- Banner Error Utama -->
      <div
        v-if="formError"
        class="bg-red-50 border border-red-200 text-[#DC2626] p-3.5 rounded-2xl flex items-center gap-3 text-sm font-medium"
      >
        <AlertTriangle class="w-5 h-5 shrink-0 text-[#DC2626]" />
        <span>{{ formError }}</span>
      </div>

      <form @submit.prevent="handleSubmit" class="flex flex-col gap-4">

        <!-- LANGKAH 1: BARCODE (Paling Atas Cepat Di-scan saat Pegang Barang) -->
        <div class="bg-white rounded-2xl p-4 md:p-5 border border-slate-100 shadow-xs space-y-3">
          <div class="flex items-center justify-between pb-2 border-b border-slate-100">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-[#EA580C]">
                <BarcodeIcon class="w-4 h-4" />
              </div>
              <h2 class="font-bold text-slate-800 text-[15px] md:text-[16px]">1. Kode Barcode (Opsional)</h2>
            </div>
            <span class="text-[11px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">Paling Awal</span>
          </div>

          <div class="flex flex-col gap-1.5">
            <div class="flex gap-2">
              <input
                v-model="form.barcode"
                id="barcode"
                type="text"
                placeholder="Scan dengan alat scan atau ketik manual..."
                class="h-[46px] flex-1 min-w-0 rounded-xl border border-slate-200 focus:border-[#047857] focus:ring-2 focus:ring-[#047857]/20 px-3.5 text-[14px] font-mono bg-white transition-all outline-none"
              />
              <button
                type="button"
                @click="openScanner"
                class="h-[46px] px-3.5 bg-[#EA580C] text-white font-bold text-[13px] rounded-xl flex items-center gap-2 hover:bg-[#c2410c] active:scale-95 transition-all shadow-sm shrink-0"
              >
                <ScanBarcode class="w-4 h-4" />
                <span class="hidden sm:inline">SCAN KAMERA</span>
              </button>
            </div>
            <p class="text-[11px] text-slate-400">Pegang produk di tangan → langsung scan barcode dulu jika ada.</p>
          </div>
        </div>

        <!-- LANGKAH 2: INFORMASI PRODUK -->
        <div class="bg-white rounded-2xl p-4 md:p-5 border border-slate-100 shadow-xs space-y-4">
          <div class="flex items-center gap-2 pb-2 border-b border-slate-100">
            <div class="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-[#047857]">
              <Package class="w-4 h-4" />
            </div>
            <h2 class="font-bold text-slate-800 text-[15px] md:text-[16px]">2. Nama & Kategori Produk</h2>
          </div>

          <!-- Nama Produk -->
          <div class="flex flex-col gap-1.5">
            <label for="nama_produk" class="text-[13px] md:text-[14px] font-semibold text-slate-700">
              Nama Produk <span class="text-[#DC2626]">*</span>
            </label>
            <input
              ref="nameInputRef"
              v-model="form.name"
              id="nama_produk"
              type="text"
              placeholder="Contoh: Minyak Goreng Bimoli 1L"
              class="h-[46px] w-full rounded-xl border border-slate-200 focus:border-[#047857] focus:ring-2 focus:ring-[#047857]/20 px-3.5 text-[15px] bg-white transition-all outline-none font-medium"
              :class="{ 'border-[#DC2626] bg-red-50/30': errors.name }"
            />
            <span v-for="msg in errors.name" :key="msg" class="text-[12px] font-medium text-[#DC2626]">
              {{ msg }}
            </span>
          </div>

          <!-- Kategori -->
          <div class="flex flex-col gap-1.5">
            <label for="kategori" class="text-[13px] md:text-[14px] font-semibold text-slate-700">
              Kategori <span class="text-[#DC2626]">*</span>
            </label>
            <div class="relative">
              <select
                v-model="form.category_id"
                id="kategori"
                class="h-[46px] w-full rounded-xl border border-slate-200 focus:border-[#047857] focus:ring-2 focus:ring-[#047857]/20 px-3.5 pr-9 text-[15px] bg-white transition-all outline-none appearance-none cursor-pointer text-slate-800"
                :class="{ 'border-[#DC2626] bg-red-50/30': errors.category_id }"
              >
                <option :value="0" disabled>-- Pilih Kategori Produk --</option>
                <option
                  v-for="cat in categories"
                  :key="cat.id"
                  :value="cat.id"
                >
                  {{ cat.name }}
                </option>
              </select>
              <Tag class="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <span v-for="msg in errors.category_id" :key="msg" class="text-[12px] font-medium text-[#DC2626]">
              {{ msg }}
            </span>
          </div>
        </div>

        <!-- LANGKAH 3: HARGA & PROFIT -->
        <div class="bg-white rounded-2xl p-4 md:p-5 border border-slate-100 shadow-xs space-y-4">
          <div class="flex items-center gap-2 pb-2 border-b border-slate-100">
            <div class="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-[#047857]">
              <Banknote class="w-4 h-4" />
            </div>
            <h2 class="font-bold text-slate-800 text-[15px] md:text-[16px]">3. Harga & Estimasi Profit</h2>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <!-- Harga Beli -->
            <div class="flex flex-col gap-1.5">
              <label for="harga_beli" class="text-[13px] md:text-[14px] font-semibold text-slate-700">
                Harga Beli (Modal) <span class="text-[#DC2626]">*</span>
              </label>
              <div class="relative">
                <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-[14px] font-bold text-slate-400">Rp</span>
                <input
                  v-model.number="form.cost_price"
                  id="harga_beli"
                  type="number"
                  min="0"
                  placeholder="0"
                  class="h-[46px] w-full rounded-xl border border-slate-200 focus:border-[#047857] focus:ring-2 focus:ring-[#047857]/20 pl-11 pr-3.5 text-[15px] font-bold text-slate-800 bg-white transition-all outline-none"
                  :class="{ 'border-[#DC2626] bg-red-50/30': errors.cost_price }"
                />
              </div>
              <span v-for="msg in errors.cost_price" :key="msg" class="text-[12px] font-medium text-[#DC2626]">
                {{ msg }}
              </span>
            </div>

            <!-- Harga Jual -->
            <div class="flex flex-col gap-1.5">
              <label for="harga_jual" class="text-[13px] md:text-[14px] font-semibold text-slate-700">
                Harga Jual <span class="text-[#DC2626]">*</span>
              </label>
              <div class="relative">
                <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-[14px] font-bold text-[#047857]">Rp</span>
                <input
                  v-model.number="form.price"
                  id="harga_jual"
                  type="number"
                  min="0"
                  placeholder="0"
                  class="h-[46px] w-full rounded-xl border border-slate-200 focus:border-[#047857] focus:ring-2 focus:ring-[#047857]/20 pl-11 pr-3.5 text-[15px] font-bold text-[#047857] bg-white transition-all outline-none"
                  :class="{ 'border-[#DC2626] bg-red-50/30': errors.price || priceTooLow }"
                />
              </div>
              <span v-for="msg in errors.price" :key="msg" class="text-[12px] font-medium text-[#DC2626]">
                {{ msg }}
              </span>
              <span v-if="priceTooLow && !errors.price" class="text-[12px] font-medium text-[#DC2626]">
                Harga jual tidak boleh kurang dari harga beli (rugi)
              </span>
            </div>
          </div>

          <!-- Indikator Profit Otomatis -->
          <div
            v-if="estimatedProfit > 0 && !priceTooLow"
            class="bg-emerald-50/80 border border-emerald-200/80 rounded-xl p-3 flex items-center justify-between text-[12px] md:text-[13px]"
          >
            <div class="flex items-center gap-2">
              <Sparkles class="w-4 h-4 text-[#047857]" />
              <span class="text-slate-700 font-medium">Margin Keuntungan:</span>
            </div>
            <div class="text-right">
              <span class="font-extrabold text-[#047857] text-[14px]">
                +Rp {{ estimatedProfit.toLocaleString('id-ID') }}
              </span>
              <span class="ml-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-md">
                ({{ profitPercentage }}%)
              </span>
            </div>
          </div>
        </div>

        <!-- LANGKAH 4: STOK & SATUAN -->
        <div class="bg-white rounded-2xl p-4 md:p-5 border border-slate-100 shadow-xs space-y-4">
          <div class="flex items-center gap-2 pb-2 border-b border-slate-100">
            <div class="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-[#047857]">
              <Boxes class="w-4 h-4" />
            </div>
            <h2 class="font-bold text-slate-800 text-[15px] md:text-[16px]">4. Stok Awal & Satuan</h2>
          </div>

          <div class="grid grid-cols-2 gap-3.5">
            <div class="flex flex-col gap-1.5">
              <label for="stok_awal" class="text-[13px] md:text-[14px] font-semibold text-slate-700">Stok Awal</label>
              <div class="relative">
                <input
                  v-model.number="form.stock_quantity"
                  id="stok_awal"
                  type="number"
                  min="0"
                  placeholder="0"
                  class="h-[46px] w-full rounded-xl border border-slate-200 focus:border-[#047857] focus:ring-2 focus:ring-[#047857]/20 px-3.5 text-[15px] font-semibold text-slate-800 bg-white transition-all outline-none"
                />
              </div>
            </div>

            <div class="flex flex-col gap-1.5">
              <label for="satuan" class="text-[13px] md:text-[14px] font-semibold text-slate-700">Satuan</label>
              <select
                v-model="form.unit"
                id="satuan"
                class="h-[46px] w-full rounded-xl border border-slate-200 focus:border-[#047857] focus:ring-2 focus:ring-[#047857]/20 px-3.5 text-[15px] bg-white transition-all outline-none appearance-none cursor-pointer text-slate-800"
              >
                <option v-for="u in unitOptions" :key="u" :value="u">{{ u }}</option>
              </select>
            </div>
          </div>
        </div>

        <!-- LANGKAH 5: SKU OPSIONAL -->
        <div class="bg-white rounded-2xl p-4 md:p-5 border border-slate-100 shadow-xs space-y-3">
          <div class="flex items-center justify-between pb-2 border-b border-slate-100">
            <h2 class="font-semibold text-slate-600 text-[13px]">5. Kode SKU Tambahan (Opsional)</h2>
            <span class="text-[11px] text-slate-400">Otomatis jika kosong</span>
          </div>
          <input
            v-model="form.sku"
            id="sku"
            type="text"
            placeholder="Contoh: MNY-BML-1L (opsional)"
            class="h-[44px] w-full rounded-xl border border-slate-200 focus:border-[#047857] px-3.5 text-[13px] font-mono bg-white transition-all outline-none"
          />
        </div>

        <!-- Tombol Submit Utama (semua ukuran layar) -->
        <div class="pt-2">
          <button
            type="submit"
            :disabled="isSubmitting || isLoadingCategories"
            class="w-full h-[52px] rounded-xl bg-[#047857] text-white text-[16px] font-bold shadow-md hover:bg-[#005d42] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save class="w-5 h-5" />
            <span>{{ isSubmitting ? 'MEMPROSES...' : 'SIMPAN PRODUK' }}</span>
          </button>
        </div>
      </form>
    </main>

    <!-- Modal Scanner Kamera Barcode -->
    <Teleport to="body">
      <div
        v-if="showScanner"
        class="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-sm flex flex-col justify-between p-4"
      >
        <div class="flex items-center justify-between text-white pb-3 border-b border-white/10">
          <div class="flex items-center gap-2">
            <ScanBarcode class="w-5 h-5 text-emerald-400" />
            <h3 class="font-bold text-[16px]">Scan Barcode Kamera</h3>
          </div>

          <!-- Controls: Senter & Fokus -->
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
            >
              <Zap v-if="isTorchOn" class="w-4 h-4 fill-slate-900" />
              <ZapOff v-else class="w-4 h-4" />
              <span>{{ isTorchOn ? 'Senter ON' : 'Senter' }}</span>
            </button>

            <button
              type="button"
              @click="triggerFocus"
              class="p-2 bg-white/10 text-white hover:bg-white/20 rounded-xl border border-white/20 active:scale-95 transition-all flex items-center gap-1.5 text-xs font-semibold"
            >
              <Focus class="w-4 h-4 text-emerald-300" />
              <span>Fokus</span>
            </button>

            <button
              type="button"
              @click="closeScanner"
              class="p-2 text-white/70 hover:text-white rounded-lg active:scale-95"
            >
              <X class="w-6 h-6" />
            </button>
          </div>
        </div>

        <main class="flex-1 my-auto flex flex-col items-center justify-center py-4">
          <div
            @click="triggerFocus"
            title="Klik untuk fokus kamera"
            class="relative cursor-pointer rounded-2xl overflow-hidden border-2 border-emerald-400/80 shadow-[0_0_30px_rgba(52,211,153,0.3)] bg-black/40"
          >
            <div
              :id="scannerElementId"
              class="w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] relative overflow-hidden bg-transparent"
            ></div>
            <div class="absolute bottom-2 inset-x-0 text-center pointer-events-none">
              <span class="inline-flex items-center gap-1 bg-black/60 text-emerald-300 text-[11px] px-2.5 py-1 rounded-full backdrop-blur-sm border border-emerald-500/30">
                <Focus class="w-3 h-3" />
                Ketuk area kamera untuk fokus
              </span>
            </div>
          </div>
          <p class="mt-4 text-[14px] text-white/90 text-center font-medium bg-black/40 px-4 py-1.5 rounded-full border border-white/10">
            Posisikan garis barcode tepat di tengah kamera
          </p>

          <!-- Notice toast (e.g. senter tidak didukung) -->
          <div
            v-if="scannerNotice"
            class="w-full max-w-sm bg-slate-800/95 text-emerald-200 rounded-xl p-3 mt-4 flex items-center justify-center gap-2 shadow-lg text-sm font-semibold border border-emerald-500/30"
          >
            <ZapOff class="w-5 h-5 shrink-0 text-amber-300" />
            <span>{{ scannerNotice }}</span>
          </div>

          <div
            v-if="cameraError"
            class="w-full max-w-sm bg-red-500/90 text-white rounded-xl p-3 mt-4 flex items-center justify-center gap-2 text-sm font-medium"
          >
            <AlertTriangle class="w-5 h-5 shrink-0" />
            <span>{{ cameraError }}</span>
          </div>
        </main>

        <div>
          <button
            type="button"
            @click="closeScanner"
            class="w-full h-[48px] bg-white/10 text-white hover:bg-white/20 font-bold text-[15px] rounded-xl border border-white/20 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <X class="w-5 h-5" />
            <span>BATAL</span>
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>
