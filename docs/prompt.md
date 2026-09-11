# PROMPT POWERFUL — Frontend Vue 3 + TypeScript + Vite untuk Aplikasi Kasir (POS)

> **Cara pakai:** Salin (copy) seluruh isi dokumen ini mulai dari bagian `=== PROMPT MULAI DI SINI ===` sampai `=== PROMPT SELESAI ===`, lalu tempel ke AI assistant (Claude, ChatGPT, dll) atau jadikan spesifikasi untuk developer frontend. Prompt ini sudah disesuaikan persis dengan backend REST API Laravel di project `pos-toko`.

---

=== PROMPT MULAI DI SINI ===

# TUGAS: Bangun Aplikasi Frontend Kasir (POS) dengan Vue 3 + TypeScript + Vite

Kamu adalah senior frontend engineer. Bangun sebuah aplikasi web **Kasir (Point of Sale)** untuk toko/warung menggunakan **Vue 3 (Composition API + `<script setup lang="ts">`)**, **TypeScript**, **Vite**, **Pinia**, dan **Vue Router**. Aplikasi ini **project terpisah** dari backend, dan akan mengkonsumsi REST API dari backend **Laravel 13 + Sanctum** yang sudah jadi. Desain harus **mobile-first** (dipakai di tablet/smartphone kasir) namun tetap rapi di desktop.

## 1. KONTEKS APLIKASI

- Nama aplikasi: **POS Toko (Kasir)**.
- Backend sudah jadi dan TIDAK perlu diubah. Frontend hanya konsumsi API.
- User: kasir (`role: 'cashier'`) dan admin (`role: 'admin'`). Login dengan email + password.
- Fitur utama: login, layar kasir (grid produk + pencarian + **scan barcode via kamera HP** + keranjang + pembayaran dengan kembalian), dan form tambah produk.
- Bahasa antarmuka: **Bahasa Indonesia**. Mata uang: **Rupiah (Rp)** dengan format `Rp 12.500`.
- Target: cepat, ringan, responsif, type-safe (strict TypeScript), tanpa framework UI berat (cukup Tailwind CSS atau CSS custom + utility). Boleh pakai komponen ringan seperti Headless UI bila perlu.

## 2. STACK TEKNOLOGI & TYPESCRIPT

- Vue 3.4+ (Composition API, `<script setup lang="ts">`) + Vite + TypeScript (strict mode).
- Pinia (state management) dengan type definitions penuh & persist token.
- Vue Router 4 dengan **route guard** bertipe (`RouteRecordRaw`, `meta: { requiresAuth: boolean }`).
- Axios dengan **interceptor** bertipe untuk Bearer token & handling error global.
- Library scan barcode: **`html5-qrcode`** ATAU **`@zxing/library`** — untuk scan barcode/QR memakai kamera smartphone. Sediakan type declaration jika belum ada.
- Tailwind CSS (opsional tapi disarankan untuk kecepatan styling).
- Vite proxy ke backend untuk development (hindari CORS): proxy `/api` → `http://localhost:8000`.

## 3. SPESIFIKASI TYPESCRIPT INTERFACES (`src/types/index.ts`)

Semua tipe data WAJIB mencerminkan struktur JSON dari backend persis:

```typescript
// Roles
export type UserRole = 'admin' | 'cashier';

// User Model
export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

// Auth Responses
export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    token_type: string;
    user: User;
  };
}

// Category
export interface Category {
  id: number;
  name: string;
}

// Product
export interface Product {
  id: number;
  category_id: number;
  category?: Category;
  name: string;
  sku: string;
  barcode: string | null;
  cost_price: number;
  price: number;
  stock_quantity: number;
  unit: string;
}

// Form Payload Tambah Produk
export interface CreateProductPayload {
  category_id: number;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  cost_price: number;
  price: number;
  stock_quantity: number;
  unit?: string;
}

// Cart Item (State Klien)
export interface CartItem {
  product: Product;
  quantity: number;
}

// Checkout Request Payload
export interface CheckoutItemPayload {
  product_id: number;
  quantity: number;
}

export interface CheckoutPayload {
  items: CheckoutItemPayload[];
  paid_amount?: number | null;
}

// Order & Items Response
export interface OrderItem {
  id: number;
  product_id: number;
  product: {
    id: number;
    name: string;
    unit: string;
  };
  quantity: number;
  price: number;
  total: number;
}

export interface Order {
  id: number;
  invoice_number: string;
  order_date: string;
  total_amount: number;
  status: string;
  cashier?: {
    id: number;
    name: string;
  };
  items: OrderItem[];
}

export interface CheckoutPaymentInfo {
  total_amount: number;
  paid_amount: number;
  change: number;
}

export interface CheckoutResponse {
  success: boolean;
  message: string;
  data: Order;
  payment?: CheckoutPaymentInfo;
}

// Standard Paginated Response
export interface PaginatedResponse<T> {
  data: T[];
  links: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

// Validation Error Response (422)
export interface ValidationErrorResponse {
  message: string;
  errors?: Record<string, string[]>;
}
```

## 4. SPESIFIKASI API BACKEND (WAJIB PATUH PERSIS)

**Base URL:** `http://localhost:8000/api`

Semua endpoint **kecuali** `POST /api/auth/login` wajib menyertakan header:

```
Authorization: Bearer {token}
Accept: application/json
```

Format error: HTTP status standar; validasi `422` → `ValidationErrorResponse`; auth gagal `401`.

### 4.1 Autentikasi (Sanctum Token)

**`POST /api/auth/login`** — body: `{ email, password }` → Response: `LoginResponse`.
Simpan `token` (persist) dan `user` di Pinia store.

**`GET /api/auth/me`** — data user login (untuk re-validasi token saat app direfresh).

**`POST /api/auth/logout`** — mencabut token aktif. Hapus token dari store, redirect ke `/login`.

### 4.2 Produk — Grid Kasir

**`GET /api/products`** — daftar produk **yang punya stok**. Response: `PaginatedResponse<Product>`.
Query params opsional: `search` (nama/SKU/barcode), `category_id`, `per_page`.

**`GET /api/products/barcode/{barcode}`** — cari 1 produk persis berdasarkan hasil scan. Response: `{ success: true, data: Product }`. Response `404` jika barcode tidak ditemukan.

**`GET /api/products/{id}`** — detail 1 produk.

### 4.3 Tambah Produk

**`POST /api/products`** — body: `CreateProductPayload` → Response `201`: `{ success: true, message: string, data: Product }`.
Aturan:
- `name`, `category_id`, `cost_price`, `price` wajib. `price` tidak boleh kurang dari `cost_price`.
- `barcode`: **Opsional** — boleh dikirim `""` atau `null` (backend simpan `null`). Sediakan tombol **"Scan Barcode"** via kamera.
- `sku`: **Opsional** — jika dikosongkan backend otomatis generate `PRD-YYYYMMDD-XXXX`.
- `unit`: Opsional (default `"pcs"`). Contoh: `pcs`, `pack`, `botol`, `kg`, `liter`.

### 4.4 Kategori

**`GET /api/categories`** — Response: `{ data: Category[] }` (untuk mengisi dropdown kategori di form tambah produk).

### 4.5 Checkout Transaksi

**`POST /api/pos/checkout`** — body: `CheckoutPayload` → Response `201`: `CheckoutResponse`.
Aturan:
- `items` wajib minimal 1, `product_id` **tidak boleh duplikat**, `quantity` minimal 1.
- `paid_amount` **opsional** (`number | null`). Jika diisi, **tidak boleh kurang dari total belanja**; jika kurang backend menolak `422` dengan pesan: `"Jumlah pembayaran (Rp X) kurang dari total belanja (Rp Y)."` Validasi juga di klien sebelum submit.

## 5. STRUKTUR HALAMAN & FITUR

### 5.1 Login (`/login`)
- Form email + password bertipe (`ref<string>('')`).
- Simpan token & user ke Pinia (persist), redirect ke `/`.
- Tampilkan error 401 "Email atau password salah" / 422 dari backend.
- Jika token sudah ada & masih valid (`GET /auth/me` sukses), redirect langsung ke `/`.

### 5.2 Layout Utama (Protected)
- Header: nama toko, nama user login + role badge, tombol logout, tombol tambah produk.
- **Route guard:** tanpa token → redirect `/login`.

### 5.3 Halaman Kasir (`/`) — HALAMAN UTAMA
Tiga area utama:

**A. Daftar Produk (grid):**
- Grid produk 2–4 kolom (responsif), tampilkan nama/harga/stok/unit.
- Klik produk → tambah ke keranjang (qty +1; klik lagi tambah lagi). Jika stok habis → disabled.
- Pencarian dengan **debounce 300ms** → `GET /products?search=...`.
- Filter kategori (dropdown/chips) → `GET /products?category_id=...`.
- Pagination / infinite scroll memakai `meta.current_page` & `meta.last_page`.

**B. Scan Barcode (tombol / kamera):**
- Tombol "Scan" membuka overlay kamera (fullscreen di HP).
- Pakai `html5-qrcode` / `@zxing/library`: setelah berhasil scan → `GET /products/barcode/{barcode}` → otomatis tambah ke keranjang → tutup kamera.
- Saat scanning: tampilkan spinner "Mencari produk...". Jika `404` → alert "Barcode tidak ditemukan", kamera tetap terbuka agar bisa scan ulang.
- Sediakan juga input teks manual barcode (untuk scanner fisik USB yang ketik cepat lalu Enter).

**C. Keranjang & Pembayaran (panel kanan / bottom sheet di HP):**
- Daftar item: nama, harga satuan, qty dengan tombol +/−, subtotal, tombol hapus.
- Total belanja otomatis dihitung (`computed<number>`).
- Input "Uang Dibayar (Rp)" (`number | null`). Saat diisi, hitung **kembalian** real-time (`uangDibayar - total`). Validasi: jika `paid_amount < total` → tombol bayar disabled + warning merah.
- Tombol "Bayar": `POST /pos/checkout` dengan `items` (aggregate qty per produk) + `paid_amount`.
- Setelah sukses: tampilkan **struk** (nomor invoice, tanggal, daftar item, total, uang dibayar, kembalian, kasir) dalam modal + tombol "Transaksi Baru" untuk reset keranjang.

### 5.4 Halaman Tambah Produk (`/produk/tambah`)
- Form bertipe `CreateProductPayload`: nama, kategori (dropdown dari `GET /categories`), barcode (input + tombol **scan kamera**), SKU (input opsional dengan hint "kosongkan untuk auto-generate"), harga beli, harga jual, stok awal, satuan (`unit`).
- Validasi klien: `price >= cost_price`, `name` wajib, `category_id` wajib.
- Submit → `POST /products` → sukses: reset form + toast "Produk berhasil ditambahkan".
- Tampilkan error 422 per-field dari backend di bawah input masing-masing (`errors[field]`).

## 6. STRUKTUR KODE & FILE TYPESCRIPT

```
src/
├── main.ts
├── App.vue
├── types/
│   └── index.ts              # Semua interfaces & types (User, Product, CartItem, dll)
├── router/
│   └── index.ts              # Vue Router dengan RouteRecordRaw + meta.requiresAuth guard
├── stores/
│   ├── auth.ts               # Pinia store auth (token: string|null, user: User|null)
│   └── cart.ts               # Pinia store cart (items: CartItem[], total: computed)
├── services/
│   └── api.ts                # Axios instance bertipe + interceptors (Bearer + 401 handling)
├── composables/
│   ├── useBarcodeScanner.ts  # Composable kamera scan barcode bertipe
│   └── useDebounce.ts        # Composable debounce generic
├── utils/
│   └── formatters.ts         # formatRupiah(amount: number): string
├── views/
│   ├── LoginView.vue         # <script setup lang="ts">
│   ├── PosView.vue           # Halaman utama kasir
│   └── ProductCreateView.vue # Form tambah produk
└── components/
    ├── ProductCard.vue
    ├── CartPanel.vue
    ├── PaymentModal.vue      # Modal struk pembayaran
    └── BarcodeScannerModal.vue
```

## 7. ATURAN TEKNIS TYPESCRIPT WAJIB

1. **Strict Mode:** aktifkan `"strict": true` di `tsconfig.json`. Hindari penggunaan `any` (gunakan generic / proper type).
2. **Script Setup:** Selalu pakai `<script setup lang="ts">` pada seluruh komponen `.vue`.
3. **Axios Interceptor:** otomatis tambah `Authorization: Bearer ${token}`; pada response `401` → hapus token store + redirect `/login`.
4. **Error Handling Global:** tangkap error network → toast "Tidak dapat terhubung ke server". Tangkap `422` → cast ke `ValidationErrorResponse` dan tampilkan di UI.
5. **Format Rupiah Helper:**
   ```typescript
   export const formatRupiah = (amount: number): string => {
     return new Intl.NumberFormat('id-ID', {
       style: 'currency',
       currency: 'IDR',
       maximumFractionDigits: 0,
     }).format(amount);
   };
   ```
6. **Props & Emits Typing:** gunakan `defineProps<{ ... }>()` dan `defineEmits<{ ... }>()` bertipe di setiap komponen.
7. Environment variable: `VITE_API_URL=http://localhost:8000/api` (default) — deklarasikan di `src/env.d.ts` (`interface ImportMetaEnv`).

## 8. KELUARAN AKHIR

- Project Vue 3 + TypeScript + Vite yang bisa langsung `npm install && npm run dev` tanpa type error (`vue-tsc --noEmit` pass).
- Proxy dev: `/api` → `http://localhost:8000` (agar request `axios.get('/api/products')` jalan tanpa CORS issue).
- Semua fitur di atas berfungsi dan terhubung ke backend `pos-toko`.
- Struk pembayaran tampil persis dari response checkout backend.

Kerjakan dengan kode yang bersih, type-safe, konsisten, dan mudah dipelihara. Jelaskan struktur yang kamu buat beserta cara menjalankannya.

=== PROMPT SELESAI ===

---

## Catatan Tambahan untuk Kamu (Pengguna)

### A. Persiapan Sebelum Menjalankan Frontend

1. Pastikan backend berjalan: `php artisan serve` (default di `http://localhost:8000`).
2. Pastikan ada user kasir untuk login. Jika belum, buat via seeder atau register manual:
   ```bash
   php artisan db:seed --class=WarungSeeder
   ```
   (Cek akun yang dibuat di [`database/seeders/WarungSeeder.php`](../database/seeders/WarungSeeder.php)).
3. Tes dulu endpoint API dengan curl (lihat [`docs/api-pos.md`](api-pos.md)) untuk memastikan backend sehat.

### B. Cara Menggabungkan dengan `design.md` (Spesifikasi Tampilan)

Pembagian peran dokumen di folder `docs/`:

| Dokumen | Isi | Dipakai saat |
|---------|-----|--------------|
| `api-pos.md` | Spesifikasi API backend (endpoint, request/response) | Backend & integrasi |
| `prompt-frontend-vue.md` | Spesifikasi fungsional + arsitektur TS frontend (halaman, fitur, types) | Membangun frontend |
| `design.md` (buat sendiri) | Spesifikasi tampilan UI-UX (warna, font, layout, wireframe, komponen) | Styling / visual |

Saat `design.md` sudah dibuat, gabungkan ke prompt seperti ini (tempel setelah bagian `=== PROMPT MULAI DI SINI ===`):

```
Spesifikasi TAMBAHAN — ikuti tampilan berikut (design.md):
[Tempel isi design.md di sini]
```

Aturan: `design.md` hanya mengatur **tampilan** (warna, layout, ukuran, komponen visual). **Jangan** ubah struktur halaman, nama route, tipe data TS, atau cara request API — itu sudah diatur di prompt ini agar tetap sinkron dengan backend.

### C. Cara Koneksi dari Project Terpisah (Tanpa Proxy)

Jika frontend dan backend beda domain (misal frontend di `localhost:5173`, backend di `localhost:8000`), dua pilihan:

| Cara | Keterangan |
|------|-----------|
| **Vite proxy (disarankan)** | Tambah di `vite.config.ts`: `server: { proxy: { '/api': 'http://localhost:8000' } }`. Frontend pakai path relatif `/api/...` — paling simpel, tanpa CORS. |
| **Full URL + CORS** | Set `VITE_API_URL=http://localhost:8000/api` dan aktifkan CORS di Laravel (backend perlu konfigurasi `config/cors.php` — belum diaktifkan default). |

### D. Daftar Endpoint yang Dipakai Frontend (Ringkas)

| Method | Endpoint | Fungsi |
|--------|----------|--------|
| POST | `/api/auth/login` | Login → token |
| GET | `/api/auth/me` | Cek user aktif |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/products` | Grid produk (search/kategori/pagination) |
| GET | `/api/products/barcode/{barcode}` | Hasil scan barcode |
| GET | `/api/products/{id}` | Detail produk |
| POST | `/api/products` | Tambah produk (barcode opsional, SKU auto) |
| GET | `/api/categories` | Dropdown kategori |
| POST | `/api/pos/checkout` | Proses pembayaran + struk |

### E. Tips Saat Menjalankan Prompt

- Jika AI assistant versi kamu punya kemampuan membaca file, beri akses juga ke [`docs/api-pos.md`](api-pos.md) dan file `tests/Feature/PosApiTest.php` agar memahami bentuk response persis.
- Minta AI untuk menuliskan contoh request/response saat ragu dengan bentuk data — prompt di atas sudah mencakup semuanya dengan tipe data TS.
- Untuk barcode scanner, sarankan library **`html5-qrcode`** karena ringan dan mudah dipakai di kamera HP; fallback `@zxing/library` jika butuh format barcode lebih luas (EAN-13, Code-128, dll).
