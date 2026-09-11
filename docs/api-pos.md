# REST API — Kasir (POS)

API untuk kebutuhan integrasi frontend terpisah (web/mobile/tablet kasir).
Otentikasi memakai **Laravel Sanctum** (Bearer token).

Base URL:

```
http://localhost:8000/api
```

Semua endpoint (kecuali `POST /auth/login`) wajib menyertakan header:

```
Authorization: Bearer {token}
Accept: application/json
```

---

## 1. Autentikasi

### POST `/api/auth/login`

Login kasir/admin, menghasilkan token.

Request:

```json
{
  "email": "kasir@warung.com",
  "password": "kasir123"
}
```

Response `200`:

```json
{
  "success": true,
  "message": "Login berhasil.",
  "data": {
    "token": "1|xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "token_type": "Bearer",
    "user": {
      "id": 2,
      "name": "Siti Aminah",
      "email": "kasir@warung.com",
      "role": "cashier"
    }
  }
}
```

Simpan `token` dan gunakan di setiap request selanjutnya.

### GET `/api/auth/me`

Ambil data pengguna yang sedang login.

### POST `/api/auth/logout`

Mencabut token aktif (logout).

---

## 2. Produk (Layar Kasir)

### GET `/api/products`

Daftar produk **yang punya stok** untuk grid/daftar kasir.
Pagination default 20 per halaman.

Query params (opsional):

| Param         | Contoh            | Keterangan                       |
|---------------|-------------------|----------------------------------|
| `search`      | `indomie`         | Cari nama / SKU / barcode        |
| `category_id` | `1`               | Filter kategori                  |
| `per_page`    | `50`              | Jumlah item per halaman          |

Response `200` (pagination standar Laravel):

```json
{
  "data": [
    {
      "id": 1,
      "category_id": 1,
      "category": { "id": 1, "name": "Makanan" },
      "name": "Indomie Goreng",
      "sku": "SKU-001",
      "barcode": "8991234567890",
      "cost_price": 2500,
      "price": 3500,
      "stock_quantity": 47,
      "unit": "pcs"
    }
  ],
  "links": { "...": "..." },
  "meta": { "current_page": 1, "last_page": 3, "total": 58 }
}
```

### GET `/api/products/barcode/{barcode}`

Cari produk **tepat 1 item** berdasarkan scan barcode.
Cocok untuk scanner fisik / kamera HP (QR/barcode).

Response `200`:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Indomie Goreng",
    "barcode": "8991234567890",
    "price": 3500,
    "stock_quantity": 47,
    "unit": "pcs"
  }
}
```

Response `404` jika barcode tidak ditemukan.

### GET `/api/products/{id}`

Detail produk berdasarkan ID.

### POST `/api/products`

Tambah produk baru dari frontend.

Request Body:

```json
{
  "category_id": 1,
  "name": "Teh Botol Sosro",
  "sku": "",
  "barcode": "",
  "cost_price": 2000,
  "price": 3500,
  "stock_quantity": 20,
  "unit": "botol"
}
```

Fitur Friendly untuk Frontend:
- `barcode`: **Opsional** (boleh `null`/dikosongkan jika produk belum ber-barcode / tidak discan).
- `sku`: **Opsional**. Jika dikosongkan/`null`, sistem akan otomatis meng-generate SKU unik dengan format `PRD-YYYYMMDD-XXXX` (contoh: `PRD-20260807-X1Y2`).
- `unit`: **Opsional**, default `"pcs"`.
- Jika `stock_quantity > 0`, sistem otomatis mencatat stok awal ke mutasi stok (`stock_in`).

Response `201`:

```json
{
  "success": true,
  "message": "Produk \"Teh Botol Sosro\" berhasil ditambahkan.",
  "data": {
    "id": 12,
    "category_id": 1,
    "category": { "id": 1, "name": "Makanan" },
    "name": "Teh Botol Sosro",
    "sku": "PRD-20260807-A1B2",
    "barcode": null,
    "cost_price": 2000,
    "price": 3500,
    "stock_quantity": 20,
    "unit": "botol"
  }
}
```

---

## 3. Kategori

### GET `/api/categories`

Ambil daftar kategori (untuk mengisi dropdown kategori di form tambah produk frontend).

Response `200`:

```json
{
  "data": [
    { "id": 1, "name": "Makanan" },
    { "id": 2, "name": "Minuman" }
  ]
}
```

---

## 4. Pengaturan Toko

### GET `/api/shop-settings`

Ambil pengaturan toko (nama, alamat, telp, email, logo, footer struk, lebar kertas thermal). Data ini dipakai untuk header struk saat cetak. Hanya **1 baris** di tabel `shop_settings`.

Response `200`:

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

Catatan untuk frontend:

- Jika tabel belum diisi, semua field mengembalikan `null`/default (`paper_width` = 58, `id` = `null`).
- Frontend disarankan memuat endpoint ini **sekali saat login** lalu simpan di Pinia store (bukan localStorage) — data hanya 1 baris, panggilan sangat cepat.

---

## 5. Checkout Transaksi

### POST `/api/pos/checkout`

Proses pembayaran sekaligus kurangi stok + catat mutasi stok (`sale`).

Request:

```json
{
  "items": [
    { "product_id": 1, "quantity": 2 },
    { "product_id": 5, "quantity": 1 }
  ],
  "paid_amount": 15000
}
```

Catatan:

- `items` wajib minimal 1, `product_id` tidak boleh duplikat, `quantity` minimal 1.
- `paid_amount` **opsional**. Boleh tidak dikirim (untuk kasus pembayaran belum diproses / dicatat terpisah). Jika dikirim, nilainya **tidak boleh kurang dari total belanja** — jika kurang, API menolak dengan `422`.
- Jika `paid_amount` diisi, response menyertakan objek `payment` berisi `total_amount`, `paid_amount`, dan `change` (kembalian = `paid_amount - total_amount`).
- Stok diperiksa & dikunci (`lockForUpdate`) agar aman saat transaksi bersamaan.
- Semua proses dalam satu transaksi database; gagal 1 item → seluruhnya dibatalkan.

Response `201` (saat `paid_amount` diisi):

```json
{
  "success": true,
  "message": "Transaksi INV-20260807-AB12 berhasil diproses.",
  "data": {
    "id": 101,
    "invoice_number": "INV-20260807-AB12",
    "order_date": "2026-08-07T20:30:00+07:00",
    "total_amount": 10500,
    "status": "completed",
    "cashier": { "id": 2, "name": "Siti Aminah" },
    "items": [
      {
        "id": 1,
        "product_id": 1,
        "product": { "id": 1, "name": "Indomie Goreng", "unit": "pcs" },
        "quantity": 2,
        "price": 3500,
        "total": 7000
      }
    ]
  },
  "payment": {
    "total_amount": 10500,
    "paid_amount": 20000,
    "change": 9500
  }
}
```

Response `422` jika `paid_amount` kurang dari total belanja:

```json
{
  "message": "Jumlah pembayaran (Rp 5.000) kurang dari total belanja (Rp 10.500).",
  "errors": { "paid_amount": ["..."] }
}
```

Response `422` jika stok tidak mencukupi:

```json
{
  "message": "Stok \"Indomie Goreng\" tidak mencukupi (tersisa 3 pcs).",
  "errors": { "items": ["..."] }
}
```

---

## Contoh Pengujian Manual

### Via curl

```bash
# 1. Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"kasir@warung.com\",\"password\":\"kasir123\"}"

# 2. Ambil token dari response, lalu:
curl http://localhost:8000/api/products?search=indomie \
  -H "Accept: application/json" \
  -H "Authorization: Bearer {TOKEN}"

# 3. Scan barcode
curl http://localhost:8000/api/products/barcode/8991234567890 \
  -H "Accept: application/json" \
  -H "Authorization: Bearer {TOKEN}"

# 4. Checkout
curl -X POST http://localhost:8000/api/pos/checkout \
  -H "Accept: application/json" \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"items\":[{\"product_id\":1,\"quantity\":2}]}"
```

### Alur integrasi frontend kasir

1. Login → simpan `token` (misal di localStorage/secure storage).
2. Saat input barcode: panggil `GET /products/barcode/{barcode}` → tambahkan ke keranjang.
3. Pencarian manual: `GET /products?search=...` (debounce saat mengetik).
4. Checkout: `POST /pos/checkout` → tampilkan struk dari response.

---

## Catatan

- Error handling otentikasi: `401 Unauthorized` jika token invalid/kedaluwarsa.
- Error validasi: `422` dengan struktur `{ message, errors }` standar Laravel.
- Endpoint lain (tambah produk, stok opname) menyusul.

