import { ref, onBeforeUnmount } from 'vue';
import type { Html5Qrcode } from 'html5-qrcode';

export function useBarcodeScanner() {
  const isScanning = ref(false);
  const isTorchSupported = ref(false);
  const isTorchOn = ref(false);
  const error = ref<string | null>(null);
  const scannerNotice = ref<string | null>(null);
  let html5Qrcode: Html5Qrcode | null = null;

  function showNotice(msg: string): void {
    scannerNotice.value = msg;
    setTimeout(() => {
      if (scannerNotice.value === msg) {
        scannerNotice.value = null;
      }
    }, 3000);
  }

  async function startScan(
    elementId: string,
    onSuccess: (decodedText: string) => void,
    options: { fps?: number; qrbox?: { width: number; height: number } } = {}
  ): Promise<void> {
    error.value = null;
    scannerNotice.value = null;
    isTorchSupported.value = false;
    isTorchOn.value = false;

    try {
      if (!html5Qrcode) {
        const { Html5Qrcode } = await import('html5-qrcode');
        html5Qrcode = new Html5Qrcode(elementId);
      }
      isScanning.value = true;

      const fps = options.fps ?? 25;
      const qrbox = options.qrbox ?? { width: 260, height: 260 };

      await html5Qrcode.start(
        { facingMode: 'environment' },
        {
          fps,
          qrbox,
          aspectRatio: 1.0,
          videoConstraints: {
            facingMode: 'environment',
            focusMode: 'continuous',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          } as any,
        },
        (decodedText) => {
          onSuccess(decodedText);
        },
        () => {
          // Frame scan pass, ignore
        }
      );

      // Check torch support after camera starts
      try {
        const capabilities = html5Qrcode.getRunningTrackCapabilities() as any;
        if (capabilities && 'torch' in capabilities && capabilities.torch) {
          isTorchSupported.value = true;
        } else {
          isTorchSupported.value = false;
        }
      } catch {
        isTorchSupported.value = false;
      }
    } catch (err: any) {
      isScanning.value = false;
      error.value = err?.message || 'Gagal membuka kamera';
    }
  }

  async function handleTorchClick(): Promise<void> {
    if (!html5Qrcode || !isScanning.value) return;

    if (!isTorchSupported.value) {
      showNotice('Senter/Flash tidak didukung oleh kamera/perangkat ini');
      return;
    }

    try {
      const nextState = !isTorchOn.value;
      await html5Qrcode.applyVideoConstraints({
        advanced: [{ torch: nextState } as any],
      } as any);
      isTorchOn.value = nextState;
    } catch (err) {
      console.warn('Gagal mengubah status Senter:', err);
      showNotice('Gagal menyalakan senter pada perangkat ini');
    }
  }

  async function triggerFocus(): Promise<void> {
    if (!html5Qrcode || !isScanning.value) return;

    try {
      await html5Qrcode.applyVideoConstraints({
        advanced: [{ focusMode: 'continuous' } as any],
      } as any);
      showNotice('Memicu ulang fokus kamera...');
    } catch {
      showNotice('Fokus otomatis diatur secara internal oleh sistem browser');
    }
  }

  async function stopScan(): Promise<void> {
    if (html5Qrcode && isScanning.value) {
      try {
        if (isTorchOn.value) {
          await html5Qrcode.applyVideoConstraints({
            advanced: [{ torch: false } as any],
          } as any).catch(() => {});
        }
        await html5Qrcode.stop();
        html5Qrcode.clear();
      } catch {
        // ignore stop error
      } finally {
        isScanning.value = false;
        isTorchSupported.value = false;
        isTorchOn.value = false;
        scannerNotice.value = null;
        html5Qrcode = null;
      }
    }
  }

  onBeforeUnmount(() => {
    stopScan();
  });

  return {
    isScanning,
    isTorchSupported,
    isTorchOn,
    error,
    scannerNotice,
    startScan,
    stopScan,
    handleTorchClick,
    triggerFocus,
  };
}
