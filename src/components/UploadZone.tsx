import { useCallback, useRef, useState, type DragEvent } from 'react';
import { FileText, ImagePlus, Sparkles } from 'lucide-react';
import { useI18n } from '../i18n';
import { MAX_FILE_SIZE } from '../lib/image';
import { isPdfFile } from '../lib/filekind';

interface Props {
  onFile: (file: File) => void;
  onError: (message: string) => void;
}

const ACCEPTED_EXT = /\.(jpe?g|png|webp|heic|heif|avif)$/i;

/** Gambar contoh dibuat lokal via Canvas — tidak ada permintaan jaringan. */
async function makeSampleFile(): Promise<File> {
  const canvas = document.createElement('canvas');
  canvas.width = 1600;
  canvas.height = 1000;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 1600, 1000);
  grad.addColorStop(0, '#6366f1');
  grad.addColorStop(1, '#14b8a6');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1600, 1000);
  for (let i = 0; i < 24; i++) {
    ctx.beginPath();
    ctx.fillStyle = `rgba(255,255,255,${0.05 + (i % 5) * 0.03})`;
    ctx.arc(80 * i, 500 + Math.sin(i) * 380, 40 + (i % 7) * 22, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.font = 'bold 76px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PicLite Sample', 800, 470);
  ctx.font = '42px sans-serif';
  ctx.fillText('1600 × 1000 PNG', 800, 545);
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('ENCODE_FAILED'))), 'image/png'),
  );
  return new File([blob], 'piclite-sample.png', { type: 'image/png' });
}

export default function UploadZone({ onFile, onError }: Props) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [dragPdf, setDragPdf] = useState<DataTransferItem | null>(null);

  const validate = useCallback(
    (file: File) => {
      if (file.size > MAX_FILE_SIZE) {
        onError(t('errTooLarge'));
        return;
      }
      const okType =
        file.type.startsWith('image/') ||
        file.type === 'application/pdf' ||
        ACCEPTED_EXT.test(file.name) ||
        isPdfFile(file);
      if (!okType) {
        onError(t('errNotImage'));
        return;
      }
      onFile(file);
    },
    [onFile, onError, t],
  );

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    setDragPdf(null);
    const file = e.dataTransfer.files[0];
    if (file) validate(file);
  };

  return (
    <div className="w-full">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
          const item = e.dataTransfer.items?.[0];
          if (item?.kind === 'file' && item.type === 'application/pdf') setDragPdf(item);
        }}
        onDragLeave={() => {
          setDragging(false);
          setDragPdf(null);
        }}
        onDrop={handleDrop}
        className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-colors sm:py-20 ${
          dragging
            ? 'border-indigo-500 bg-indigo-50'
            : 'border-slate-300 bg-white hover:border-indigo-400 hover:bg-indigo-50/40'
        }`}
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
          {dragPdf?.type === 'application/pdf' ? (
            <FileText className="h-7 w-7" />
          ) : (
            <ImagePlus className="h-7 w-7" />
          )}
        </span>
        <p className="text-base font-semibold text-slate-800 sm:text-lg">{t('dropHere')}</p>
        <p className="text-sm text-slate-500">{t('orClick')}</p>
        <p className="text-xs text-slate-400">{t('supports')}</p>
      </div>

      <button
        type="button"
        onClick={async () => validate(await makeSampleFile())}
        className="mx-auto mt-4 flex items-center gap-1.5 rounded-full bg-slate-100 px-4 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-200"
      >
        <Sparkles className="h-3.5 w-3.5" />
        {t('trySample')}
      </button>

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/avif,application/pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,.avif,.pdf"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) validate(file);
          e.target.value = ''; // izinkan pilih file yang sama lagi
        }}
      />
    </div>
  );
}
