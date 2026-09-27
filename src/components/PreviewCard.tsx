interface Props {
  label: string;
  src: string;
  width: number;
  height: number;
  sizeText: string;
  fileName?: string;
  nameLabel?: string;
  resolutionLabel: string;
  sizeLabel: string;
  highlight?: boolean;
}

/** Latar papan catur agar area transparan (PNG/WebP) terlihat jelas. */
const checkerStyle = {
  backgroundImage:
    'linear-gradient(45deg,#e2e8f0 25%,transparent 25%),linear-gradient(-45deg,#e2e8f0 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e2e8f0 75%),linear-gradient(-45deg,transparent 75%,#e2e8f0 75%)',
  backgroundSize: '16px 16px',
  backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0',
};

export default function PreviewCard({
  label,
  src,
  width,
  height,
  sizeText,
  fileName,
  nameLabel,
  resolutionLabel,
  sizeLabel,
  highlight,
}: Props) {
  return (
    <div
      className={`overflow-hidden rounded-xl border bg-white ${
        highlight ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-slate-200'
      }`}
    >
      <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            highlight ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
          }`}
        >
          {label}
        </span>
      </div>
      <div className="flex h-44 items-center justify-center p-2 sm:h-52" style={checkerStyle}>
        <img src={src} alt={label} className="max-h-full max-w-full rounded object-contain" />
      </div>
      <dl className="space-y-1 px-3 py-2 text-xs text-slate-600">
        <div className="flex justify-between gap-2">
          <dt>{resolutionLabel}</dt>
          <dd className="font-medium text-slate-800">
            {width} × {height}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>{sizeLabel}</dt>
          <dd className={`font-medium ${highlight ? 'text-indigo-600' : 'text-slate-800'}`}>{sizeText}</dd>
        </div>
        {fileName && nameLabel && (
          <div className="flex justify-between gap-2">
            <dt>{nameLabel}</dt>
            <dd className="max-w-[60%] truncate font-medium text-slate-800" title={fileName}>
              {fileName}
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}
