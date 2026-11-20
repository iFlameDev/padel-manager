# 🎾 Padel Manager

Aplikasi web modern untuk manajemen turnamen padel secara real-time, fleksibel, dan otomatis. Dibangun menggunakan **React 19**, **Tailwind CSS v4**, **Zustand**, **Framer Motion**, dan terintegrasi dengan **Supabase** untuk sinkronisasi cloud.

---

## 📑 Daftar Isi
1. [Ringkasan Proyek & Arsitektur](#-ringkasan-proyek--arsitektur)
2. [Pemetaan Fitur Lengkap & Rinci](#-pemetaan-fitur-lengkap--rinci)
   - [1. Konfigurasi Turnamen](#1-konfigurasi-turnamen)
   - [2. Manajemen Pemain & Kategori (Tier)](#2-manajemen-pemain--kategori-tier)
   - [3. Manajemen Tim (Doubles / Fixed Pairs)](#3-manajemen-tim-doubles--fixed-pairs)
   - [4. Konfigurasi & Kustomisasi Lapangan](#4-konfigurasi--kustomisasi-lapangan)
   - [5. Format Game & Algoritma Matchmaking](#5-format-game--algoritma-matchmaking)
   - [6. Penjadwalan Babak & Staggered Generation](#6-penjadwalan-babak--staggered-generation)
   - [7. Pencatatan Skor Interaktif](#7-pencatatan-skor-interaktif)
   - [8. Fitur Swap Pemain / Tim di Lapangan](#8-fitur-swap-pemain--tim-di-lapangan)
   - [9. Leaderboard & Sistem Peringkat](#9-leaderboard--sistem-peringkat)
   - [10. Indikator Keseimbangan Turnamen (Balance Cycle)](#10-indikator-keseimbangan-turnamen-balance-cycle)
   - [11. Hak Akses (Host vs Read-Only) & Share OTP](#11-hak-akses-host-vs-read-only--share-otp)
   - [12. Penyimpanan Cloud & Riwayat Lokal](#12-penyimpanan-cloud--riwayat-lokal)
3. [Arsitektur Data & Struktur State](#-arsitektur-data--struktur-state)
4. [Laporan Audit Kode: Temuan Bug & Keanehan Logika](#-laporan-audit-kode-temuan-bug--keanehan-logika)
   - [🔴 Bug Kritis (Penyebab Crash)](#-bug-kritis-penyebab-crash)
   - [🟠 Bug Logika Bisnis & Arsitektur Cloud](#-bug-logika-bisnis--arsitektur-cloud)
   - [🟡 Keanehan (Anomalies) & Edge Cases UI/UX](#-keanehan-anomalies--edge-cases-uiux)
   - [⚪ Isu Kualitas Kode & ESLint](#-isu-kualitas-kode--eslint)
5. [Rekomendasi Perbaikan (Actionable Roadmap)](#-rekomendasi-perbaikan-actionable-roadmap)
6. [Panduan Instalasi & Menjalankan](#-panduan-instalasi--menjalankan)

---

## 🏗 Ringkasan Proyek & Arsitektur

Padel Manager dirancang untuk memenuhi kebutuhan pengelola turnamen padel (komunitas maupun komersial) yang menginginkan penjadwalan dinamis. Padel umumnya dimainkan secara ganda (2 vs 2, total 4 pemain per lapangan). Aplikasi ini mendukung pertandingan individu (rotasi pasangan) maupun tim tetap (fixed doubles), dengan kalkulasi peringkat otomatis dan sinkronisasi antar-perangkat.

### Tech Stack:
- **Framework**: React 19 (Vite 8)
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`)
- **State Management**: Zustand 5
- **Icons**: Lucide React
- **Animations**: Framer Motion 12
- **Backend / Database**: Supabase (PostgreSQL via REST client)

---

## 🗺 Pemetaan Fitur Lengkap & Rinci

### 1. Konfigurasi Turnamen
- **Nama Turnamen**: Penamaan turnamen yang fleksibel (misal: "Padel DNA Weekly").
- **Tipe Game**:
  - `marked_mexicano`: Mexicano dengan pembobotan handicap tier pemain (A, B, C, D).
  - `marked_americano`: Americano dengan penandaan tier.
  - `mexicano`: Mexicano murni berdasarkan akumulasi poin klasemen sementara.
  - `americano`: Americano murni.
- **Poin per Babak (`maxPoints`)**: Total batas poin yang diperebutkan per match (default 21 poin). Skor kedua tim selalu berjumlah `maxPoints`.
- **Win Bonus**: Tambahan poin bonus bagi pemain/tim yang memenangkan pertandingan.
- **Rest Bonus**: Tambahan poin kompensasi bagi pemain yang harus istirahat (bye) pada suatu babak agar perolehan poin tetap adil.
- **Sorting Leaderboard**: Pilihan prioritas sorting klasemen:
  - Berdasarkan **Points** (Total poin tertinggi).
  - Berdasarkan **Wins** (Jumlah kemenangan terbanyak).
- **Penguncian Konfigurasi (`isDisabled`)**: Konfigurasi otomatis terkunci saat turnamen sudah dimulai dan ada skor yang telah masuk, mencegah inkonsistensi data.

### 2. Manajemen Pemain & Kategori (Tier)
- **Input Cepat**: Menambah baris pemain baru secara instan cukup dengan menekan tombol `Enter` pada kolom nama.
- **Tiering Skill (Kategori Kemampuan)**:
  - Tersedia 4 tingkatan: `A` (Advance/Pro), `B` (Intermediate), `C` (Novice), `D` (Beginner).
  - Dropdown tier hanya muncul jika format game berstatus `marked`.
- **Toggle Status Aktif / Walkout (OFF)**:
  - Setiap pemain dapat dinonaktifkan (toggle switch).
  - Pemain yang walkout/cedera diberi status `isWalkout` / `OFF`, dikeluarkan dari undian lapangan babak berikutnya, dan di coret pada leaderboard tanpa menghapus histori skor sebelumnya.
- **Validasi Duplikasi Nama**:
  - Peringatan real-time dengan outline merah jika ada nama kembar.
  - Validasi penolakan start turnamen jika masih terdapat duplikasi nama.
- **Testing Data Generator**: Tersedia tombol rahasia `Random Test` (pada rute dengan parameter `testing`) untuk men-generate 5-20 pemain acak dengan tier dan lapangan otomatis.

### 3. Manajemen Tim (Doubles / Fixed Pairs)
- **Kelola Pasangan Tetap**: Modal khusus untuk memasangkan dua pemain menjadi satu tim tetap (`localTeams`).
- **Auto-Assign Teams**: Fitur otomatis memasangkan semua pemain solo yang belum memiliki pasangan menjadi tim secara acak/berurutan.
- **Edit & Hapus Tim**: Mengubah komposisi tim atau membubarkan tim kembali menjadi pemain solo.
- **Sync Status Aktif**: Jika salah satu anggota tim dinonaktifkan (inaktif/walkout), pasangannya secara otomatis ikut dinonaktifkan.
- **Badge Tim pada Input**: Kolom input pemain menampilkan badge nama tim jika pemain tersebut sudah terikat dalam sebuah tim.

### 4. Konfigurasi & Kustomisasi Lapangan
- **Jumlah Lapangan Dinamis**: Pengaturan jumlah lapangan (1 hingga n lapangan) dengan tombol kontrol counter `+` / `-`.
- **Custom Court Names**: Kemampuan memberi nama spesifik untuk tiap lapangan (misal: "Court 1", "Center Court", "Lapangan A", "VIP Court").

### 5. Format Game & Algoritma Matchmaking
- **Penentuan Pemain per Lapangan (`draftCourts`)**:
  - Menggunakan algoritma **Depth-First Search (DFS)** untuk menyusun 4 slot pemain per lapangan (`sum === 4`), baik dari kombinasi 2 tim (2+2), 1 tim + 2 solo (2+1+1), maupun 4 solo (1+1+1+1).
- **Prioritas Undian**:
  - **Pemain paling sedikit bertanding** diprioritaskan main lebih dulu untuk menjamin rotasi yang merata.
  - Pemain dengan poin/kemenangan serupa dipasangkan di lapangan yang sama.
- **Pairing Handicap (Marked Format)**:
  - Pada format bertier, 4 pemain solo diurutkan dari tier tertinggi ke terendah, lalu dipasangkan:
    - Tim 1: Pemain ke-1 (Tier tertinggi) & Pemain ke-3.
    - Tim 2: Pemain ke-2 & Pemain ke-4 (Tier terendah).

### 6. Penjadwalan Babak & Staggered Generation
- **Round Pager Tabs**: Navigasi tab babak (`Round 1`, `Round 2`, dst.) dengan indikator centang hijau jika seluruh pertandingan di babak tersebut selesai.
- **Generasi Babak Serentak (`generateNextRound`)**: Jika seluruh lapangan selesai bersamaan, sistem men-generate babak baru untuk semua lapangan sekaligus.
- **Generasi Babak Mandiri / Staggered (`generateMatchForCourt`)**:
  - Lapangan yang selesai lebih cepat dapat langsung mengundi match berikutnya tanpa menunggu lapangan lain selesai, mengambil pemain dari pool yang sedang istirahat (`status: 'rest'`).
- **Placeholder Lapangan Kosong**: Lapangan yang belum selesai atau menunggu giliran menampilkan status *"Menunggu putaran sebelumnya selesai"*.

### 7. Pencatatan Skor Interaktif
- **Score Modal Pop-up**:
  - Dialog modal visual dengan grid tombol angka (0 hingga `maxPoints`).
  - Mengklik skor salah satu tim otomatis mengkalkulasi sisa skor tim lawan (`score2 = maxPoints - score1`).
- **Reset Skor**: Opsi untuk mengosongkan kembali skor yang salah diinput.
- **Visualisasi Hasil Pertandingan**:
  - Skor pemenang disorot dengan warna biru terang (`bg-blue-500`).
  - Sisi lapangan tim pemenang diberi latar visual khusus kemenangan (`bg-blue-900/20`).
- **Kunci Skor Otomatis**: Pertandingan pada babak lampau otomatis terkunci dari pengeditan jika lapangan tersebut telah menjalankan babak berikutnya.

### 8. Fitur Swap Pemain / Tim di Lapangan
- **Edit Susunan Lapangan (`SwapModal`)**:
  - Host dapat mengklik nama lapangan untuk menukar pemain yang telah ditugaskan.
  - Memilih slot pemain di lapangan, lalu memilih pemain pengganti dari pool pemain cadangan.
- **Dukungan Swap Solo & Tim**: Dapat menukar pemain solo dengan pemain solo, atau mengganti tim dengan tim lain.
- **Indikator Asal Lapangan**: Jika pemain pengganti sedang berada di lapangan lain, muncul badge penanda lapangan asalnya.
- **Pembersihan Slot Otomatis**: Jika pemain yang di-swap sedang berada di pertandingan aktif yang belum selesai, slot lamanya otomatis dikosongkan (`null`).

### 9. Leaderboard & Sistem Peringkat
- **Tampilan Real-time**: Klasemen langsung terupdate setiap kali skor dimasukkan.
- **Kolom Statistik Lengkap**:
  - `#`: Posisi peringkat dengan ikon medali khusus untuk Juara 1 (Emas), 2 (Perak), dan 3 (Perunggu).
  - `Player / Team`: Nama pemain atau nama tim lengkap dengan anggota ganda dan badge tier.
  - `G (Games Played)`: Jumlah pertandingan yang telah dimainkan.
  - `W-L-T`: Rekor Menang (*Win*) - Kalah (*Loss*) - Seri (*Tie*).
  - `Diff`: Selisih perolehan poin (*Goal Difference*), berwarna hijau jika positif dan merah jika negatif.
  - `+M (Bonus Points)`: Akumulasi poin bonus dari kemenangan dan kompensasi istirahat.
  - `P (Total Points)`: Total poin akhir (Poin murni + Bonus).
- **Streak Api (`🔥`)**: Ikon api menyala beranimasi jika pemain/tim meraih kemenangan beruntun 3 kali atau lebih (`streak >= 3`).
- **Indikator Lapangan Berjalan**: Badge warna-warni pada nama pemain yang menunjukkan lapangan mana yang sedang ia tempati saat ini.
- **Pemisahan Pemain Nonaktif**: Pemain yang walkout otomatis ditaruh di bagian paling bawah dengan teks tercoret dan tanda `OFF`.

### 10. Indikator Keseimbangan Turnamen (Balance Cycle)
- Menghitung siklus putaran matematis menggunakan **Greatest Common Divisor (GCD)** antara jumlah pemain aktif dan total slot lapangan:
  $$\text{Cycle} = \frac{\text{Active Players}}{\gcd(\text{Active Players}, \text{Courts} \times 4)}$$
- Menampilkan sisa babak menuju titik seimbang sempurna (*"0 - WELL BALANCE"*), di mana seluruh pemain telah bermain dengan frekuensi yang tepat sama.

### 11. Hak Akses (Host vs Read-Only) & Share OTP
- **Share to Player**: Menghasilkan tautan publik dengan parameter `?id=<tournament_id>`. Pengguna yang membuka tautan ini berstatus **Read-Only** (tidak dapat mengedit skor, mengundi babak, atau mengganti konfigurasi).
- **Share to Host (One-Time Password / OTP)**:
  - Host dapat membuat tautan transfer/delegasi admin dengan token OTP 6-digit.
  - Pengguna lain yang membuka tautan dengan parameter `&otp=<token>` otomatis dipromosikan menjadi Host dan token OTP langsung dihapus dari database (sekali pakai).
- **Proteksi Tombol Aksi**: Seluruh tombol modifikasi (Score, Swap, Config, Generate Round) disembunyikan atau dinonaktifkan untuk pengguna non-host.

### 12. Penyimpanan Cloud & Riwayat Lokal
- **Supabase Cloud State**: State turnamen disimpan dalam format JSON terstruktur pada tabel `tournaments`.
- **Debounced Auto-Sync**: Setiap aksi (input skor, babak baru, swap) disinkronkan ke Supabase dengan jeda debounce 500ms untuk efisiensi jaringan.
- **Local History**: Daftar turnamen yang pernah dibuat tersimpan di `localStorage` (`padel_history`) dan dapat dibuka kembali lewat modal History.

---

## 🏛 Arsitektur Data & Struktur State

State global dikelola via Zustand (`useTournamentStore`) dengan struktur utama sebagai berikut:

```typescript
interface TournamentState {
  // Navigation & Access
  currentView: 'setup' | 'manager' | 'config';
  viewMode: 'pager' | 'list';
  activeRoundTab: number;
  tournamentId: string | null;
  isHost: boolean;
  createdAt: string | null;
  lastModified: string | null;

  // Configurations
  config: {
    name: string;
    type: 'marked_mexicano' | 'marked_americano' | 'mexicano' | 'americano';
    date: string;
    time: string;
    duration: number;
    maxPoints: number;
    sort: 'points' | 'wins';
    bonus: number;
    restBonus: number;
  };
  numCourts: number;
  customCourtNames: Record<number, string>; // e.g. { 1: "Center Court", 2: "Court B" }

  // Entities
  players: Array<{
    id: number;
    name: string;
    tier: 'A' | 'B' | 'C' | 'D' | '-';
    status: 'rest' | 'playing';
    court: number | null;
    isWalkout: boolean;
  }>;

  teams: Array<{
    id: string;
    name: string;
    playerIds: [number, number];
  }>;

  // Match Schedule: Key format "r{round}-c{court}"
  matches: Record<string, {
    round: number;
    court: number;
    t1: Array<number | null>; // Player IDs
    t2: Array<number | null>;
    score1: number | null;
    score2: number | null;
    timestamp: number;
  }>;

  currentRound: number;
  playerIdCounter: number;
  isTournamentStarted: boolean;
}
```

---

## 🔍 Laporan Audit Kode: Temuan Bug & Keanehan Logika

Setelah pemeriksaan menyeluruh pada seluruh baris kode, ditemukan sejumlah **bug fatal**, **kesalahan logika matematika/matchmaking**, dan **masalah arsitektur cloud** yang perlu diperbaiki:

### 🔴 Bug Kritis (Penyebab Crash)

#### 1. Crash Runtime pada Fitur Swap Pemain (`SwapModal.jsx`)
- **Lokasi**: [SwapModal.jsx](file:///c:/Users/theod/Documents/Project%20Mini%20Tools/padel-manager/src/components/SwapModal.jsx#L35-L42)
- **Detail**:
  ```javascript
  let m = null;
  let matchKeyFinal = null;
  for (let roundKey in matchesByRound) {
    if (matchesByRound[roundKey][matchKey]) {
      m = matchesByRound[roundKey][matchKey];
      matchKeyFinal = matchKey;
      break;
    }
  }
  ```
- **Masalah**: Variabel `matchesByRound` **tidak pernah didefinisikan** di dalam komponen maupun diimpor. Begitu user mengklik nama lapangan untuk melakukan penukaran pemain, aplikasi langsung melempar:
  `Uncaught ReferenceError: matchesByRound is not defined` dan layar menjadi blank putih (crash total).
- **Perbaikan**: Gunakan langsung `const m = matches[matchKey];` karena `matches` di Zustand sudah merupakan dictionary flat.

---

#### 2. Crash Total jika Supabase Error / Offline saat Turnamen Dimulai
- **Lokasi**: [useTournamentStore.js](file:///c:/Users/theod/Documents/Project%20Mini%20Tools/padel-manager/src/store/useTournamentStore.js#L289-L297)
- **Detail**:
  ```javascript
  const { data, error } = await supabase
    .from('tournaments')
    .insert([{ state: payload }])
    .select('id');

  window.localStorage.setItem('padel_host_' + data[0].id, 'true');
  ```
- **Masalah**: Jika koneksi gagal, RLS memblokir, atau Supabase offline, `data` bernilai `null` / `undefined`. Kode langsung mengeksekusi `data[0].id` tanpa pengecekan `if (!data || data.length === 0)`. Hal ini memicu `TypeError: Cannot read properties of null (reading '0')`.
- **Dampak Lanjutan**: Exception tertangkap di `catch`, namun state `currentView` sudah terlanjur pindah ke `manager` dengan `tournamentId: null`. Akibatnya, `syncToSupabase` berhenti sinkron, dan saat halaman di-refresh, semua data turnamen lenyap seketika.

---

### 🟠 Bug Logika Bisnis & Arsitektur Cloud

#### 3. Simpan Konfigurasi (`config` view) Membuat Turnamen Baru (Duplikasi Supabase ID)
- **Lokasi**: [SetupView.jsx](file:///c:/Users/theod/Documents/Project%20Mini%20Tools/padel-manager/src/components/SetupView.jsx#L201) & [useTournamentStore.js](file:///c:/Users/theod/Documents/Project%20Mini%20Tools/padel-manager/src/store/useTournamentStore.js#L289)
- **Detail**: Saat Host mengklik icon "Settings" untuk menambah pemain atau mengganti nama turnamen di tengah turnamen yang sedang berjalan, tombol "Save Changes" memanggil `startTournament()`.
- **Masalah**: `startTournament()` selalu mengeksekusi `.insert([{ state: payload }])`. Bukannya melakukan `UPDATE` pada record yang ada, sistem justru **membuat ID turnamen baru di Supabase** dan mengganti URL browser (`?id=new_id`).
- **Dampak**: Semua peserta yang memegang link lama (`?id=old_id`) tidak akan pernah melihat update terbaru dari Host karena Host sekarang menulis ke ID yang berbeda.

---

#### 4. Ketiadaan Realtime Subscription untuk Peserta (Read-Only)
- **Lokasi**: [App.jsx](file:///c:/Users/theod/Documents/Project%20Mini%20Tools/padel-manager/src/App.jsx#L52)
- **Detail**: Fungsi `loadFromSupabase(id, isHost)` hanya dipanggil **satu kali** saat `useEffect` pertama di `App.jsx`.
- **Masalah**: Tidak ada listener Supabase Realtime (`supabase.channel().on(...)`) maupun mekanisme polling.
- **Dampak**: Peserta turnamen yang membuka link di ponsel mereka melihat halaman yang statis selamanya. Mereka harus melakukan hard refresh secara manual untuk melihat update skor atau babak baru.

---

#### 5. Ranking Tim yang Cacat Matematis pada `draftCourts`
- **Lokasi**: [useTournamentStore.js](file:///c:/Users/theod/Documents/Project%20Mini%20Tools/padel-manager/src/store/useTournamentStore.js#L341) & [useTournamentStore.js](file:///c:/Users/theod/Documents/Project%20Mini%20Tools/padel-manager/src/store/useTournamentStore.js#L353)
- **Detail**:
  ```javascript
  // Untuk Tim:
  rank: sortedForDraft.indexOf(p1) + sortedForDraft.indexOf(p2)
  // Untuk Solo:
  rank: sortedForDraft.indexOf(p)
  ```
- **Masalah**: Nilai ranking tim dihitung dari **penjumlahan** indeks kedua pemainnya, sedangkan pemain solo menggunakan indeks tunggal.
  - Contoh: Pemain Solo ranking 8 memiliki `rank = 8`.
  - Tim yang berisi pemain ranking 4 dan 5 memiliki `rank = 4 + 5 = 9`.
  - Saat diurutkan `a.rank - b.rank`, solo ranking 8 justru ditempatkan lebih atas (dianggap lebih prioritas/hebat) daripada tim dengan rata-rata ranking 4.5.
- **Perbaikan**: Ranking tim harus menggunakan nilai rata-rata: `(indexOf(p1) + indexOf(p2)) / 2`.

---

#### 6. Kalkulasi Istirahat (`rests`) Leaderboard Rusak Saat Babak Berjalan
- **Lokasi**: [useTournamentStore.js](file:///c:/Users/theod/Documents/Project%20Mini%20Tools/padel-manager/src/store/useTournamentStore.js#L677)
- **Detail**:
  ```javascript
  stats[p.id].rests = Math.max(0, state.currentRound - stats[p.id].games);
  ```
- **Masalah**: Nilai `games` hanya bertambah jika match **sudah diberi skor**. Pada saat babak 1 baru dibuat dan match sedang dimainkan (skor masih kosong), `games` bernilai `0` untuk semua pemain. Akibatnya, `rests` langsung bernilai `1 - 0 = 1` bagi seluruh pemain.
- **Dampak**: Jika `restBonus` bernilai 5 poin, semua pemain tiba-tiba mendapatkan 5 poin bonus sebelum bermain, dan poin tersebut hilang kembali setelah skor babak diinput. Kalkulasi `rests` seharusnya hanya menghitung babak yang sudah selesai di mana pemain tersebut benar-benar tidak terdaftar di pertandingan manapun.

---

#### 7. Mode Americano Tidak Memiliki Algoritma Rotasi Partner
- **Lokasi**: [useTournamentStore.js](file:///c:/Users/theod/Documents/Project%20Mini%20Tools/padel-manager/src/store/useTournamentStore.js#L376) & [ManagerView.jsx](file:///c:/Users/theod/Documents/Project%20Mini%20Tools/padel-manager/src/components/ManagerView.jsx#L162)
- **Detail**: Pada `draftCourts`, hanya ada pengecekan `if (state.config.type.includes('marked'))` (mengurutkan tier) dan `else` (mengurutkan poin). Tidak ada logika pairing rotasi khas Americano.
- **Masalah**: Mode `americano` berjalan 100% identik dengan `mexicano`. Selain itu, pada [ManagerView.jsx line 162](file:///c:/Users/theod/Documents/Project%20Mini%20Tools/padel-manager/src/components/ManagerView.jsx#L162), lapangan hanya dikunci jika `config.type.includes('mexicano')`, sehingga pada mode Americano lapangan tidak pernah terkunci meskipun babak berikutnya sudah berjalan.

---

#### 8. Tidak Ada Validasi Minimum Pemain saat Memulai Turnamen
- **Lokasi**: [SetupView.jsx](file:///c:/Users/theod/Documents/Project%20Mini%20Tools/padel-manager/src/components/SetupView.jsx#L185)
- **Detail**: User bisa menekan tombol "Start Tournament" dengan 1, 2, atau 3 pemain saja.
- **Masalah**: Algoritma DFS `draftCourtEntities` mencari kombinasi 4 pemain. Jika pemain kurang dari 4, DFS mengembalikan `null`, menghasilkan 0 pertandingan. Turnamen dimulai dengan babak 1 kosong tanpa pertandingan, dan tidak ada cara untuk menambah pemain tanpa masuk ke config.

---

### 🟡 Keanehan (Anomalies) & Edge Cases UI/UX

#### 9. Potensi Nilai `NaN` pada Skor jika `maxPoints` Kosong
- **Lokasi**: [SetupView.jsx](file:///c:/Users/theod/Documents/Project%20Mini%20Tools/padel-manager/src/components/SetupView.jsx#L103) & [ScoreModal.jsx](file:///c:/Users/theod/Documents/Project%20Mini%20Tools/padel-manager/src/components/ScoreModal.jsx#L22)
- **Detail**: Jika user menghapus angka di kolom "Poin / Round" untuk menggantinya, `parseInt("", 10)` menghasilkan `NaN`. Nilai `NaN` ini masuk ke config, menyebabkan loop pembuatan tombol skor di `ScoreModal` tidak memunculkan tombol apapun, dan kalkulasi `score2 = maxPoints - scoreVal` menghasilkan skor `NaN`.

#### 10. Deklarasi Komponen di Dalam Render (`react-hooks/static-components`)
- **Lokasi**: [SwapModal.jsx](file:///c:/Users/theod/Documents/Project%20Mini%20Tools/padel-manager/src/components/SwapModal.jsx#L137)
- **Detail**: Komponen `SlotButton` dideklarasikan di dalam body fungsi `SwapModal`. Setiap kali state modal berubah, React membuat ulang tipe komponen tersebut, menyebabkan unmount/remount yang merusak animasi dan performa render.

#### 11. Efek Slot Kosong (`null`) pada Lapangan Lain saat Swap
- **Lokasi**: [useTournamentStore.js](file:///c:/Users/theod/Documents/Project%20Mini%20Tools/padel-manager/src/store/useTournamentStore.js#L556-L572)
- **Detail**: Ketika pemain dari Court B diambil untuk menggantikan pemain di Court A, slot di Court B otomatis diubah menjadi `null`. Validasi tombol tutup modal hanya memeriksa apakah Court A memiliki slot `null`. User bisa menutup modal tanpa menyadari Court B kini kehilangan 1 pemain dan berada dalam kondisi tidak valid.

#### 12. Input Nama Pemain Terkunci saat Tergabung dalam Tim
- **Lokasi**: [SetupView.jsx](file:///c:/Users/theod/Documents/Project%20Mini%20Tools/padel-manager/src/components/SetupView.jsx#L331)
- **Detail**: Input nama pemain di-disable secara mutlak jika `teamObj` ada. Jika ada saltik (typo) nama pemain, user terpaksa harus menghapus tim terlebih dahulu, mengoreksi nama, lalu membuat tim kembali.

#### 13. Inkonsistensi Kunci LocalStorage untuk Autentikasi Host
- **Lokasi**: [useTournamentStore.js](file:///c:/Users/theod/Documents/Project%20Mini%20Tools/padel-manager/src/store/useTournamentStore.js#L294) vs [App.jsx](file:///c:/Users/theod/Documents/Project%20Mini%20Tools/padel-manager/src/App.jsx#L23)
- **Detail**: Saat turnamen dibuat, sistem menyimpan `padel_host_<id>` dan juga memasukkan ID ke array `host_tournaments`. Namun saat routing dibuka, aplikasi hanya memeriksa `host_tournaments`. Kunci `padel_host_<id>` menjadi data sampah (*dead storage*).

#### 14. Peringatan Debounce Sync saat Browser Ditutup
- **Lokasi**: [useTournamentStore.js](file:///c:/Users/theod/Documents/Project%20Mini%20Tools/padel-manager/src/store/useTournamentStore.js#L93-L121)
- **Detail**: Sinkronisasi ke Supabase menggunakan `setTimeout` 500ms. Jika Host memasukkan skor lalu langsung menutup tab browser dalam waktu kurang dari 500ms, data terakhir belum sempat terkirim ke Supabase dan tidak ada event `beforeunload` yang menjaga antrean request.

---

### ⚪ Isu Kualitas Kode & ESLint
Terdapat 42 peringatan/error linting aktif di repositori saat ini:
1. **Unused Imports & Variables**:
   - `React` diimpor di seluruh komponen meskipun menggunakan JSX runtime baru.
   - Variabel yang tidak pernah digunakan: `matchesByRound`, `matchKeyFinal`, `FileText`, `HelpCircle`, `updateConfig`, `setNumCourts`, `setCustomCourtNames`, `stats`, `players`, `isMarked`, `isLatestRoundTab`, `process` pada `create_table.js`.
2. **React 19 Rule Violations**:
   - Panggilan `setState` sinkron langsung di dalam `useEffect` di `SetupView.jsx` dan `SwapModal.jsx` yang memicu cascading re-render warning.

---

## 🛠 Rekomendasi Perbaikan (Actionable Roadmap)

Berikut adalah prioritas langkah perbaikan yang direkomendasikan:

| Prioritas | Komponen / Berkas | Tindakan Perbaikan |
|---|---|---|
| **P0 (Kritis)** | `src/components/SwapModal.jsx` | Ganti loop `matchesByRound` dengan `const m = matches[matchKey];`. Pindahkan deklarasi `SlotButton` ke luar komponen utama. |
| **P0 (Kritis)** | `src/store/useTournamentStore.js` | Beri penanganan fallback saat Supabase insert gagal agar state lokal tetap aman dan tidak melempar `TypeError: data[0]`. |
| **P1 (Tinggi)** | `src/store/useTournamentStore.js` | Bedakan fungsi `createTournament` (INSERT) dan `updateTournamentConfig` (UPDATE berdasarkan `tournamentId`). Jangan selalu buat ID baru. |
| **P1 (Tinggi)** | `src/App.jsx` | Tambahkan listener `supabase.channel('tournament-sync').on('postgres_changes', ...)` agar penonton/peserta mendapatkan live update tanpa refresh. |
| **P1 (Tinggi)** | `src/store/useTournamentStore.js` | Perbaiki formula rank tim di `draftCourts` menjadi rata-rata indeks `(indexOf(p1) + indexOf(p2)) / 2`. |
| **P1 (Tinggi)** | `src/store/useTournamentStore.js` | Perbaiki kalkulasi `rests` agar hanya menghitung babak yang sudah selesai pertandingannya. |
| **P1 (Tinggi)** | `src/components/SetupView.jsx` | Beri validasi tombol "Start Tournament" minimal membutuhkan `numCourts * 4` pemain aktif. |
| **P2 (Sedang)** | `src/components/ScoreModal.jsx` | Beri nilai default `maxPoints || 21` untuk mencegah kegagalan render tombol skor saat input kosong. |
| **P2 (Sedang)** | Seluruh Proyek | Bersihkan import dan variabel tak terpakai agar lulus `npm run lint`. |

---

## 🚀 Panduan Instalasi & Menjalankan

### Prasyarat:
- Node.js versi 18+ atau 20+
- Akun Supabase (Tabel `tournaments` dengan kolom `id` (uuid/text), `state` (jsonb), dan `otp` (text))

### Langkah Menjalankan:
1. **Clone & Masuk ke Direktori**:
   ```bash
   cd padel-manager
   ```

2. **Instal Dependensi**:
   ```bash
   npm install
   ```

3. **Konfigurasi Environment**:
   Pastikan file `.env` sudah terisi dengan kredensial Supabase Anda:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

4. **Jalankan Development Server**:
   ```bash
   npm run dev
   ```

5. **Build untuk Produksi**:
   ```bash
   npm run build
   ```

---

*Dokumentasi ini disusun secara komprehensif berdasarkan analisis statis dan dinamis pada seluruh basis kode Padel Manager.*
