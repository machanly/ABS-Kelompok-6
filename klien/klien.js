#!/usr/bin/env node
// Klien terminal: login -> tampilkan katalog -> kirim pengajuan -> lihat pengajuan sendiri.
// Hanya berbicara lewat API (HTTP). Tanpa dependensi; butuh Node.js 18+.
const KATALOG = (process.env.KATALOG_URL || 'http://localhost:3001/api/v1').replace(/\/$/, '');
const PEMINJAMAN = (process.env.PEMINJAMAN_URL || 'http://localhost:3002/api/v1').replace(/\/$/, '');

const HELP = `Penggunaan: node klien.js [opsi]

  --user <username>      default: mhs_budi
  --pass <password>      default: Budi#2026 (atau env KLIEN_PASSWORD)
  --fasilitas <id>       default: 1
  --mulai <waktu>        UTC, contoh 2026-11-10T08:00:00Z (default: 7 hari lagi, 08:00)
  --selesai <waktu>      UTC (default: 2 jam setelah mulai)
  --tujuan <teks>        default: "Kegiatan himpunan"
  --help
`;

function parseArgs(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--help') o.help = true;
    else if (argv[i].startsWith('--')) o[argv[i].slice(2)] = argv[++i];
  }
  return o;
}

const iso = (d) => d.toISOString().replace(/\.\d{3}Z$/, 'Z');

async function http(method, url, { token, body } = {}) {
  const headers = { Accept: 'application/json' };
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  let res;
  try {
    res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    console.error(`\nGagal terhubung ke ${url}\nPastikan Katalog (3001) dan Peminjaman (3002) sedang berjalan.`);
    process.exit(1);
  }
  let json = null;
  try { json = await res.json(); } catch { /* body kosong */ }
  return { status: res.status, json };
}

function fail(step, r) {
  const e = (r.json && r.json.error) || {};
  console.error(`   GAGAL [${r.status}] ${e.code || ''} ${e.message || ''}`.trimEnd());
  console.error(`   (langkah: ${step})`);
  process.exit(1);
}

const pad = (v, n) => String(v ?? '-').padEnd(n).slice(0, n);

async function main() {
  const a = parseArgs(process.argv.slice(2));
  if (a.help) return console.log(HELP);

  const username = a.user || 'mhs_budi';
  const password = a.pass || process.env.KLIEN_PASSWORD || 'Budi#2026';
  const start = a.mulai ? new Date(a.mulai) : (() => { const d = new Date(); d.setUTCDate(d.getUTCDate() + 7); d.setUTCHours(8, 0, 0, 0); return d; })();
  const mulai = a.mulai || iso(start);
  const selesai = a.selesai || iso(new Date(start.getTime() + 2 * 3600 * 1000));
  const facilityId = Number(a.fasilitas || 1);
  const tujuan = a.tujuan || 'Kegiatan himpunan';

  // 1. Login
  console.log(`\n[1] Login sebagai ${username}  (POST ${KATALOG}/auth/login)`);
  const login = await http('POST', `${KATALOG}/auth/login`, { body: { username, password } });
  if (login.status !== 200) return fail('login', login);
  const { access_token: token, user } = login.json.data;
  console.log(`   OK [200] ${user.full_name} (${user.role}), token ${token.slice(0, 16)}...`);

  // 2. Katalog
  console.log(`\n[2] Katalog fasilitas  (GET ${KATALOG}/fasilitas)`);
  const kat = await http('GET', `${KATALOG}/fasilitas`, { token });
  if (kat.status !== 200) return fail('katalog', kat);
  console.log(`   ${pad('ID', 3)} ${pad('Nama', 28)} ${pad('Kategori', 10)} ${pad('Lokasi', 26)} Aktif`);
  kat.json.data.forEach((f) => console.log(`   ${pad(f.id, 3)} ${pad(f.name, 28)} ${pad(f.category, 10)} ${pad(f.location, 26)} ${f.is_active ? 'ya' : 'tidak'}`));

  // 3. Ajukan peminjaman
  console.log(`\n[3] Ajukan peminjaman fasilitas #${facilityId}  (POST ${PEMINJAMAN}/peminjaman)`);
  console.log(`   ${mulai} s/d ${selesai}, tujuan: ${tujuan}`);
  const aju = await http('POST', `${PEMINJAMAN}/peminjaman`, {
    token,
    body: { facility_id: facilityId, start_at: mulai, end_at: selesai, purpose: tujuan },
  });
  if (aju.status !== 201) return fail('pengajuan', aju);
  const l = aju.json.data;
  console.log(`   OK [201] pengajuan #${l.id}, status: ${l.status}, borrower_id: ${l.borrower_id} (dari token)`);

  // 4. Lihat pengajuan sendiri
  console.log(`\n[4] Pengajuan saya  (GET ${PEMINJAMAN}/peminjaman)`);
  const mine = await http('GET', `${PEMINJAMAN}/peminjaman`, { token });
  if (mine.status !== 200) return fail('daftar pengajuan', mine);
  console.log(`   ${pad('ID', 3)} ${pad('Fasilitas', 9)} ${pad('Mulai', 21)} ${pad('Selesai', 21)} ${pad('Status', 9)} Tujuan`);
  mine.json.data.forEach((x) => console.log(`   ${pad(x.id, 3)} ${pad(x.facility_id, 9)} ${pad(x.start_at, 21)} ${pad(x.end_at, 21)} ${pad(x.status, 9)} ${x.purpose}`));
  console.log(`   Total: ${mine.json.meta.total}\n`);
}

main();
