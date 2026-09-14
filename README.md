# Kairos — Codex handoff
Prepared 2026-09-14. This is a context and implementation handoff, not an implemented application.

## Cara menggunakan
1. Ekstrak seluruh paket ke root repository Kairos. Jika repository sudah memiliki AGENTS.md, gabungkan instruksinya secara hati-hati; jangan overwrite pekerjaan yang ada.
2. Buka repository tersebut sebagai project di Codex.
3. Berikan isi CODEX_START_PROMPT.md sebagai pesan awal.
4. Gunakan satu task utama untuk menjaga keputusan, implementasi, dan bukti tetap konsisten. Pecah pekerjaan menjadi milestone di WORKPLAN.md.
5. Bila membuat task pengganti, minta membaca STATUS.md dan EVIDENCE.md. Jangan mengandalkan akses ke percakapan lama.
6. Spesifikasi final tidak boleh dipangkas menjadi demo basic. Tidak ada implementasi sponsor yang sudah terbukti hanya karena tercantum di dokumen.

## Read order
- AGENTS.md — instruksi kerja ringkas
- docs/PRODUCT_SPEC_FINAL.md — spesifikasi final user, disalin verbatim
- docs/DECISIONS.md — keputusan dan batas interpretasi
- docs/HACKATHON_REQUIREMENTS.md — deliverables dan hadiah
- docs/SOURCES.md — sumber resmi, provenance, dan apa yang harus diperiksa
- docs/INTEGRATION_VALIDATION.md — pertanyaan teknis yang belum terjawab
- docs/ACCEPTANCE_TESTS.md — matriks pembuktian
- WORKPLAN.md, STATUS.md, EVIDENCE.md — kelanjutan kerja

## Source hierarchy
Instruksi user terbaru mengungguli paket ini. Untuk produk, PRODUCT_SPEC_FINAL.md adalah acuan utama.
Dokumentasi sponsor menentukan kemampuan API, bukan mengubah scope produk secara diam-diam.
Bila kemampuan nyata bertentangan dengan spesifikasi, dokumentasikan bukti dan opsi; lanjutkan bagian independen.
Raw user-provided hackathon materials ada di sources/. Bukan snapshot yang diverifikasi terhadap portal login saat paket dibuat.
Tidak ada source code aplikasi, ABI terpin, API key, deployment baru, atau transaksi eksekusi di paket ini.

