// Satu-satunya jalur Peminjaman ke Katalog: HTTP. Tidak membaca database/modul Katalog.
const config = require('./config');

class CatalogUnavailableError extends Error {}

// Mengembalikan objek fasilitas, atau null bila Katalog menjawab 404.
async function getFasilitas(id, authHeader) {
  const url = `${config.katalogUrl}/fasilitas/${id}`;
  const masked = `Bearer ***${authHeader.slice(-6)}`;
  const t0 = Date.now();
  let res;
  try {
    res = await fetch(url, {
      headers: { Authorization: authHeader, Accept: 'application/json' }, // token pengguna diteruskan
      signal: AbortSignal.timeout(config.katalogTimeoutMs),
    });
  } catch (err) {
    console.log(`[Peminjaman -> Katalog] GET ${url} GAGAL (${err.name}) (${Date.now() - t0}ms)`);
    throw new CatalogUnavailableError('Katalog tidak dapat dihubungi.');
  }
  console.log(`[Peminjaman -> Katalog] GET ${url} -> ${res.status} (${Date.now() - t0}ms) Authorization: ${masked}`);
  if (res.status === 404) return null;
  if (res.status !== 200) throw new CatalogUnavailableError(`Katalog menjawab status ${res.status}.`);
  try {
    return (await res.json()).data;
  } catch {
    throw new CatalogUnavailableError('Respons Katalog tidak valid.');
  }
}

module.exports = { getFasilitas, CatalogUnavailableError };
