import { FileText } from 'lucide-react';

interface Props {
  label: string;
  fileName: string;
  pages?: number;
  pagesLabel: string;
  sizeText: string;
  sizeLabel: string;
  highlight?: boolean;
}

/** Kartu ringkasan PDF — PDF tidak bisa dirender oleh <img>, jadi tampilkan info saja. */
export default function PdfCard({
  label,
  fileName,
  pages,
  pagesLabel,
  sizeText,
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
        <FileText className={`h-4 w-4 ${highlight ? 'text-indigo-400' : 'text-slate-300'}`} />
      </div>
      <div className="flex h-28 items-center justify-center sm:h-32">
        <FileText
          className={`h-12 w-12 ${highlight ? 'text-indigo-200' : 'text-slate-200'}`}
          strokeWidth={1.5}
        />
      </div>
      <dl className="space-y-1 px-3 py-2 text-xs text-slate-600">
        <div className="flex justify-between gap-2">
          <dt>{pagesLabel}</dt>
          <dd className="font-medium text-slate-800">{pages ?? '…'}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>{sizeLabel}</dt>
          <dd className={`font-medium ${highlight ? 'text-indigo-600' : 'text-slate-800'}`}>{sizeText}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="shrink-0">File</dt>
          <dd className="max-w-[60%] truncate font-medium text-slate-800" title={fileName}>
            {fileName}
          </dd>
        </div>
      </dl>
    </div>
  );
}
