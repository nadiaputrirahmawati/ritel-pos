import { bytesToBase64 } from '../utils/escpos';

// Type declarations lokal untuk Web Bluetooth API (belum standar penuh di TypeScript)
interface BluetoothRemoteGATTCharacteristicLike {
  properties: { write: boolean; writeWithoutResponse: boolean };
  writeValueWithResponse(value: BufferSource): Promise<void>;
  writeValueWithoutResponse(value: BufferSource): Promise<void>;
}

interface BluetoothRemoteGATTServiceLike {
  getCharacteristics(): Promise<BluetoothRemoteGATTCharacteristicLike[]>;
}

interface BluetoothRemoteGATTServerLike {
  connect(): Promise<BluetoothRemoteGATTServerLike>;
  disconnect(): void;
  getPrimaryService(uuid: string): Promise<BluetoothRemoteGATTServiceLike>;
  getPrimaryServices(): Promise<BluetoothRemoteGATTServiceLike[]>;
}

interface BluetoothDeviceLike {
  name?: string;
  gatt: BluetoothRemoteGATTServerLike | null;
}

interface NavigatorBluetoothLike {
  requestDevice(options: {
    acceptAllDevices: boolean;
    optionalServices: string[];
  }): Promise<BluetoothDeviceLike>;
}

// UUID service umum printer thermal (SAMA dengan backend Laravel)
const PRINTER_SERVICE_UUIDS = [
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // MOKO / SmartRF (umum di printer 58mm)
  '0000ff00-0000-1000-8000-00805f9b34fb', // vendor FF00
  '000018f0-0000-1000-8000-00805f9b34fb', // vendor 18F0
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // beberapa printer label
];

interface WritableTarget {
  characteristic: BluetoothRemoteGATTCharacteristicLike;
  withoutResponse: boolean;
}

async function findWritableCharacteristic(
  server: BluetoothRemoteGATTServerLike
): Promise<WritableTarget | null> {
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
  } catch {
    /* lanjut fallback */
  }

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
    } catch {
      /* service tidak ada, lanjut */
    }
  }
  return null;
}

export async function printViaBluetooth(
  bytes: Uint8Array,
  onStatus?: (msg: string) => void
): Promise<boolean> {
  const bluetooth = (navigator as Navigator & { bluetooth?: NavigatorBluetoothLike }).bluetooth;
  if (typeof navigator === 'undefined' || !bluetooth) {
    throw new Error(
      'Web Bluetooth tidak didukung browser ini. Gunakan Chrome/Edge dengan koneksi HTTPS atau localhost.'
    );
  }

  onStatus?.('Minta izin & pilih printer BLE...');
  const device = await bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: PRINTER_SERVICE_UUIDS,
  });

  onStatus?.(`Menghubungkan ke "${device.name || 'Printer'}"...`);
  const server = await device.gatt!.connect();

  const target = await findWritableCharacteristic(server);
  if (!target) {
    try {
      server.disconnect();
    } catch {
      /* abaikan */
    }
    throw new Error(
      'Tidak ditemukan karakteristik tulis pada printer. Pastikan printer menyala & mendukung BLE (bukan classic BT/SPP).'
    );
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

  setTimeout(() => {
    try {
      server.disconnect();
    } catch {
      /* abaikan */
    }
  }, 800);
  onStatus?.('Struk berhasil dikirim ke printer.');
  return true;
}

/**
 * Cetak via aplikasi RawBT (khusus Android).
 *
 * PENTING — format URL menentukan perilaku RawBT:
 *
 * 1. `rawbt://print?base64=<b64>` (format lama)
 *    RawBT terbuka TAPI memperlakukan string tersebut sebagai teks biasa,
 *    sehingga yang tercetak adalah string base64-nya, bukan hasil dekode.
 *
 * 2. `intent:base64,<b64>#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;`
 *    Ini Android Intent URL. Browser Android meneruskan payload base64 sebagai
 *    data URI ke RawBT (`rawbt://base64,<b64>`). RawBT mengenali prefix
 *    "base64,", mendekode menjadi byte ESC/POS, lalu mencetak struk dengan
 *    benar. Format ini sudah terbukti berhasil dipakai di project lain.
 *
 * Fungsi ini tetap mendeteksi perangkat Android dulu agar:
 * - PC/laptop  → langsung menampilkan error yang jelas (tanpa membuka URL).
 * - Android    → mengarahkan ke Intent RawBT via window.location.href.
 */
export function printViaRawBt(bytes: Uint8Array): boolean {
  const isAndroid =
    typeof navigator !== 'undefined' &&
    /Android/i.test(navigator.userAgent || '');

  if (!isAndroid) {
    throw new Error(
      'Cetak RawBT hanya mendukung HP Android dengan aplikasi "RawBT" terinstal (Play Store: ru.a402d.rawbtprinter). Di PC/laptop gunakan Cetak Bluetooth atau Cetak Browser.'
    );
  }

  const base64 = bytesToBase64(bytes);

  // Android Intent URL ke RawBT (paket resmi: ru.a402d.rawbtprinter)
  const intentUrl =
    `intent:base64,${encodeURIComponent(base64)}` +
    `#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;`;

  window.location.href = intentUrl;

  return true;
}

export function printViaBrowser(): void {
  window.print();
}
