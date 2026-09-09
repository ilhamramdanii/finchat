import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const categories = [
  // ── EXPENSE ──────────────────────────────────────────
  {
    name: 'Makan & Minum',
    type: 'EXPENSE' as const,
    keywords: ['makan', 'minum', 'makan minum', 'makanan', 'minuman', 'sarapan', 'siang', 'malam', 'snack', 'jajan', 'kopi', 'cafe', 'resto', 'restoran', 'warteg', 'warung', 'nasi', 'bakso', 'soto', 'indomie', 'kfc', 'mcd'],
    icon: '🍜',
    color: '#F59E0B',
    isDefault: true,
  },
  {
    name: 'Transport',
    type: 'EXPENSE' as const,
    keywords: ['bensin', 'bbm', 'solar', 'parkir', 'toll', 'tol', 'grab', 'gojek', 'ojol', 'ojek', 'bus', 'kereta', 'krl', 'mrt', 'angkot', 'taksi', 'taxi', 'transport', 'transportasi', 'perjalanan'],
    icon: '🚗',
    color: '#3B82F6',
    isDefault: true,
  },
  {
    name: 'Belanja',
    type: 'EXPENSE' as const,
    keywords: ['belanja', 'beli', 'baju', 'pakaian', 'sepatu', 'tas', 'shopee', 'tokopedia', 'lazada', 'toko', 'supermarket', 'indomaret', 'alfamart', 'minimarket'],
    icon: '🛍️',
    color: '#EC4899',
    isDefault: true,
  },
  {
    name: 'Tagihan',
    type: 'EXPENSE' as const,
    keywords: ['tagihan', 'bayar', 'listrik', 'pln', 'air', 'pdam', 'wifi', 'internet', 'indihome', 'telkom', 'tv', 'netflix', 'spotify', 'langganan', 'iuran'],
    icon: '📄',
    color: '#8B5CF6',
    isDefault: true,
  },
  {
    name: 'Kesehatan',
    type: 'EXPENSE' as const,
    keywords: ['obat', 'dokter', 'rs', 'rumah sakit', 'klinik', 'apotek', 'apotik', 'bpjs', 'vitamin', 'kesehatan', 'periksa', 'konsultasi'],
    icon: '🏥',
    color: '#10B981',
    isDefault: true,
  },
  {
    name: 'Hiburan',
    type: 'EXPENSE' as const,
    keywords: ['hiburan', 'nonton', 'bioskop', 'cinema', 'games', 'game', 'main', 'liburan', 'wisata', 'hotel', 'staycation', 'konser'],
    icon: '🎮',
    color: '#F43F5E',
    isDefault: true,
  },
  {
    name: 'Pendidikan',
    type: 'EXPENSE' as const,
    keywords: ['kursus', 'les', 'buku', 'sekolah', 'kampus', 'kuliah', 'spp', 'ukt', 'pendidikan', 'seminar', 'pelatihan', 'training'],
    icon: '📚',
    color: '#6366F1',
    isDefault: true,
  },

  // ── INCOME ───────────────────────────────────────────
  {
    name: 'Gaji Pokok',
    type: 'INCOME' as const,
    keywords: ['gaji', 'gajian', 'salary', 'upah', 'gaji pokok', 'take home pay', 'thp'],
    icon: '💰',
    color: '#22C55E',
    isDefault: true,
  },
  {
    name: 'Tunjangan',
    type: 'INCOME' as const,
    keywords: ['tunjangan', 'allowance', 'uang makan', 'uang transport', 'uang bensin', 'uang lembur', 'lembur', 'overtime', 'uang jabatan'],
    icon: '🧾',
    color: '#10B981',
    isDefault: true,
  },
  {
    name: 'Bonus & THR',
    type: 'INCOME' as const,
    keywords: ['bonus', 'thr', 'insentif', 'incentive', 'reward', 'cashback', 'komisi', 'commission', 'performance'],
    icon: '🎁',
    color: '#F97316',
    isDefault: true,
  },
  {
    name: 'Freelance',
    type: 'INCOME' as const,
    keywords: ['freelance', 'project', 'proyek', 'bayaran', 'klien', 'client', 'jasa', 'fee', 'konsultasi'],
    icon: '💻',
    color: '#14B8A6',
    isDefault: true,
  },
  {
    name: 'Bisnis',
    type: 'INCOME' as const,
    keywords: ['bisnis', 'usaha', 'jualan', 'jual', 'dagangan', 'omzet', 'pendapatan usaha', 'toko', 'olshop', 'online shop'],
    icon: '🏪',
    color: '#8B5CF6',
    isDefault: true,
  },
  {
    name: 'Investasi',
    type: 'INCOME' as const,
    keywords: ['investasi', 'dividen', 'dividend', 'saham', 'reksadana', 'obligasi', 'bunga', 'profit', 'return', 'cuan', 'deposito', 'yield'],
    icon: '📈',
    color: '#0EA5E9',
    isDefault: true,
  },
  {
    name: 'Sewa',
    type: 'INCOME' as const,
    keywords: ['sewa', 'kost', 'kontrakan', 'rental', 'sewaan', 'hasil sewa', 'indekos'],
    icon: '🏠',
    color: '#F59E0B',
    isDefault: true,
  },
  {
    name: 'Hadiah',
    type: 'INCOME' as const,
    keywords: ['hadiah', 'kado', 'gift', 'dapat', 'dikasih', 'pemberian', 'hibah', 'warisan', 'undian', 'lomba'],
    icon: '🎀',
    color: '#EC4899',
    isDefault: true,
  },
  {
    name: 'Pengembalian Dana',
    type: 'INCOME' as const,
    keywords: ['refund', 'kembalian', 'kembali', 'reimburse', 'reimbursement', 'reimburse', 'balik modal', 'pengembalian'],
    icon: '↩️',
    color: '#6366F1',
    isDefault: true,
  },

  // ── EXPENSE (lanjutan) ───────────────────────────────
  {
    name: 'Kebutuhan Rumah',
    type: 'EXPENSE' as const,
    keywords: ['galon', 'sabun', 'deterjen', 'sampo', 'shampo', 'pasta gigi', 'sikat gigi', 'tisu', 'tissue', 'pewangi', 'sabun cuci', 'sabun mandi', 'pembersih', 'pel', 'sapu', 'ember', 'bayclin', 'soklin', 'rinso', 'sunlight', 'lifebuoy', 'dettol', 'wipol', 'attack', 'molto', 'downy', 'charcoal', 'arang', 'baterai', 'lampu', 'keran', 'kebutuhan', 'keperluan rumah', 'perlengkapan', 'peralatan rumah'],
    icon: '🏠',
    color: '#0EA5E9',
    isDefault: true,
  },
  {
    name: 'Sedekah',
    type: 'EXPENSE' as const,
    keywords: ['sedekah', 'infaq', 'infak', 'zakat', 'donasi', 'sumbangan', 'amal', 'wakaf', 'jariyah', 'charity'],
    icon: '🤲',
    color: '#10B981',
    isDefault: true,
  },

  // ── BOTH ─────────────────────────────────────────────
  {
    name: 'Transfer',
    type: 'BOTH' as const,
    keywords: ['transfer', 'tf', 'kirim', 'terima', 'dapat', 'masuk'],
    icon: '🔄',
    color: '#6B7280',
    isDefault: true,
  },
  {
    name: 'Lainnya',
    type: 'BOTH' as const,
    keywords: ['lain', 'lainnya', 'misc', 'other'],
    icon: '📌',
    color: '#9CA3AF',
    isDefault: true,
  },
];

async function main() {
  console.log('🌱 Seeding categories...');

  // Rename lama → baru agar relasi transaksi tidak putus
  const renames: { from: string; to: string }[] = [
    { from: 'Gaji',  to: 'Gaji Pokok' },
    { from: 'Bonus', to: 'Bonus & THR' },
  ];
  for (const { from, to } of renames) {
    const exists = await prisma.category.findUnique({ where: { name: from } });
    const target = await prisma.category.findUnique({ where: { name: to } });
    if (exists && !target) {
      await prisma.category.update({ where: { name: from }, data: { name: to } });
      console.log(`  ↩ Renamed "${from}" → "${to}"`);
    }
  }

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: cat,
      create: cat,
    });
  }

  console.log(`✅ Seeded ${categories.length} categories`);
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
