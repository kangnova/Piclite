/**
 * Deteksi jenis file ringan — sengaja dipisah dari lib/pdf.ts agar engine
 * berat (pdf.js + pdf-lib) tetap lazy-loaded dan tidak membebani load awal.
 */
export function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
}
