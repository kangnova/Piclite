# Rencana Eksekusi: Micro-Tool Manipulasi Gambar (PicLite)

Dokumen ini berisi langkah-langkah taktis untuk membangun dan meluncurkan alat manipulasi gambar dalam waktu kurang dari 2 minggu menggunakan bantuan AI.

## Fase 1: Setup & Persiapan (Hari 1-2)
- [ ] **Pilih Tech Stack:** Gunakan React + Vite (atau Next.js jika ingin SEO lebih kuat) dan Tailwind CSS untuk tampilan.
- [ ] **Inisialisasi Proyek:** Minta AI membuat *boilerplate* proyek dan mengatur *routing* dasar.
- [ ] **Siapkan Library Utama:** Instal `browser-image-compression` (library ringan untuk kompresi di sisi klien) dan manfaatkan HTML5 Canvas API untuk *resize* dan *convert*.

## Fase 2: Pengembangan Fitur Inti (Hari 3-5)
Fokus pada fungsionalitas murni terlebih dahulu, abaikan desain yang terlalu rumit.
- [ ] **Fitur Upload:** Buat area *Drag & Drop* untuk mengunggah gambar.
- [ ] **Fitur Kompresi:** Implementasi slider untuk mengatur tingkat kompresi (Kualitas 1-100%).
- [ ] **Fitur Resize:** Implementasi input untuk mengubah resolusi (Width x Height).
- [ ] **Fitur Convert:** Implementasi dropdown untuk mengubah format ke JPG, PNG, atau WebP.
- [ ] **Fitur Download:** Buat tombol untuk mengunduh hasil gambar yang sudah dimanipulasi.

## Fase 3: UI/UX & Optimasi (Hari 6-7)
- [ ] **Styling dengan Tailwind:** Minta AI merapikan desain agar terlihat modern, bersih, dan responsif (bagus dibuka di HP).
- [ ] **Preview Gambar:** Tampilkan perbandingan gambar asli vs hasil (termasuk ukuran file Sebelum & Sesudah).
- [ ] **Handling Error:** Tambahkan notifikasi jika pengguna mengunggah file selain gambar atau file terlalu besar (misal: batasi max 10MB).

## Fase 4: SEO & Deployment (Hari 8-9)
- [ ] **Optimasi SEO (Penting untuk Trafik):** Minta AI membuatkan Meta Tags, Title, dan Description yang mengandung kata kunci (contoh: "Kompres Gambar JPG Online Gratis", "Resize Foto 200kb").
- [ ] **Deployment:** Push kode ke GitHub, lalu hubungkan ke Vercel atau Netlify untuk *hosting* gratis.
- [ ] **Custom Domain (Opsional):** Beli domain murah (seperti `.my.id` atau `.com`) dan pasang ke Vercel agar terlihat profesional.

## Fase 5: Pemasaran & Monetisasi (Hari 10 dan seterusnya)
- [ ] **Submit ke Mesin Pencari:** Daftarkan website ke Google Search Console.
- [ ] **Share di Medsos:** Buat konten pendek di X/Twitter atau grup Facebook tentang *tool* gratis ini (misal: "Cara kompres foto KTP untuk daftar CPNS").
- [ ] **Monetisasi:** Setelah mencapai ~1.000 pengunjung/bulan, daftarkan ke Google AdSense atau pasang banner afiliasi.