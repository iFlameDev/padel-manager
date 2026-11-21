# Implementation Note: Mengubah Konfigurasi Saat Turnamen Berjalan

## Tujuan

Host dapat mengubah pemain, jumlah/nama lapangan, dan aturan turnamen/skor kapan saja, termasuk setelah turnamen dimulai dan setelah beberapa pertandingan selesai. Perubahan konfigurasi tidak boleh menghapus atau diam-diam mengubah hasil pertandingan yang sudah tersimpan.

## Perilaku Saat Ini

- `SetupView` menonaktifkan sebagian besar pengaturan hanya jika turnamen sudah dimulai **dan** ada pertandingan dengan skor. Ini mencakup data pemain/tim, konfigurasi permainan, dan jumlah lapangan.
- Beberapa kontrol tetap tidak konsisten dengan kondisi tersebut: antara lain nama lapangan dan status aktif pemain belum seluruhnya menggunakan guard yang sama.
- `saveConfigChanges` sudah dapat menyimpan konfigurasi saat turnamen berjalan, mempertahankan skor/match yang ada, dan mengosongkan slot pada ronde aktif untuk pemain yang dinonaktifkan. Namun, penambahan/pengurangan lapangan dan perubahan pemain tidak mengatur ulang semua match aktif secara konsisten.
- `maxPoints` dipakai untuk pilihan skor serta menghitung skor lawan saat skor dimasukkan. Nilai ini juga dapat diubah pada konfigurasi yang disimpan, sehingga perubahan aturan perlu ditangani tanpa menulis ulang hasil lama.
- `App` memiliki konfirmasi sebelum reload/keluar dan sebelum tombol Back meninggalkan halaman. Ini adalah perlindungan navigasi, bukan pengunci konfigurasi.

## Rencana Implementasi

1. **Buka konfigurasi ketika turnamen aktif**
   - Hapus kondisi `isDisabled` dan semua atribut/handler yang menonaktifkan input karena turnamen sudah dimulai atau memiliki skor.
   - Pastikan seluruh kontrol terkait pemain, tier, status aktif, tim, lapangan, nama turnamen, tipe permainan, sorting leaderboard, dan nilai skor/b bonus dapat diedit dari halaman konfigurasi.
   - Tetap gunakan validasi input yang sudah ada (minimal pemain aktif, nama unik, nilai poin valid) sebelum menyimpan.

2. **Jadikan penyimpanan konfigurasi aman untuk match berjalan**
   - Pertahankan match selesai dan pasangan pemainnya sebagai catatan historis; perubahan daftar pemain tidak boleh menghapus atau mengganti hasil tersebut.
   - Perubahan nama/tier pemain memakai ID pemain yang sama agar statistik dan relasi match tidak putus.
   - Pemain yang dihapus/nonaktif tidak dihapus dari state historis. Tandai nonaktif dan keluarkan dari draft ronde berikutnya. Untuk match aktif yang belum memiliki skor, slot pemain yang tidak lagi tersedia harus ditangani secara eksplisit, bukan dibiarkan sebagai slot kosong tanpa jalur pemulihan.
   - Pemain baru/aktif kembali menjadi eligible untuk penjadwalan berikutnya. Jangan mengubah susunan match yang sudah berskor.
   - Perubahan jumlah lapangan hanya memengaruhi penjadwalan selanjutnya: jangan menghapus match lama atau match aktif pada lapangan yang dikurangi; hentikan pembuatan match baru di lapangan yang sudah dihapus dan gunakan lapangan tambahan pada ronde berikutnya.
   - Jaga `currentRound`, status/court pemain, match aktif, dan riwayat tetap konsisten setelah penyimpanan.

3. **Perubahan sistem permainan dan skor**
   - Perubahan tipe permainan/leaderboard sort, tier, bonus, dan rest bonus disimpan sebagai konfigurasi aktif untuk perhitungan/penjadwalan berikutnya.
   - Hasil pertandingan yang sudah tercatat tetap berupa nilai skor historis dan tidak dihitung ulang hanya karena `maxPoints` berubah.
   - `maxPoints` yang baru digunakan untuk input skor selanjutnya. Pastikan tampilan score modal memakai batas baru dan hasil lama tetap dapat ditampilkan/dihitung dengan nilai yang tersimpan.
   - Tinjau apakah perubahan `maxPoints` harus dibatasi untuk match belum berskor saja; apabila semua match memakai format skor jumlah tetap, perubahan harus tetap tidak mengoreksi nilai skor lama secara otomatis.

4. **Simpan dan pulihkan**
   - Pastikan semua perubahan tersimpan melalui mekanisme history/local storage yang sama dan bertahan setelah reload.
   - Jangan menghilangkan prompt reload/Back pada `App` sebagai bagian dari pembukaan konfigurasi; prompt tersebut bukan pengunci konfigurasi dan melindungi perubahan lokal yang belum tersimpan.

## Area Kode

- `src/components/SetupView.jsx`: kondisi penguncian, input konfigurasi, validasi, dan alur simpan.
- `src/store/useTournamentStore.js`: `saveConfigChanges`, sinkronisasi pemain/match/lapangan, draft ronde berikutnya, dan penyimpanan history.
- `src/components/ScoreModal.jsx`: batas skor yang digunakan saat input.
- `src/components/ManagerView.jsx` dan `src/components/Leaderboard.jsx`: tampilan nama lapangan dan penerapan konfigurasi aktif jika dibutuhkan.
- `src/App.jsx`: perilaku prompt navigasi; tidak perlu diubah untuk membuka pengaturan.

## Validasi yang Diperlukan

- Bisa menyimpan perubahan konfigurasi sebelum ada skor dan setelah beberapa skor sudah dicatat.
- Mengubah pemain/tier/status aktif mempertahankan ID dan hasil lama, serta memasukkan pemain eligible ke draft ronde berikutnya.
- Match belum berskor yang kehilangan pemain tetap dapat diselesaikan/dijadwalkan ulang tanpa slot kosong permanen.
- Menambah/mengurangi lapangan tidak menghapus match lama dan tidak membuat match baru di lapangan nonaktif.
- Perubahan tipe permainan dan `maxPoints` berlaku pada perhitungan/input berikutnya tanpa mengubah skor historis.
- Hasil konfigurasi dan skor tetap utuh setelah reload dan pemulihan dari history.
- Validasi input yang sudah ada tetap menolak konfigurasi yang tidak valid.

## Batas Perubahan

Implementasi ini hanya menghapus penguncian konfigurasi dan memperbaiki konsistensi state/penjadwalan yang diperlukan oleh edit saat turnamen aktif. Prompt sebelum meninggalkan halaman tetap dipertahankan; ini terpisah dari permintaan untuk mengedit konfigurasi.

## Status Implementasi

- Penguncian konfigurasi setelah pertandingan berskor dihapus. Semua kontrol pengaturan pemain, tim, lapangan, dan aturan skor dapat diedit.
- Penyimpanan konfigurasi mempertahankan hasil selesai, mengosongkan slot match belum berskor untuk pemain yang dinonaktifkan, lalu menghitung ulang status/court pemain aktif.
- Ronde berikutnya memperhitungkan lapangan yang baru ditambahkan dan tidak memulai ronde baru selama masih ada match belum selesai pada lapangan yang dikurangi.
- Match pada lapangan yang dikurangi tetap ditampilkan. Skor tidak dapat dimasukkan ke match yang slot pemainnya belum lengkap; slot perlu diselesaikan melalui pengaturan match.
- Prompt reload/navigasi tetap dipertahankan.
- Di modal edit court, slot dapat dipilih ulang untuk membatalkan pilihan atau dipilih bersama slot lain untuk menukar pemain/partner langsung. Pemain yang aktif di court lain tetap tersedia sebagai pengganti; pemain yang digeser otomatis mengisi slot mereka di match asalnya.

## Plan: Penjadwalan Court yang Ditambahkan

1. Tambahkan scheduler yang mencoba mengisi court tanpa match pada ronde global tertinggi, tanpa mengubah match yang sudah ada.
2. Tentukan pemain tersedia dari partisipasi match yang belum selesai, bukan dari status pemain yang mungkin stale. Alokasikan maksimal satu match per court dan hindari pemain terpakai ganda.
3. Jalankan percobaan ulang setelah konfigurasi/pemain disimpan dan setelah skor diperbarui atau court lain membuat ronde lebih tinggi.
4. Buat match susulan pada ronde global tertinggi saja; jangan membuat match retroaktif untuk ronde yang terlewat.
5. Untuk court tanpa match pada ronde yang ditampilkan, bedakan status “Pemain tidak cukup” dari court yang masih memiliki match ronde sebelumnya yang belum selesai.
6. Verifikasi dengan lint, production build, dan pengecekan diff.

### Status Plan Penjadwalan Court

- Scheduler mencoba mengisi court yang belum memiliki match pada ronde global tertinggi, dengan menghitung pemain dari match yang belum selesai.
- Percobaan ulang berjalan setelah konfigurasi disimpan, skor berubah, dan court lain membuat ronde lebih tinggi.
- Match yang tertunda tidak dibuat retroaktif: jika ronde global sudah maju, court bergabung di ronde terbaru.
- Court baru hanya ditampilkan pada ronde global terbaru sampai match pertamanya dibuat; jika tidak ada empat pemain tersedia, UI menampilkan “Pemain tidak cukup”.
- Validasi mencakup skenario pemain yang awalnya tidak tersedia lalu court berhasil bergabung di ronde terbaru tanpa memakai pemain yang sedang bermain.
- Daftar pemain diurutkan ascending berdasarkan nama saat berpindah dari bulk input ke mode baris dan saat menyimpan konfigurasi/memulai turnamen; baris kosong tetap berada di bawah.
