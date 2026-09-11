# PROMPT — Fitur Cetak Struk (Printer Thermal) di Frontend Vue 3 + TypeScript

> **Cara pakai:** Salin (copy) seluruh isi mulai `=== PROMPT MULAI DI SINI ===` sampai `=== PROMPT SELESAI ===`, lalu tempel ke AI assistant / jadikan spesifikasi developer frontend.
>
> **Referensi implementasi asli di backend Laravel:** [`resources/js/escpos.js`](../resources/js/escpos.js) dan [`resources/js/receipt-print.js`](../resources/js/receipt-print.js). Logika ESC/POS, UUID service BLE, dan cara RawBT di prompt ini **sama persis** dengan file tersebut, hanya ditulis ulang dalam TypeScript untuk project Vue/Vite yang terpisah.

---

=== PROMPT MULAI DI SINI ===

# TUGAS: Fitur Cetak Struk (Thermal 58mm/80mm) dengan Vue 3 + TypeScript

Kamu adalah senior frontend engineer. Tambahkan fitur **cetak struk transaksi** ke aplikasi Kasir (POS) Vue 3 + TypeScript yang sedang dibangun. Backend sudah menyediakan data transaksi via REST API (Laravel 13 + Sanctum). Fitur cetak ini meniru perilaku yang sudah ada di versi web Laravel, yaitu **3 opsi cetak**:

| Tombol | Cara Kerja | Persyaratan |
|--------|-----------|-------------|
| **Cetak Bluetooth** | Web Bluetooth API (BLE) → kirim byte biner **ESC/POS** langsung ke printer thermal | Chrome/Edge + HTTPS (localhost dianggap aman) |
| **Cetak RawBT** | Buka aplikasi **RawBT** (Android, Play Store: `ru.a402d.rawbtprint`) lewat URL scheme `rawbt://print?base64=...` | HP Android dengan aplikasi RawBT terinstal |
| **Cetak Browser** | `window.print()` → CSS print khusus 58mm/80mm | Printer biasa / PDF |

## 1. DATA STRUK (TypeScript Types)

Tambahkan ke `src/types/index.ts`:

```typescript
// Struk (data hasil encode ESC/POS) — struktur SAMA PERSIS dengan backend Laravel
export interface ReceiptData {
  shop: {
    shop_name: string;
    address: string;
    phone_number: string;
    receipt_footer: string;
    paper_width: number; // 58 atau 80
  };
  order: {
    invoice_number: string;
    order_date: string; // format tampilan, mis. "07 Agu 2026 20:30"
    cashier: string;
    total: number;
    items: Array<{
      name: string;
      quantity: number;
      price: number;
      total: number;
    }>;
  };
}

// Shop settings dari backend (endpoint GET /api/shop-settings)
export interface ShopSettings {
  id: number | null;
  shop_name: string;
  address: string | null;
  phone_number: string | null;
  email: string | null;
  logo_url: string | null;
  receipt_footer: string | null;
  paper_width: number; // 58 atau 80
}
```

### Penting — Sumber data struk

- **Order:** dari response `POST /api/pos/checkout` (sudah ada di `CheckoutResponse`). Petakan ke `ReceiptData.order`:
  ```typescript
  function mapOrder(checkout: CheckoutResponse): ReceiptData['order'] {
    return {
      invoice_number: checkout.data.invoice_number,
      order_date: formatTanggalId(checkout.data.order_date), // '07 Agu 2026 20:30'
      cashier: checkout.data.cashier?.name ?? '-',
      total: checkout.data.total_amount,
      items: checkout.data.items.map((it) => ({
        name: it.product.name,
        quantity: it.quantity,
        price: it.price,
        total: it.total,
      })),
    };
  }
  ```
- **Shop:** dari endpoint **`GET /api/shop-settings`** (sudah tersedia di backend — lihat Catatan A). Simpan hasilnya di Pinia store (mis. `stores/shop.ts`) dan muat sekali saat app login.

## 2. ESC/POS ENCODER (TypeScript) — `src/utils/escpos.ts`

Tulis ulang logika encoder dari backend Laravel ke TypeScript, **persis**:

```typescript
const ESC = 0x1b;
const GS = 0x1d;

const encoder = new TextEncoder();

export const text = (str: string): Uint8Array => encoder.encode(String(str ?? ''));
export const cmd = (...bytes: number[]): Uint8Array => Uint8Array.from(bytes);
export const concatBytes = (arrays: Uint8Array[]): Uint8Array => {
  const total = arrays.reduce((sum, a) => sum + a.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) { out.set(a, offset); offset += a.length; }
  return out;
};

// Perintah dasar ESC/POS
export const init        = () => cmd(ESC, 0x40);            // reset printer
export const feed        = (n = 1) => cmd(ESC, 0x64, n);    // line feed n baris
export const cut         = () => cmd(GS, 0x56, 0x00);       // potong kertas penuh
export const alignLeft   = () => cmd(ESC, 0x61, 0);
export const alignCenter = () => cmd(ESC, 0x61, 1);
export const alignRight  = () => cmd(ESC, 0x61, 2);
export const boldOn      = () => cmd(ESC, 0x45, 1);
export const boldOff     = () => cmd(ESC, 0x45, 0);
export const sizeNormal  = () => cmd(GS, 0x21, 0);
export const sizeDouble  = () => cmd(GS, 0x21, 0x11);        // ukuran 2x

// Helper format
export const formatRp = (n: number): string =>
  'Rp ' + Number(n || 0).toLocaleString('id-ID');

function truncate(str: string, width: number): string {
  const s = String(str ?? '');
  return s.length > width ? s.slice(0, Math.max(0, width - 1)) + '~' : s;
}
function lineOf(char: string, width: number): string {
  return char.repeat(Math.max(1, width));
}
function itemLine(item: ReceiptData['order']['items'][number], width: number): string {
  const left = `${item.quantity} x ${formatRp(item.price)}`;
  const right = formatRp(item.total);
  const dots = Math.max(1, width - left.length - right.length);
  return left + '.'.repeat(dots) + right;
}

/**
 * Encode struk menjadi byte ESC/POS.
 * width: 58mm = 32 karakter, 80mm = 48 karakter
 */
export function encodeReceipt(data: ReceiptData, width = 32): Uint8Array {
  const { shop, order } = data;
  const shopName = shop.shop_name || 'Toko Saya';
  const parts: Uint8Array[] = [];

  parts.push(init());

  // Header toko (2x, tengah)
  parts.push(alignCenter(), boldOn(), sizeDouble());
  parts.push(text(truncate(shopName, Math.floor(width / 2))));
  parts.push(sizeNormal(), boldOff(), feed(1));

  if (shop.address) { parts.push(alignCenter(), text(truncate(shop.address, width)), feed(0)); }
  if (shop.phone_number) { parts.push(alignCenter(), text(truncate(shop.phone_number, width)), feed(0)); }

  parts.push(alignCenter(), boldOn(), text(truncate(order.invoice_number, width)), boldOff(), feed(1));
  parts.push(alignLeft(), text(lineOf('=', width)), feed(0));

  // Info transaksi
  parts.push(alignLeft(), text(`Tanggal: ${order.order_date}`), feed(0));
  parts.push(text(`Kasir  : ${truncate(order.cashier, width - 9)}`), feed(0));
  parts.push(text(lineOf('-', width)), feed(0));

  // Item
  for (const item of order.items || []) {
    parts.push(text(truncate(item.name, width)), feed(0));
    parts.push(text(itemLine(item, width)), feed(0));
  }

  parts.push(text(lineOf('-', width)), feed(0));

  // Total
  parts.push(alignRight(), boldOn(), text(truncate(`TOTAL ${formatRp(order.total)}`, width)), boldOff(), feed(2));

  // Footer
  if (shop.receipt_footer) {
    parts.push(alignCenter(), text(truncate(shop.receipt_footer, width)), feed(1));
  }

  parts.push(feed(3), cut());

  return concatBytes(parts);
}

// Base64
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
```

## 3. PRINT SERVICE — `src/services/printer.ts`

### 3.1 Cetak RawBT (Android)

```typescript
export function printViaRawBt(bytes: Uint8Array): void {
  const base64 = bytesToBase64(bytes);
  const url = 'rawbt://print?base64=' + encodeURIComponent(base64);
  window.open(url, '_self');
}
```

### 3.2 Cetak Web Bluetooth (BLE)

Gunakan UUID service umum printer thermal yang SAMA dengan backend Laravel:

```typescript
const PRINTER_SERVICE_UUIDS = [
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // MOKO / SmartRF (umum di printer 58mm)
  '0000ff00-0000-1000-8000-00805f9b34fb', // vendor FF00
  '000018f0-0000-1000-8000-00805f9b34fb', // vendor 18F0
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // beberapa printer label
];

async function findWritableCharacteristic(server: BluetoothRemoteGATTServer) {
  // 1) Coba enumerate semua service
  try {
    const services = await server.getPrimaryServices();
    for (const service of services) {
      const characteristics = await service.getCharacteristics();
      for (const c of characteristics) {
        if (c.properties.write || c.properties.writeWithoutResponse) {
          return { characteristic: c, withoutResponse: !c.properties.write };
        }
      }
    }
  } catch { /* lanjut fallback */ }

  // 2) Fallback: telusuri UUID umum satu per satu
  for (const uuid of PRINTER_SERVICE_UUIDS) {
    try {
      const service = await server.getPrimaryService(uuid);
      const characteristics = await service.getCharacteristics();
      for (const c of characteristics) {
        if (c.properties.write || c.properties.writeWithoutResponse) {
          return { characteristic: c, withoutResponse: !c.properties.write };
        }
      }
    } catch { /* service tidak ada, lanjut */ }
  }
  return null;
}

export async function printViaBluetooth(
  bytes: Uint8Array,
  onStatus?: (msg: string) => void
): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.bluetooth) {
    throw new Error('Web Bluetooth tidak didukung browser ini. Gunakan Chrome/Edge dengan koneksi HTTPS atau localhost.');
  }

  onStatus?.('Minta izin & pilih printer BLE...');
  const device = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: PRINTER_SERVICE_UUIDS,
  });

  onStatus?.(`Menghubungkan ke "${device.name || 'Printer'}"...`);
  const server = await device.gatt!.connect();

  const target = await findWritableCharacteristic(server);
  if (!target) {
    try { server.disconnect(); } catch { /* abaikan */ }
    throw new Error('Tidak ditemukan karakteristik tulis pada printer. Pastikan printer menyala & mendukung BLE (bukan classic BT/SPP).');
  }

  const { characteristic, withoutResponse } = target;
  onStatus?.('Mengirim data ke printer...');

  // Kirim per potongan 512 byte agar tidak overload buffer printer
  const chunkSize = 512;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.slice(i, i + chunkSize);
    if (withoutResponse) {
      await characteristic.writeValueWithoutResponse(chunk);
    } else {
      await characteristic.writeValueWithResponse(chunk);
    }
    await new Promise((r) => setTimeout(r, 50));
  }

  setTimeout(() => { try { server.disconnect(); } catch { /* abaikan */ } }, 800);
  onStatus?.('Struk berhasil dikirim ke printer.');
  return true;
}
```

### 3.3 Cetak Browser (fallback)

```typescript
export function printViaBrowser(): void {
  window.print();
}
```

## 4. KOMPONEN UI — Struk & Tombol Cetak

### 4.1 Komponen `ReceiptModal.vue`

- **Data masuk (props):** `receiptData: ReceiptData` (hasil map dari `CheckoutResponse` + `ShopSettings`).
- **Preview struk:** tampilkan struktur struk persis seperti versi Laravel — header toko (nama besar + alamat + telp), nomor invoice, tanggal & kasir, daftar item (`quantity × harga` + subtotal), total besar, footer struk.
- **3 tombol cetak** dengan label & keterangan:
  1. **Cetak Bluetooth** (`bg-primary`) — subteks "printer BLE"
  2. **Cetak RawBT** (`bg-tertiary`) — subteks "via HP Android"
  3. **Cetak Browser** (`bg-secondary`) — subteks "printer biasa"
- **Status area** di bawah tombol (`<p>`) — tampilkan pesan progres dari callback `onStatus` (misal "Minta izin & pilih printer BLE...", "Menghubungkan...", "Struk berhasil dikirim ke printer."). Saat error, tampilkan merah.
- **Lebar kertas** diambil dari `shop.paper_width`:
  ```typescript
  const width = data.shop.paper_width === 80 ? 48 : 32;
  ```

### 4.2 Integrasi dengan flow checkout

Setelah `POST /api/pos/checkout` sukses:
1. Dapatkan `CheckoutResponse`.
2. Ambil `ShopSettings` dari Pinia store (sudah dimuat saat login dari `GET /api/shop-settings`).
3. Bentuk `ReceiptData` dengan `mapOrder(...)` + `shop` dari settings.
4. Tampilkan `ReceiptModal.vue` (modal struk) — persis seperti flow di backend Laravel.
5. Tombol "Transaksi Baru" untuk menutup modal & reset keranjang.

### 4.3 Halaman struk terpisah (opsional, untuk reprint)

Jika ingin halaman struk terpisah (rute `/struk/:invoice`), tampilkan struk + 3 tombol cetak. Data order bisa diambil dari response checkout yang disimpan, atau jika backend menyediakan endpoint detail order.

### 4.4 Pinia Store Shop Settings — `src/stores/shop.ts`

Buat store Pinia untuk pengaturan toko. **Muat SEKALI saat login** (bukan per-cetak, bukan localStorage):

```typescript
import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '@/services/api'; // axios instance dengan interceptor Bearer token
import type { ShopSettings } from '@/types';

export const useShopStore = defineStore('shop', () => {
  const settings = ref<ShopSettings | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchSettings() {
    if (settings.value) return; // sudah dimuat — jangan fetch ulang
    loading.value = true;
    error.value = null;
    try {
      const { data } = await api.get<{ data: ShopSettings }>('/shop-settings');
      settings.value = data.data;
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Gagal memuat pengaturan toko';
      // JANGAN throw — kasir tetap bisa bekerja; struk fallback ke 'Toko Saya'
    } finally {
      loading.value = false;
    }
  }

  function clear() {
    settings.value = null;
  }

  return { settings, loading, error, fetchSettings, clear };
});
```

Aturan:

1. Panggil `fetchSettings()` **di alur login** (bersamaan setelah menyimpan token), misal di halaman `LoginView` setelah sukses, atau di `router.beforeEach` saat token ada.
2. **Jangan fetch ulang** tiap kali membuka modal struk — store sudah menyimpan di memori. `fetchSettings()` sudah di-guard dengan `if (settings.value) return`.
3. Panggil `clear()` saat logout (barengan hapus token).
4. Saat checkout sukses, bentuk `ReceiptData.shop` dari `settings.value`:

   ```typescript
   const shop = shopStore.settings; // ShopSettings | null
   const receipt: ReceiptData = {
     shop: {
       shop_name: shop?.shop_name ?? 'Toko Saya',
       address: shop?.address ?? '',
       phone_number: shop?.phone_number ?? '',
       receipt_footer: shop?.receipt_footer ?? '',
       paper_width: shop?.paper_width ?? 58,
     },
     order: mapOrder(checkoutResponse),
   };
   ```

   Semua field nullable dari API (`address`, `phone_number`, `email`, `logo_url`, `receipt_footer`) sudah ditangani dengan `?? fallback`.

## 5. CATATAN TEKNIS WAJIB

1. **Web Bluetooth** hanya jalan di **Chrome/Edge + HTTPS** (localhost dianggap aman). Di Firefox/Safari tidak didukung → tampilkan pesan jelas saat `navigator.bluetooth === undefined`:
   > "Web Bluetooth tidak didukung. Gunakan Chrome/Edge dengan HTTPS, atau gunakan Cetak RawBT di Android."
2. **RawBT** memakai `window.open(url, '_self')` — pastikan di perangkat Android dengan aplikasi RawBT terinstal.
3. **Typescript:** semua fungsi di atas diberi type yang jelas. `navigator.bluetooth`, `device.gatt` mungkin perlu type declaration tambahan (Web Bluetooth API belum standar penuh di TypeScript) — gunakan `// @ts-expect-error` atau deklarasi type lokal jika perlu.
4. **Chunking 512 byte + delay 50ms** antar potongan — JANGAN diubah, mencegah buffer overflow printer.
5. **Format Rupiah** pakai `Intl.NumberFormat('id-ID')` (format `Rp 1.500`).
6. Struk thermal: teks jangan lebih lebar dari `width` karakter (32 untuk 58mm, 48 untuk 80mm).

Kerjakan dengan kode yang bersih, type-safe, dan mudah dipelihara. Jelaskan struktur yang kamu buat beserta cara menjalankannya.

=== PROMPT SELESAI ===

---

## Catatan Tambahan untuk Kamu (Pengguna)

### A. Endpoint Backend — `GET /api/shop-settings`

Endpoint ini **sudah tersedia** di backend Laravel (butuh `Authorization: Bearer {token}`). Mengembalikan 1 baris pengaturan toko:

```json
{
  "data": {
    "id": 1,
    "shop_name": "Warung Pintar",
    "address": "Jl. Merdeka No. 1, Jakarta",
    "phone_number": "0812-3456-7890",
    "email": "warung@example.com",
    "logo_url": null,
    "receipt_footer": "Terima kasih sudah berbelanja!",
    "paper_width": 58
  }
}
```

Jika belum ada data, semua field kembali `null` kecuali `paper_width` (default 58). Frontend harus toleran terhadap `null` — encoder sudah menangani (`shop_name ?? 'Toko Saya'`, cek `if (shop.address)`). **Muat sekali saat login** lalu simpan di Pinia `stores/shop.ts` (bukan localStorage — data hanya 1 baris, panggilan sangat cepat, dan localStorage berisiko data basi).

### B. Struktur File yang Ditambahkan di Frontend

```
src/
├── types/index.ts           # + ReceiptData, ShopSettings
├── utils/escpos.ts          # encoder ESC/POS (dari escpos.js Laravel)
├── services/printer.ts      # printViaBluetooth, printViaRawBt, printViaBrowser
├── stores/shop.ts           # (baru) ShopSettings + fetch dari GET /api/shop-settings
└── components/
    └── ReceiptModal.vue     # preview struk + 3 tombol cetak + status
```

### C. Korespondensi dengan File Backend Laravel

| Frontend (baru) | Backend Laravel (referensi) |
|------------------|-----------------------------|
| `src/utils/escpos.ts` | [`resources/js/escpos.js`](../resources/js/escpos.js) |
| `src/services/printer.ts` | bagian Web Bluetooth & RawBT di `escpos.js` |
| `ReceiptModal.vue` | [`resources/views/admin/pos/receipt.blade.php`](../resources/views/admin/pos/receipt.blade.php) + [`resources/js/receipt-print.js`](../resources/js/receipt-print.js) |
| `stores/shop.ts` | tabel `shop_settings` + `$shop` di blade |
