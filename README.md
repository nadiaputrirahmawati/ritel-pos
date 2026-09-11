# POS Toko (Warung Pintar) — Frontend

Aplikasi kasir (Point of Sale) berbasis **Vue 3 + TypeScript + Vite** untuk warung/toko, konsumsi REST API Laravel `pos-toko` (Sanctum token).

## Tech Stack

- Vue 3.5 (Composition API + `<script setup lang="ts">`)
- TypeScript (strict)
- Vite 8
- Pinia (state: auth + cart, persist token ke localStorage)
- Vue Router 4 (route guard `requiresAuth`)
- Axios (interceptor Bearer token + handling 401)
- Tailwind CSS v4 (`@tailwindcss/vite`)
- `html5-qrcode` (scan barcode kamera, lazy-loaded)
- Font: Plus Jakarta Sans + Material Symbols (via Google Fonts di `index.html`)

## Persiapan

1. Pastikan backend Laravel berjalan (`php artisan serve` → `http://localhost:8000`).
2. Buat file `.env` (sudah disertakan di repo ini, namun di-ignore git):

```env
VITE_API_URL=http://localhost:8000/api
```

> Tanpa proxy: frontend memanggil full URL via `VITE_API_URL`. Backend harus mengizinkan CORS untuk origin frontend (mis. `http://localhost:5173`) di `config/cors.php`.

## Menjalankan

```bash
npm install
npm run dev      # dev server http://localhost:5173
npm run build    # vue-tsc -b && vite build (type-check + production)
npm run preview  # preview production build
```

## Struktur

```
src/
├── main.ts                  # init Pinia + Router
├── App.vue                  # <router-view/>
├── types/index.ts           # Semua interface TS (User, Product, CartItem, dll)
├── env.d.ts                 # Tipe ImportMetaEnv (VITE_API_URL)
├── router/index.ts          # RouteRecordRaw + guard requiresAuth/requiresGuest
├── stores/
│   ├── auth.ts              # token + user (localStorage persist)
│   └── cart.ts              # items keranjang + total (computed)
├── services/api.ts          # Axios instance + interceptor 401 → /login
├── composables/
│   ├── useDebounce.ts       # debounce 300ms untuk pencarian
│   └── useBarcodeScanner.ts # kamera scan barcode (html5-qrcode, lazy import)
├── utils/formatters.ts      # formatRupiah()
├── views/
│   ├── LoginView.vue        # /login
│   ├── PosView.vue          # / (grid produk + keranjang + bayar)
│   └── ProductCreateView.vue# /produk/tambah
└── components/
    ├── ProductCard.vue      # kartu produk (klik → tambah keranjang)
    ├── CartPanel.vue        # panel keranjang (+/−, hapus, total, BAYAR)
    ├── PaymentModal.vue     # numpad uang tunai + kembalian + struk
    └── BarcodeScannerModal.vue # overlay kamera scan barcode
```

## Akun Contoh (dari backend seeder)

- `kasir@warung.com` / `kasir123` (role: cashier)
- (admin sesuai `WarungSeeder` backend)
