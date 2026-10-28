// Waktu dari API disimpan sebagai UTC tanpa penanda zona (kolom MySQL DATETIME),
// jadi `new Date("2026-10-28T03:00:00")` salah dibaca sebagai jam lokal — tampil 7 jam
// lebih awal di WIB. Semua pembacaan waktu lewat helper di sini.

const HAS_TZ = /(?:[zZ]|[+-]\d{2}:?\d{2})$/;
const pad = (n) => String(n).padStart(2, '0');

export function parseUtc(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const text = String(value).trim();
  const date = new Date(HAS_TZ.test(text) ? text : `${text}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateTime(value) {
  const d = parseUtc(value);
  return d ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}` : '—';
}

export function formatTimeOnly(value) {
  const d = parseUtc(value);
  return d ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : '—';
}

// Jam dinding lokal user untuk input datetime-local (default ETD, prefill edit).
export function toLocalInput(value = new Date()) {
  const d = value instanceof Date ? value : parseUtc(value);
  if (!d) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Isi datetime-local (jam lokal) -> ISO UTC untuk dikirim ke API.
export function localInputToUtc(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}