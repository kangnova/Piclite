# Product Requirements Document (PRD)

## 1. Informasi Umum
- **Nama Produk:** PicLite (Bisa diubah nanti)
- **Deskripsi:** Web micro-tool gratis untuk mengompres, mengubah ukuran (resize), dan mengonversi format gambar secara instan langsung di browser pengguna tanpa perlu mengunggah ke server.
- **Target Pengguna:** Pelajar, pekerja kantoran, dan pengguna umum yang butuh edit gambar cepat untuk syarat dokumen (misal: pendaftaran online, upload web) tanpa perlu menginstal aplikasi.

## 2. Spesifikasi Teknis
- **Frontend Framework:** React (Vite) atau Next.js (App Router).
- **Styling:** Tailwind CSS + Lucide Icons (untuk ikon UI).
- **Logika Pemrosesan:** Murni 100% Client-Side. Tidak ada Backend. Tidak ada Database.
- **Teknologi Gambar:** HTML5 Canvas API dan library `browser-image-compression`.

## 3. Fitur Utama (MVP - Minimum Viable Product)

### A. Upload Area
- Mendukung *Drag and Drop*.
- Mendukung klik untuk memilih file dari perangkat.
- Validasi format file (hanya menerima `.jpg`, `.jpeg`, `.png`, `.webp`).
- Batas maksimal ukuran file awal: 10 MB.

### B. Workspace (Area Kerja)
Setelah gambar diunggah, tampilkan 3 tab/opsi utama:
1. **Compress (Kompresi):**
   - Slider untuk mengatur kualitas (10% - 100%).
   - Estimasi ukuran file hasil kompresi secara *real-time*.
2. **Resize (Ubah Ukuran):**
   - Input angka untuk `Width` dan `Height` (dalam pixel).
   - *Toggle* "Keep Aspect Ratio" (pertahankan rasio aspek agar gambar tidak gepeng).
3. **Convert (Ubah Format):**
   - Dropdown untuk memilih format keluaran: JPG, PNG, atau WebP.

### C. Live Preview & Download
- Menampilkan gambar asli bersanding dengan hasil manipulasi (Before & After).
- Menampilkan informasi perbandingan: 
  - Resolusi asli vs baru.
  - Ukuran file asli vs baru (misal: 2.5 MB -> 450 KB).
- Tombol "Download" yang besar dan jelas.
- Tombol "Reset/Upload Baru" untuk memulai ulang.

## 4. Syarat Non-Fungsional
- **Performa:** Pemrosesan harus terjadi seketika (*instant*) karena berjalan di perangkat lokal pengguna.
- **Responsif:** UI harus tetap rapi dan berfungsi dengan baik saat dibuka di layar *smartphone*.
- **Privasi:** Tambahkan teks kecil di halaman utama: *"100% Aman. Gambar Anda diproses secara lokal di perangkat Anda dan tidak pernah dikirim ke server kami."* (Ini nilai jual yang sangat bagus).