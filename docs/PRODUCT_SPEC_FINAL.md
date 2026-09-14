**Kairos adalah aplikasi eksekusi spot di Monad yang memecah order besar menjadi beberapa transaksi, menyesuaikan ukuran setiap transaksi dengan likuiditas pasar, dan menegakkan batas pengguna melalui smart contract.**

User menetapkan apa yang ingin dibeli, anggaran, durasi, dan batas harga. Kairos mengurus evaluasi serta eksekusinya. Dana yang belum digunakan tetap berada di wallet user.

Berikut spesifikasi lengkap yang merangkum keputusan kita. Bagian yang masih bergantung pada perilaku integrasi sponsor aku tandai sebagai **perlu dibuktikan**, bukan dianggap sudah selesai.

---

## 1. Identitas dan positioning

**Nama:** Kairos  
**Deskripsi:** Market-aware spot execution on Monad  
**Tagline:** **Execute within your limits.**

Kalimat produk:

> Kairos automatically sizes and executes spot orders according to available liquidity and your trading limits.

Versi Indonesia:

> Kairos membagi dan mengeksekusi order spot sesuai likuiditas pasar dan batas yang kamu tentukan.

Janji produknya:

- User tidak perlu memonitor order book terus-menerus.
- Ukuran transaksi menyesuaikan kondisi likuiditas.
- Eksekusi hanya boleh terjadi dalam batas order.
- Hasil setiap transaksi dapat diperiksa.
- Anggaran yang belum dieksekusi tetap di wallet.

Kairos tidak menjanjikan harga terbaik atau order selalu selesai sebelum deadline. Keunggulannya adalah **kontrol eksekusi yang konsisten dan transparan**.

## 2. Masalah yang diselesaikan

Order besar relatif terhadap kedalaman pasar bisa menyapu beberapa tingkat harga. Membaginya secara manual mengharuskan trader terus memeriksa likuiditas dan mengirim transaksi.

Eksekusi berdasarkan jadwal tetap mengurangi pekerjaan manual, tetapi ukuran transaksinya belum tentu sesuai dengan likuiditas saat itu.

Kairos menggabungkan:

1. **Pacing:** berapa anggaran yang sudah boleh dibelanjakan berdasarkan waktu.
2. **Liquidity-aware sizing:** berapa yang diperkirakan dapat dieksekusi dalam batas harga.
3. **Onchain enforcement:** apakah transaksi aktual memenuhi policy pengguna.

Ukuran “besar” ditentukan relatif terhadap pasar. Order $500 bisa signifikan di pasar tipis; order $10.000 bisa kecil di pasar yang dalam.

## 3. Target pengguna

Target awal:

> Trader spot Monad yang ingin mengeksekusi order secara bertahap tanpa memonitor order book terus-menerus.

Kebutuhan mereka:

- Menghindari menghabiskan seluruh anggaran dalam satu transaksi.
- Menentukan harga beli maksimum.
- Mengatur periode eksekusi.
- Menghentikan order kapan saja.
- Mengetahui apa yang terjadi pada setiap bagian order.

Untuk hackathon, pengguna testnet berfungsi sebagai penguji pengalaman dan perilaku sistem. Aktivitas tersebut tidak dipresentasikan sebagai volume ekonomi nyata.

## 4. Scope produk

| Bagian | Scope Kairos |
|---|---|
| Market awal | Satu pasar MON/USDC di Kuru |
| Arah eksekusi pertama | USDC → MON |
| Strategi | Jadwal kumulatif linear dengan ukuran fill adaptif |
| Dana | Tetap di wallet sampai transaksi eksekusi |
| Policy | Disimpan dan ditegakkan onchain |
| Venue | Kuru order book |
| Otomatisasi | CRE |
| Wallet | Privy |
| Pendanaan lintas chain | Aurora Intents |
| Pelaporan | Keputusan, fills, biaya, progres, dan receipt |
| Pembuktian | Integrasi nyata serta pengujian kondisi normal dan gagal |

**Satu pair dan satu arah transaksi memberi ruang untuk implementasi yang mendalam.** Dukungan sell atau pasar tambahan bisa memakai arsitektur yang sama setelah jalur pertama terbukti.

Tidak perlu menambahkan perpetuals, social trading, token discovery, atau AI pengambil keputusan untuk memenuhi identitas produk ini.

## 5. Pengalaman pengguna

### A. Masuk dan menyiapkan wallet

User masuk melalui Privy dan menggunakan embedded wallet.

Aplikasi menampilkan:

- Alamat wallet.
- Saldo token input.
- Saldo gas atau status sponsorship jika tersedia.
- Network aktif.

### B. Menambahkan dana

Dua jalur tersedia:

- User sudah mempunyai USDC pada network Monad yang digunakan.
- User menggunakan Aurora untuk membawa aset dari chain lain ke wallet tersebut.

Setelah settlement Aurora terkonfirmasi, dana dapat digunakan untuk order Kairos.

**Dukungan kombinasi chain, token, dan testnet/mainnet Aurora harus dibuktikan.** Kita belum boleh menjanjikan pendanaan lintas chain ke testnet hanya karena eksekusi Kuru menggunakan testnet.

### C. Membuat order

User mengisi:

| Field | Contoh ilustratif |
|---|---|
| Buy | MON |
| Spend up to | 2.000 USDC |
| Duration | 10 menit |
| Maximum buy price | 1,004 USDC/MON |
| Maximum per execution | 500 USDC |
| Minimum execution | 100 USDC |

Angka harga tersebut hanya contoh spesifikasi.

Sebelum konfirmasi, UI menjelaskan:

- Batas total pengeluaran.
- Deadline order.
- Harga maksimum.
- Dana tidak dikunci.
- Order bisa selesai sebagian.
- Allowance dan saldo harus tetap cukup.

User kemudian memberikan token approval dan membuat order. Kedua tindakan ini tidak boleh diasumsikan menjadi satu transaksi tanpa mekanisme batching yang benar-benar didukung.

### D. Memantau order

Halaman order menunjukkan:

- Anggaran yang sudah digunakan.
- MON yang diterima.
- Sisa batas anggaran.
- Saldo wallet yang tersedia.
- Batas harga dan deadline.
- Kondisi pasar terakhir.
- Keputusan terbaru beserta alasannya.
- Riwayat transaksi.

### E. Menghentikan order

User dapat:

- **Cancel order:** menonaktifkan order tertentu.
- **Revoke approval:** mencabut allowance token ke kontrak Kairos.

Dana yang belum digunakan tetap berada di wallet. Tidak ada tombol withdrawal untuk anggaran yang belum ditarik.

## 6. Model dana dan otorisasi

```text
User wallet
    │
    ├── approve token ke Kairos
    └── createOrder(policy)
                │
                ▼
          Kairos contract
                ▲
                │ execute proposal
          CRE / executor
                │
                ▼
       Validasi policy onchain
                │
                ▼
       Tarik input untuk fill
                │
                ▼
          Kuru execution
                │
                ▼
    Output + sisa input → user
```

Terdapat tiga izin yang berbeda:

| Izin | Fungsinya |
|---|---|
| Token allowance | Mengizinkan kontrak menarik token sampai jumlah tertentu |
| Order authorization | Menetapkan policy yang disetujui pemilik dana |
| Executor authorization | Menentukan pihak atau workflow yang boleh mengusulkan eksekusi |

Allowance ERC-20 tidak memahami order, jadwal, atau batas harga. Semua batas tersebut menjadi tanggung jawab kontrak Kairos.

Privy delegated signer **bukan kewajiban** untuk model ini. Executor dapat memicu kontrak yang sudah memperoleh allowance, tanpa tanda tangan user untuk setiap fill.

## 7. Execution policy

Data order yang diusulkan:

| Field | Arti |
|---|---|
| `owner` | Pemilik order dan penerima hasil |
| `market` | Pasar Kuru yang digunakan |
| `tokenIn`, `tokenOut` | Aset input dan output |
| `budget` | Batas total pengeluaran token input |
| `spent` | Pengeluaran aktual yang sudah terjadi |
| `received` | Output aktual yang sudah diterima |
| `startTime`, `endTime` | Periode eksekusi |
| `maxPerFill` | Maksimum input dalam satu eksekusi |
| `minFill` | Minimum input aktual untuk eksekusi yang diterima |
| `priceLimit` | Batas harga eksekusi |
| `status` | Status lifecycle |
| `executionNonce` | Nomor untuk membedakan proposal eksekusi |

Untuk implementasi, anggaran dihitung dalam unit token, bukan dolar dari angka UI. Label dolar hanya estimasi nilai.

**Budget harus mencakup seluruh debit token input yang dibebankan kepada user.** Gas dilaporkan terpisah. Jika suatu hari ada biaya Kairos, perlakuannya harus eksplisit dalam policy; untuk hackathon, biaya protokol Kairos bisa nol.

## 8. Scheduling dan adaptive sizing

Anggaran tersedia bertambah secara linear selama periode order:

```text
releasedBudget(t) =
    budget × elapsedTime / duration

availableToSpend =
    max(0, releasedBudget(t) - spent)
```

Waktu perhitungan dibatasi ke rentang awal–akhir order. Setelah expiry, kontrak tetap menolak eksekusi.

Usulan jumlah eksekusi:

```text
proposedFill =
    min(
        availableToSpend,
        remainingBudget,
        maxPerFill,
        walletBalance,
        tokenAllowance,
        estimatedLiquidityCapacity
    )
```

Jika `proposedFill < minFill`, engine menunggu.

Contoh:

| Parameter | Nilai |
|---|---:|
| Jatah yang sudah tersedia | 700 USDC |
| Maksimum per fill | 500 USDC |
| Kapasitas likuiditas dalam batas harga | 280 USDC |
| Saldo dan allowance | Cukup |
| Usulan eksekusi | **280 USDC** |

Saat kapasitas meningkat menjadi 450 USDC, usulan bisa meningkat sesuai sisa jatah.

**Jatah yang tertunda dapat menyusul.** Namun, `maxPerFill` hanya membatasi satu transaksi; itu tidak membatasi jumlah transaksi per menit. Jika kita menginginkan jarak minimum antartransaksi, aturan tersebut harus ditambahkan secara eksplisit sebagai `minExecutionInterval`.

## 9. Estimasi likuiditas dan batas harga

Engine membaca kedalaman order book dan memperkirakan berapa input yang dapat digunakan dalam batas harga user.

Hasil estimasi mencatat:

- Market yang dibaca.
- Waktu atau identitas snapshot.
- Kapasitas yang diperkirakan.
- Perkiraan output dan biaya.
- Usulan fill.
- Alasan menunggu atau mengeksekusi.

Data yang terlalu lama tidak dipakai untuk mengusulkan transaksi.

Untuk BUY, policy awal menggunakan **batas harga efektif rata-rata eksekusi**, dihitung dari input aktual dibagi output aktual. Ini perlu disebut jelas: batas rata-rata tidak identik dengan batas harga setiap individual match.

Angka seperti “40 bps di atas harga referensi saat membuat order” boleh membantu user menetapkan harga absolut. Namun, labelnya bukan otomatis **“max market impact 40 bps”**.

## 10. Settlement dan partial fill

Satu eksekusi harus atomik:

1. Validasi order, pengirim proposal, nonce, jadwal, dan anggaran.
2. Tarik input yang diizinkan.
3. Eksekusi melalui jalur Kuru yang telah ditentukan.
4. Hitung input dan output aktual.
5. Pastikan hasil memenuhi minimum fill dan batas harga.
6. Perbarui accounting.
7. Kirim output dan kembalikan input yang tidak digunakan.
8. Emit execution event.

Jika hasil melanggar policy, seluruh transaksi dibatalkan.

Contoh:

```text
Proposed input:       500 USDC
Actual spent:        420 USDC
Unused input:         80 USDC → dikembalikan
Actual output:        sesuai hasil settlement → user
Accounting:          spent bertambah 420 USDC
```

Implementasi harus memakai perubahan saldo yang relevan, bukan menganggap seluruh saldo kontrak berasal dari fill tersebut.

Kuru mendokumentasikan market orders dengan minimum output dan opsi fill-or-kill. **Perilaku refund dan partial fill pada deployment yang dipilih tetap perlu diuji langsung.** [Dokumentasi OrderBook Kuru](https://docs.kuru.io/contracts/OrderBook)

## 11. Lifecycle dan keputusan engine

Status lifecycle:

```text
ACTIVE
COMPLETED
EXPIRED
CANCELLED
```

Partial fill merupakan progres, bukan status terpisah.

| Kondisi | Perilaku |
|---|---|
| Anggaran selesai digunakan | `COMPLETED` |
| Deadline tercapai | Tidak boleh execute; ditampilkan `EXPIRED` |
| Pemilik membatalkan | `CANCELLED` |
| Likuiditas belum cukup | Tetap aktif, `WAIT` |
| Saldo atau allowance kurang | Tetap aktif, tampilkan penyebab |
| Sisa anggaran di bawah minimum fill | Tidak dipaksa; tetap di wallet |

Expiry harus ditegakkan berdasarkan timestamp walaupun tidak ada transaksi khusus yang mengubah storage status.

Alasan keputusan dapat berupa:

```text
NOT_DUE
INSUFFICIENT_LIQUIDITY
PRICE_OUT_OF_BOUNDS
INSUFFICIENT_BALANCE
INSUFFICIENT_ALLOWANCE
STALE_MARKET_DATA
REMAINDER_BELOW_MIN_FILL
EXPIRED
CANCELLED
```

`WAIT` adalah hasil evaluasi sebelum mengirim transaksi. Revert adalah transaksi yang gagal; keduanya tidak disamakan dalam laporan.

## 12. Peran empat integrasi

| Integrasi | Pekerjaan di Kairos |
|---|---|
| **Kuru** | Data pasar dan eksekusi spot nyata |
| **CRE** | Mengatur pembacaan policy, pengambilan data, perhitungan proposal, dan pengiriman hasil |
| **Privy** | Embedded wallet serta penandatanganan approval, pembuatan order, cancel, dan revoke |
| **Aurora** | Membawa aset dari chain lain untuk digunakan dalam alur Kairos |

Untuk native onchain write CRE, arsitekturnya:

```text
CRE workflow
    → signed report
    → Chainlink forwarder
    → Kairos receiver
    → validasi policy
    → Kuru
```

Receiver memvalidasi sumber report dan meneruskan proposal ke execution logic. Nonce dan masa berlaku proposal mencegah proposal lama digunakan sebagai transaksi baru. [Consumer contracts CRE](https://docs.chain.link/cre/guides/workflow/using-evm-client/onchain-write/building-consumer-contracts)

Untuk Aurora:

```text
Source-chain funds
    → Aurora flow
    → settlement ke wallet user pada Monad
    → user authorizes Kairos order
    → execution
```

Arrival dana tidak otomatis memberi Kairos izin membuat order atas nama penerima.

## 13. Arsitektur aplikasi

```text
Kairos frontend
    ├── Privy wallet
    ├── Order creation
    ├── Funding via Aurora
    ├── Live order view
    └── Execution report

CRE workflow
    ├── Read order state
    ├── Fetch market data
    ├── Calculate proposed fill
    └── Submit execution report

Kairos contracts
    ├── Order registry
    ├── Policy validation
    ├── Accounting
    ├── CRE receiver
    └── Kuru adapter

Read service / indexer
    ├── Contract events
    ├── Execution receipts
    └── Offchain decision history
```

Onchain events menjadi sumber kebenaran untuk fills dan lifecycle yang ditransaksikan.

Log offchain menyimpan estimasi dan alasan `WAIT`; log tersebut tidak dipresentasikan seolah seluruhnya sudah terbukti onchain.

## 14. Dashboard

Empat halaman utama sudah cukup:

**Create order**

Form order, saldo, allowance, batas harga, dan ringkasan otorisasi.

**Orders**

Daftar order aktif dan historis dengan progres, deadline, dan status.

**Order detail**

```text
Spent                  840 / 2,000 USDC
Received               Actual MON received
Available by schedule  160 USDC
Wallet balance         Current balance
Last decision          WAIT — insufficient liquidity
```

Di bawahnya:

- Kondisi pasar.
- Rincian perhitungan usulan fill.
- Timeline keputusan.
- Riwayat eksekusi.
- Cancel dan pengelolaan approval.

**Execution report**

- Input aktual.
- Output aktual.
- Harga rata-rata tertimbang.
- Biaya trading dan gas secara terpisah.
- Persentase penyelesaian.
- Jumlah fill.
- Durasi.
- Transaksi gagal dan penyebabnya.
- Link explorer.

## 15. Standar teknis

Ini tetap proyek dengan engineering serius:

- Pembatasan market, token, dan recipient.
- Perlindungan reentrancy.
- Penanganan desimal, rounding, dan market precision.
- Accounting partial fill yang benar.
- Nonce dan validitas proposal.
- Pemeriksaan schedule pada setiap eksekusi.
- Penanganan data stale dan kegagalan API.
- Retry yang tidak menggandakan eksekusi.
- Status yang dipulihkan dari chain setelah aplikasi restart.
- Tidak ada jalur executor untuk menarik dana secara arbitrer.

Pengujian penting mencakup:

| Skenario | Hasil yang diharapkan |
|---|---|
| Pemanggilan berulang | Tidak melampaui jatah kumulatif |
| Proposal yang sama dikirim ulang | Tidak terjadi eksekusi ganda |
| Likuiditas berubah | Hasil tetap memenuhi policy atau revert |
| Partial fill | Accounting dan pengembalian sisa tepat |
| Allowance dicabut | Eksekusi tidak dapat menarik input |
| Cancel terkonfirmasi | Eksekusi berikutnya ditolak |
| Deadline terlewati | Eksekusi ditolak |
| Output terlalu sedikit | Seluruh transaksi dibatalkan |

## 16. Demo hackathon

Demo utama memperlihatkan produk berjalan:

1. User membuka wallet melalui Privy.
2. Membuat order dan memberikan approval.
3. Kairos menunjukkan kapasitas likuiditas kecil dan mengeksekusi fill kecil.
4. Kapasitas berubah, ukuran fill berikutnya berbeda.
5. Kondisi tidak memenuhi policy, Kairos menunggu.
6. Order selesai atau user membatalkan.
7. Receipt dan saldo wallet memperlihatkan hasilnya.

Demo kondisi gagal menunjukkan:

- Price bound tidak terpenuhi.
- Partial fill dan sisa input.
- Approval dicabut.
- Cancel menghentikan eksekusi.

Aurora memiliki bukti flow lintas chain nyata. CRE memiliki workflow simulation atau deployment yang dapat diperiksa. Jika environment keduanya berbeda, demo menjelaskan perbedaan itu secara terbuka.

Benchmark replay merupakan artefak tambahan, bukan pengganti transaksi integrasi nyata.

## 17. Kesesuaian submission

| Track/bounty | Bukti Kairos |
|---|---|
| Finance & Trading | Pengalaman eksekusi spot dengan kontrol pengguna |
| Kuru | Produk bekerja melalui order book, target trader, bukti pengujian/penggunaan, strategi kelanjutan |
| Privy | Wallet dan transaksi nyata di luar login |
| CRE | Orchestration blockchain dan data eksternal, simulasi atau deployment berhasil |
| Aurora | Flow lintas chain nyata, settlement/refund, dana digunakan dalam aplikasi |

Materi submission:

- Public repository.
- Petunjuk menjalankan dan menguji.
- Diagram arsitektur.
- Alamat deployment dan transaksi contoh.
- Technical demo video.
- Pitch video.
- Live product link.
- Penjelasan kontribusi setiap sponsor.
- Batasan implementasi dan environment yang digunakan.

Bukti pengujian testnet disebut pengujian testnet. Jumlah user atau volume tidak direkayasa.

## 18. Urutan pembangunan

**Tahap 1 — Buktikan kompatibilitas integrasi**

Pastikan deployment Kuru, semantics settlement, jalur CRE, transaksi Privy, dan source/destination Aurora. Ini mengurangi risiko menemukan ketidakcocokan environment di akhir.

**Tahap 2 — Execution core**

Bangun order registry, allowance-based pull, policy, accounting, adapter Kuru, cancel, dan expiry.

**Tahap 3 — Adaptive engine**

Bangun pembacaan depth, estimasi kapasitas, pacing kumulatif, stale-data handling, dan alasan keputusan.

**Tahap 4 — Otomatisasi dan UI**

Hubungkan CRE, wallet Privy, halaman order, receipt, dan pemulihan status.

**Tahap 5 — Cross-chain funding**

Hubungkan Aurora ke perjalanan pengguna yang sama dengan tracking settlement dan refund.

**Tahap 6 — Pembuktian dan penyelesaian**

Jalankan pengujian integrasi, uji pengguna testnet bila tersedia, perbaiki UX, lalu siapkan video dan submission.

Keempat sponsor tetap menjadi target. Urutan ini menentukan dependensi pekerjaan, bukan menurunkan standar.

## 19. Definisi selesai

Kairos siap disubmit ketika:

- User bisa membuat dan mengelola order melalui aplikasi.
- Dana tidak perlu diparkir di Kairos sebelum eksekusi.
- Fill adaptif benar-benar melalui Kuru.
- Batas jadwal, harga, anggaran, dan lifecycle terbukti ditegakkan.
- Partial fill dan sisa dana ditangani sesuai spesifikasi.
- CRE menjalankan workflow yang dapat diverifikasi.
- Privy menjalankan fungsi wallet nyata.
- Aurora memiliki flow nyata pada environment yang didukung.
- Dashboard cocok dengan hasil settlement.
- Demo menjelaskan hasil aktual tanpa klaim yang melebihi bukti.

**Target Kairos adalah satu produk eksekusi yang lengkap dan dapat diperiksa: user menentukan batas, engine menghitung kapasitas pasar, kontrak menegakkan izin, dan setiap hasil kembali ke wallet pengguna.**