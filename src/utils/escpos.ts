import type { ReceiptData } from '../types';

/**
 * Helper internal perintah byte ESC/POS berbasis String.
 * Menggunakan \n untuk pindah baris agar 100% aman di semua printer.
 */
const ESC = '\u001b';
const GS = '\u001d';

const CMD = {
  INIT: ESC + '@',
  ALIGN_LEFT: ESC + 'a' + '\u0000',
  ALIGN_CENTER: ESC + 'a' + '\u0001',
  ALIGN_RIGHT: ESC + 'a' + '\u0002',
  BOLD_ON: ESC + 'E' + '\u0001',
  BOLD_OFF: ESC + 'E' + '\u0000',
  SIZE_NORMAL: GS + '!' + '\u0000',
  SIZE_DOUBLE: GS + '!' + '\u0011',
  CUT: GS + 'V' + '\u0000',
};

/** Format angka menjadi string Rupiah sederhana (mis. "Rp 15.000") */
function formatRupiah(amount: number): string {
  return 'Rp ' + Number(amount || 0).toLocaleString('id-ID');
}

/** Memotong teks jika melebihi batas lebar kolom */
function limitLength(text: string, maxLength: number): string {
  const str = String(text ?? '');
  if (str.length <= maxLength) return str;
  return str.slice(0, Math.max(0, maxLength - 1)) + '~';
}

/** Membikin teks rata kiri dan kanan di dalam 1 baris */
function makeTwoColumns(leftText: string, rightText: string, totalWidth: number): string {
  const left = String(leftText ?? '');
  const right = String(rightText ?? '');
  const spaceNeeded = totalWidth - (left.length + right.length);
  const spaces = spaceNeeded > 0 ? ' '.repeat(spaceNeeded) : ' ';
  return left + spaces + right;
}

/**
 * ReceiptBuilder: Kelas pembantu untuk merakit struk.
 * Menggunakan string buffer agar perintah ESC/POS terangkai sempurna
 * dan diakhiri dengan \n murni.
 */
class ReceiptBuilder {
  private buffer: string = '';
  private width: number;

  constructor(paperWidth = 32) {
    this.width = paperWidth;
    this.buffer += CMD.INIT;
  }

  /** Menambahkan nama toko / judul besar di tengah */
  title(text: string): this {
    const maxLen = Math.floor(this.width / 2); // Dibagi 2 karena font 2x lebih besar
    this.buffer += CMD.ALIGN_CENTER + CMD.BOLD_ON + CMD.SIZE_DOUBLE;
    this.buffer += limitLength(text, maxLen) + '\n';
    this.buffer += CMD.SIZE_NORMAL + CMD.BOLD_OFF; // Kembalikan ke normal
    return this;
  }

  /** Menambahkan teks biasa di tengah (misal: alamat / footer) */
  center(text: string, bold = false): this {
    if (!text) return this;
    this.buffer += CMD.ALIGN_CENTER;
    if (bold) this.buffer += CMD.BOLD_ON;
    this.buffer += limitLength(text, this.width) + '\n';
    if (bold) this.buffer += CMD.BOLD_OFF;
    return this;
  }

  /** Menambahkan garis pemisah (misal: "=" atau "-") */
  divider(char = '-'): this {
    const line = char.repeat(Math.max(1, this.width));
    this.buffer += CMD.ALIGN_LEFT + line + '\n';
    return this;
  }

  /** Menambahkan baris informasi dengan label teratur (mis. "Kasir : Admin") */
  info(label: string, value: string): this {
    const cleanLabel = limitLength(label, 10);
    const cleanVal = limitLength(value, Math.max(8, this.width - 12));
    const padding = ' '.repeat(Math.max(1, 10 - cleanLabel.length));
    const line = `${cleanLabel}:${padding}${cleanVal}`;
    this.buffer += CMD.ALIGN_LEFT + line + '\n';
    return this;
  }

  /** Menambahkan item barang yang dibeli */
  item(name: string, quantity: number, price: number, total: number): this {
    const itemTitle = limitLength(name, this.width);
    const detailLine = makeTwoColumns(
      `${quantity} x ${formatRupiah(price)}`,
      formatRupiah(total),
      this.width
    );
    this.buffer += CMD.ALIGN_LEFT + itemTitle + '\n';
    this.buffer += detailLine + '\n';
    return this;
  }

  /** Menambahkan total belanja di sisi kanan dengan huruf tebal */
  total(totalAmount: number): this {
    const line = limitLength(`TOTAL ${formatRupiah(totalAmount)}`, this.width);
    this.buffer += CMD.ALIGN_RIGHT + CMD.BOLD_ON + line + '\n' + CMD.BOLD_OFF;
    return this;
  }

  /** Menambahkan baris rincian pembayaran (Bayar / Kembalian) */
  payLine(label: string, amount: number): this {
    const line = makeTwoColumns(label, formatRupiah(amount), this.width);
    this.buffer += CMD.ALIGN_LEFT + line + '\n';
    return this;
  }

  /** Menyelesaikan perakitan dan memberikan data byte akhir untuk printer */
  build(): Uint8Array {
    // 3 kali \n untuk mendorong kertas melewati pisau potong, lalu potong
    this.buffer += '\n\n\n' + CMD.CUT; 
    
    // Encode string final menjadi Uint8Array HANYA 1 KALI di akhir
    const encoder = new TextEncoder();
    return encoder.encode(this.buffer);
  }
}

/**
 * Fungsi Utama: Mengubah data struk transaksi menjadi byte printer ESC/POS.
 * @param data Data struk lengkap dari transaksi
 * @param width Lebar kertas (32 karakter untuk 58mm, 48 karakter untuk 80mm)
 */
export function encodeReceipt(data: ReceiptData, width = 32): Uint8Array {
  const { shop, order } = data;
  const builder = new ReceiptBuilder(width);

  // 1. HEADER TOKO
  builder.title(shop.shop_name || 'Toko Saya');
  if (shop.address) builder.center(shop.address);
  if (shop.phone_number) builder.center(shop.phone_number);

  // 2. NOMOR INVOICE & INFO TRANSAKSI
  builder
    .center(order.invoice_number, true)
    .divider('=')
    .info('Waktu', order.order_date)
    .info('Kasir', order.cashier)
    .divider('-');

  // 3. DAFTAR BARANG
  for (const it of order.items || []) {
    builder.item(it.name, it.quantity, it.price, it.total);
  }

  // 4. TOTAL & PEMBAYARAN
  builder.divider('-').total(order.total);

  if (order.paid_amount !== undefined && order.change !== undefined) {
    builder
      .payLine('Bayar', order.paid_amount)
      .payLine('Kembalian', order.change);
  }

  // 5. FOOTER / UCAPAN TERIMA KASIH
  builder.divider('-');
  if (shop.receipt_footer) {
    builder.center(shop.receipt_footer);
  }

  return builder.build();
}

/** Mengubah Uint8Array menjadi string Base64 (untuk printer Android via RawBT) */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}