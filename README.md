# BridgeShort — Render 3D di GitHub Actions (10 job paralel)

Repo siap-push untuk me-render video animasi 3D **BridgeShort** (template
[mromidev/claude-animated-shorts](https://github.com/mromidev/claude-animated-shorts),
gaya karakter 2D di dunia 3D bergambar via Remotion 4 + three.js) lewat
**GitHub Actions 10 job paralel**.

Kenapa di Actions, bukan di mesin lokal? Render di VM tanpa GPU butuh **12–22 jam**
untuk satu video 60 detik (SwiftShader ±0,03 fps). Di Actions, 1800+ frame dibagi
ke 10 runner yang jalan bersamaan.

## Video yang di-render

- Komposisi: `BridgeShort` — "The Bridge That Fell for a Song"
- **2025 frame (0..2024), 1080×1920, 30 fps, 67,5 detik**
- H.264, CRF 16, tanpa audio

## Cara pakai

1. Push repo ini ke **repo GitHub PUBLIK** (repo publik = Actions gratis tanpa
   batas menit — lihat "Biaya" di bawah).
2. Buka tab **Actions** → pilih workflow **"Render BridgeShort (10 paralel)"**
   → **Run workflow**.
3. Tunggu: job `render` jalan 10 chunk paralel, lalu job `stitch` menggabungnya.
4. Setelah selesai, unduh artifact **`final-video`** → `bridge-short-final.mp4`.
   (Artifact part per-chunk `part-0` … `part-9` juga tersedia kalau perlu dicek.)
5. **Unduh dalam 7 hari** — artifact dihapus otomatis setelah itu
   (`retention-days: 7`).

## Perkiraan waktu & biaya

| | |
|---|---|
| Waktu wall (ESTIMASI, bukan jaminan) | **±1,4–2,4 jam** untuk satu video 67,5 detik |
| Biaya di repo **publik** | **$0** (runner Linux publik gratis, tanpa batas menit) |
| Biaya di repo **privat** | Runner privat cuma 2 vCPU (lebih lambat, ±2,1–3,6 jam); jatah Free 2.000 menit Linux/bulan ≈ 1–1,5 video, selebihnya $0,006/menit (±$5–9/video) |

Estimasi waktu dihitung dari kecepatan terukur di VM 4-core (±25–45 detik/frame):
203 frame/chunk × 25–45 detik ≈ 85–150 menit per job + ±10 menit setup.
Job timeout disetel 300 menit (batas GitHub 6 jam) — masih aman.

## Pembagian frame (10 chunk)

Rumus di workflow: `START = chunk × 203`, `END = min(START + 202, 2024)`.
Setiap frame 0..2024 ter-cover **tepat satu kali** — tanpa celah, tanpa tumpang tindih.

| Chunk | Frame | Jumlah frame |
|---|---|---|
| 0 | 0–202 | 203 |
| 1 | 203–405 | 203 |
| 2 | 406–608 | 203 |
| 3 | 609–811 | 203 |
| 4 | 812–1014 | 203 |
| 5 | 1015–1217 | 203 |
| 6 | 1218–1420 | 203 |
| 7 | 1421–1623 | 203 |
| 8 | 1624–1826 | 203 |
| 9 | 1827–2024 | 198 |
| **Total** | **0–2024** | **2025** |

## Cara kerja workflow (`.github/workflows/render.yml`)

- **Trigger:** `workflow_dispatch` saja (manual dari tab Actions).
- **Job `render`** (matrix 10 chunk, `ubuntu-latest`, timeout 300 mnt):
  checkout → Node 24 (`npm ci`) → `npx remotion browser ensure` →
  hitung range frame → render part dengan
  `npx remotion render src/index.ts BridgeShort out/part-N.mp4 --codec h264
  --crf 16 --frames=A-B --concurrency=1 --gl=swangle --timeout=300000`
  → upload artifact `part-N`.
- **Job `stitch`** (`needs: render`, timeout 30 mnt): download ke-10 part →
  cek tiap part ada & punya stream video → gabung urut part-0..9 dengan
  ffmpeg concat demuxer, **stream copy** (semua part codec-nya sama; re-encode
  H.264 hanya sebagai fallback kalau stream copy gagal) → verifikasi durasi
  final ≈ 67,5 detik (ffprobe, toleransi 67,0–68,0) → upload artifact
  `final-video`.
- Semua action di-pin ke **v4**. **Tidak ada secret** yang dipakai.

## Catatan penting

- **Aset Kenney `.glb` tidak ada di repo** (26 file 404 di template asli).
  Kode menanganinya dengan baik (`world.ts`: load gagal → `null`), jadi render
  tetap jalan — hanya saja **tidak ada pohon, gerobak, stall, dan kincir angin**
  di scene. Kota, jembatan, prajurit, dan langit tetap lengkap. Untuk produksi,
  unduh file GLB Kenney (lisensi CC0) dari kenney.nl ke `public/bridge/kenney/`.
- **Frame pertama bisa kosong — jangan panik.** Karena cold start (bangun dunia
  + compile shader di SwiftShader butuh puluhan detik), frame 0–1 bisa keluar
  kosong warna latar. Itu hanya 1–2 frame awal; sisanya ter-render penuh.
  QC selalu dari frame video, bukan dari still.
- **Wajib `--gl=swangle`.** Runner Actions tidak punya GPU; `--gl=angle` gagal
  keras di Actions. Workflow ini sudah memakai swangle.
- `npm ci` butuh `package-lock.json` — file itu ikut di repo ini. Jangan hapus.
- Remotion 4.0.547, React 19, three 0.187. Perintah render di workflow ini
  persis yang sudah terbukti jalan (lihat `TEST-REPORT.md` di folder induk
  `remotion-test/`).
