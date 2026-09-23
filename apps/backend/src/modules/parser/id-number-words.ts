// Normalizer angka-terbilang Bahasa Indonesia → format digit+suffix
// yang dimengerti ParserService ("20rb", "1.5jt").
//
// Pure functions, tanpa dependency Nest — bisa dipakai backend maupun dites murni.
// Bukan ML: kamus + algoritma akumulasi untuk domain sempit nominal uang.

const ONES: Record<string, number> = {
  nol: 0,
  satu: 1,
  dua: 2,
  tiga: 3,
  empat: 4,
  lima: 5,
  enam: 6,
  tujuh: 7,
  delapan: 8,
  sembilan: 9,
};

// Token tunggal bentuk "se-...".
const SE_WORDS: Record<string, number> = {
  sepuluh: 10,
  sebelas: 11,
  seratus: 100,
  seribu: 1000,
  sejuta: 1_000_000,
  setengah: 0.5,
};

const MULTIPLIERS: Record<string, number> = {
  ribu: 1_000,
  ribuan: 1_000,
  rebu: 1_000, // typo STT yang umum
  juta: 1_000_000,
  jutaan: 1_000_000,
};

// Filler yang aman dibuang sebelum parse.
const FILLERS = new Set(['sekitar', 'kira-kira', 'kira', 'kurang', 'lebih']);

function isNumberWord(t: string): boolean {
  return (
    ONES[t] !== undefined ||
    SE_WORDS[t] !== undefined ||
    MULTIPLIERS[t] !== undefined ||
    t === 'puluh' ||
    t === 'ratus' ||
    t === 'belas' ||
    t === 'koma' ||
    t === 'se'
  );
}

// Parse run token angka (tanpa multiplier) menjadi nilai, misal
// ["tiga","ratus","lima","puluh"] → 350. Return [value, nextIndex].
// "puluh"/"ratus" hanya melipatgandakan digit terakhir yang ditambahkan
// (lastAdded), bukan seluruh akumulasi — "tiga ratus lima puluh" = 350,
// bukan 3050.
function parseSmallRun(tokens: string[], i: number): [number, number] {
  let current = 0;
  let lastAdded = 0;
  let j = i;
  for (; j < tokens.length; j++) {
    const t = tokens[j];
    if (ONES[t] !== undefined) {
      current += ONES[t];
      lastAdded = ONES[t];
    } else if (SE_WORDS[t] !== undefined) {
      current += SE_WORDS[t];
      lastAdded = SE_WORDS[t];
    } else if (t === 'belas') {
      current += 10; // digit sudah ditambah sebelumnya: "dua belas" = 2 + 10
      lastAdded = 10;
    } else if (t === 'puluh') {
      current = current - lastAdded + lastAdded * 10;
      lastAdded = lastAdded * 10;
    } else if (t === 'ratus') {
      const base = lastAdded === 0 ? 1 : lastAdded;
      current = current - lastAdded + base * 100;
      lastAdded = base * 100;
    } else {
      break;
    }
  }
  return [current, j];
}

// Parse satu frasa angka penuh: [small-run] ("koma" digit+)? multiplier?
// Return [formatted|null, nextIndex]. null = bukan frasa angka valid.
function parsePhrase(tokens: string[], i: number): [string | null, number] {
  let [value, j] = parseSmallRun(tokens, i);
  // Bagian desimal: "satu koma lima" → 1.5
  if (tokens[j] === 'koma') {
    let k = j + 1;
    let digits = '';
    while (k < tokens.length && ONES[tokens[k]] !== undefined && ONES[tokens[k]] <= 9) {
      digits += String(ONES[tokens[k]]);
      k++;
    }
    if (!digits) return [null, i]; // "koma" tanpa digit → bukan angka
    value = parseFloat(`${value}.${digits}`);
    j = k;
  }
  // Multiplier opsional.
  const mult = MULTIPLIERS[tokens[j]];
  if (mult !== undefined) {
    value = (value === 0 ? 1 : value) * mult;
    j++;
  }
  // Valid hanya jika minimal satu token angka terkonsumsi dan nilai > 0.
  if (j === i || value <= 0) return [null, i];
  return [formatAmount(value), j];
}

function formatAmount(value: number): string {
  const clean = Math.round(value * 100) / 100;
  if (clean >= 1_000_000) {
    const m = clean / 1_000_000;
    return `${trimNum(m)}jt`;
  }
  if (clean >= 1000) {
    const r = clean / 1000;
    return `${trimNum(r)}rb`;
  }
  return trimNum(clean);
}

function trimNum(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

export function normalizeIdNumberWords(input: string): string {
  // Tokenisasi preservatif: token digit (termasuk pemisah ribuan/desimal
  // "50.000", "1,5jt", suffix "20rb", dan prefix tipe "+5jt"/"-50rb")
  // dipertahankan utuh agar perilaku parser existing untuk input digit/WA
  // tidak berubah. Kata dipertahankan (termasuk "kira-kira"), simbol asing
  // ("!", "?", "/") dipertahankan sebagai token sendiri lalu diteruskan
  // apa adanya — downstream yang memutuskan.
  const tokens =
    input
      .toLowerCase()
      .match(/\/?[a-z]+(?:-[a-z]+)*|[+-]?\d[\d.,]*(?:rb|k|jt|m)?|\S/g) ?? [];
  const out: string[] = [];
  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i];
    if (FILLERS.has(t)) {
      i++;
      continue;
    }
    if (!isNumberWord(t)) {
      out.push(t);
      i++;
      continue;
    }
    const [formatted, next] = parsePhrase(tokens, i);
    if (formatted === null) {
      // Bukan frasa angka valid (misal "koma" sendirian) — biarkan apa adanya
      // agar parser downstream yang memutuskan UNKNOWN.
      out.push(t);
      i++;
      continue;
    }
    out.push(formatted);
    i = next;
  }
  // Rapatkan kembali prefix yang terpisah dari tokenisasi ("+ 50rb" → "+50rb").
  return out
    .join(' ')
    .replace(/(^|\s)([+-]) (\d)/g, '$1$2$3')
    .replace(/\s+/g, ' ')
    .trim();
}
