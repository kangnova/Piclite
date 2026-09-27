import { useI18n } from '../i18n';
import type { OutputFormat } from '../lib/image';

const panelClass = 'rounded-xl border border-slate-200 bg-white p-4 sm:p-5';

/* ---------- Panel 1: Kompres ---------- */

interface CompressPanelProps {
  quality: number;
  onChange: (value: number) => void;
}

export function CompressPanel({ quality, onChange }: CompressPanelProps) {
  const { t } = useI18n();
  return (
    <section className={panelClass}>
      <div className="mb-3 flex items-center justify-between">
        <label htmlFor="quality" className="text-sm font-semibold text-slate-800">
          {t('quality')}
        </label>
        <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-sm font-bold text-indigo-600">{quality}%</span>
      </div>
      <input
        id="quality"
        type="range"
        min={10}
        max={100}
        step={5}
        value={quality}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-indigo-600"
      />
      <div className="mt-1.5 flex justify-between text-[11px] text-slate-400">
        <span>10%</span>
        <span>100%</span>
      </div>
    </section>
  );
}

/* ---------- Panel 2: Resize ---------- */

interface ResizePanelProps {
  width: number;
  height: number;
  ratio: boolean;
  onWidth: (value: number) => void;
  onHeight: (value: number) => void;
  onToggleRatio: (value: boolean) => void;
}

export function ResizePanel({ width, height, ratio, onWidth, onHeight, onToggleRatio }: ResizePanelProps) {
  const { t } = useI18n();
  return (
    <section className={panelClass}>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="width" className="mb-1 block text-xs font-medium text-slate-500">
            {t('width')} (px)
          </label>
          <input
            id="width"
            type="number"
            min={1}
            max={20000}
            value={width}
            onChange={(e) => onWidth(Math.max(1, Math.round(Number(e.target.value) || 1)))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        <div>
          <label htmlFor="height" className="mb-1 block text-xs font-medium text-slate-500">
            {t('height')} (px)
          </label>
          <input
            id="height"
            type="number"
            min={1}
            max={20000}
            value={height}
            onChange={(e) => onHeight(Math.max(1, Math.round(Number(e.target.value) || 1)))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>
      </div>
      <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={ratio}
          onChange={(e) => onToggleRatio(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300 accent-indigo-600"
        />
        {t('keepRatio')}
      </label>
    </section>
  );
}

/* ---------- Panel 3: Convert ---------- */

interface ConvertPanelProps {
  format: OutputFormat;
  onChange: (value: OutputFormat) => void;
}

const FORMATS: { value: OutputFormat; label: string; hint: string }[] = [
  { value: 'jpeg', label: 'JPG', hint: 'paling umum, tanpa transparansi' },
  { value: 'png', label: 'PNG', hint: 'tanpa kompresi, ada transparansi' },
  { value: 'webp', label: 'WebP', hint: 'paling kecil, modern' },
];

export function ConvertPanel({ format, onChange }: ConvertPanelProps) {
  const { t } = useI18n();
  return (
    <section className={panelClass}>
      <label htmlFor="format" className="mb-2 block text-sm font-semibold text-slate-800">
        {t('outputFormat')}
      </label>
      <select
        id="format"
        value={format}
        onChange={(e) => onChange(e.target.value as OutputFormat)}
        className="w-full cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
      >
        {FORMATS.map((f) => (
          <option key={f.value} value={f.value}>
            {f.label} — {f.hint}
          </option>
        ))}
      </select>
    </section>
  );
}
