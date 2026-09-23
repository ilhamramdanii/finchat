import { Injectable, signal, computed } from '@angular/core';

export type Language = 'id' | 'en';

export const TRANSLATIONS = {
  id: {
    // Shell & Navigation
    navOverview: 'Ringkasan',
    navLedger: 'Buku Kas',
    navReports: 'Laporan',
    navAccount: 'Akun',
    brandSub: 'SISTEM KAS CERDAS',
    statusOnline: 'ONLINE',
    logout: 'Keluar',
    logoutConfirm: 'Keluar dari sesi',
    notifications: 'Notifikasi',
    allCaughtUp: 'Semua notifikasi telah dibaca',
    notificationsTitle: 'Pemberitahuan Sistem',

    // Dashboard & Wallet
    dashEyebrow: 'RINGKASAN KEUANGAN',
    dashTitle: 'Ringkasan Kas',
    monthly: 'Bulanan',
    yearly: 'Tahunan',
    custom: 'Kustom',
    recordCash: 'Catat Kas',
    ledgerBalance: 'SALDO UTAMA',
    savingsRate: 'Rasio Tabungan',
    income: 'Pemasukan',
    expense: 'Pengeluaran',
    dailyAverage: 'Rata-rata Harian',
    cashFlowGraph: 'Grafik Arus Kas',
    cashFlowSub: 'Volume pemasukan vs pengeluaran',
    inFlow: 'Masuk',
    outFlow: 'Keluar',
    recentTransactions: 'Transaksi Terbaru',
    seeAll: 'Lihat Semua',
    financialHealth: 'Kesehatan Finansial',
    expenseDistribution: 'Distribusi Pengeluaran',
    noCategoryData: 'Belum ada data transaksi untuk kategori ini.',
    emptyChartHint: 'Pilih minimal satu filter (Masuk/Keluar) untuk melihat grafik',
    walletTitle: 'Dompet & Rekening',
    walletSub: 'Distribusi saldo kas & instrumen',
    appleCardNumber: '•••• •••• •••• 2026',
    appleCardHolder: 'PEMEGANG KAS UTAMA',
    cashBalance: 'Uang Tunai (Cash)',
    bankTransfer: 'Transfer Bank',
    qrisBalance: 'QRIS & E-Wallet',

    // Transactions / Ledger
    txEyebrow: 'JURNAL & AUDIT KAS',
    txTitle: 'Buku Kas & Riwayat',
    netBalance: 'Saldo Bersih',
    searchPlaceholder: 'Cari transaksi...',
    all: 'Semua',
    newTransaction: 'Catat Transaksi Baru',
    editTransaction: 'Edit Transaksi',
    txDescription: 'Deskripsi Transaksi',
    txAmount: 'Nominal (Rp)',
    paymentMethod: 'Metode Pembayaran',
    category: 'Kategori',
    txDate: 'Tanggal Transaksi',
    notes: 'Catatan Tambahan (Opsional)',
    cancel: 'Batal',
    save: 'Simpan',
    saving: 'Menyimpan...',
    delete: 'Hapus',
    emptyTransactions: 'Belum ada catatan transaksi yang sesuai filter.',
    cash: 'Tunai',
    transfer: 'Transfer',
    qris: 'QRIS',
    voicePrompt: 'Bicara atau ketik catatan transaksi',

    // Reports
    reportTitle: 'Laporan Keuangan',
    selectPeriodReport: 'Pilih periode untuk melihat laporan',
    tabSummary: 'Ringkasan',
    tabDaily: 'Harian / Bulanan',
    tabCategories: 'Kategori',
    tabAnalytics: 'Analisis & Insight',
    totalIncome: 'Total Pemasukan',
    totalExpense: 'Total Pengeluaran',
    netCashflow: 'Arus Kas Bersih',
    print: 'Cetak',
    exportCsv: 'Unduh CSV',
    dailyAvg: 'Rata-rata Harian',
    highestExpense: 'Pengeluaran Tertinggi',
    categoryBreakdown: 'Rincian per Kategori',
    topSpends: 'Pengeluaran Terbesar',
    savingsInsight: 'Wawasan Tabungan',

    // Profile & Settings
    profileEyebrow: 'PENGATURAN & KATEGORI',
    profileTitle: 'Profil & Preferensi',
    userStatusActive: 'Aktif',
    editAccountInfo: 'Informasi Akun',
    fullName: 'Nama Lengkap / Panggilan',
    namePlaceholder: 'Masukkan nama Anda...',
    waNumber: 'Nomor WhatsApp (Identitas Akses)',
    waHint: 'Nomor identitas terikat dengan sesi login saat ini.',
    saveChanges: 'Simpan Perubahan',
    categoriesManager: 'Kategori Transaksi',
    categoriesDesc: 'Kelola kategori dan kata kunci pintar untuk pencatatan otomatis.',
    newCategory: 'Kategori Baru',
    categoryName: 'Nama Kategori',
    txType: 'Tipe Transaksi',
    indicatorColor: 'Warna Label',
    both: 'Keduanya (Pemasukan & Pengeluaran)',
    appPreferences: 'Preferensi Aplikasi',
    systemLanguage: 'Bahasa Tampilan',
    systemVersion: 'Versi Aplikasi',
    themeMode: 'Mode Tampilan (Tema)',
    lightMode: 'Terang',
    darkMode: 'Gelap',
    autoMode: 'Otomatis',
    signOut: 'Keluar dari Akun'
  },
  en: {
    // Shell & Navigation
    navOverview: 'Overview',
    navLedger: 'Ledger',
    navReports: 'Reports',
    navAccount: 'Account',
    brandSub: 'SMART LEDGER SYSTEM',
    statusOnline: 'ONLINE',
    logout: 'Log Out',
    logoutConfirm: 'Log out of session',
    notifications: 'Notifications',
    allCaughtUp: 'All caught up! No unread alerts',
    notificationsTitle: 'System Notifications',

    // Dashboard & Wallet
    dashEyebrow: 'FINANCIAL OVERVIEW',
    dashTitle: 'Cash Overview',
    monthly: 'Monthly',
    yearly: 'Yearly',
    custom: 'Custom',
    recordCash: 'Add Entry',
    ledgerBalance: 'TOTAL BALANCE',
    savingsRate: 'Savings Rate',
    income: 'Income',
    expense: 'Expense',
    dailyAverage: 'Daily Average',
    cashFlowGraph: 'Cash Flow Dynamics',
    cashFlowSub: 'Income volume vs expenses',
    inFlow: 'Inflow',
    outFlow: 'Outflow',
    recentTransactions: 'Recent Transactions',
    seeAll: 'View All',
    financialHealth: 'Financial Health',
    expenseDistribution: 'Expense Breakdown',
    noCategoryData: 'No transactions found for this period.',
    emptyChartHint: 'Select at least one metric (Inflow/Outflow) to preview dynamics',
    walletTitle: 'Wallets & Accounts',
    walletSub: 'Balance distribution across instruments',
    appleCardNumber: '•••• •••• •••• 2026',
    appleCardHolder: 'PRIMARY ACCOUNT HOLDER',
    cashBalance: 'Physical Cash',
    bankTransfer: 'Bank Accounts',
    qrisBalance: 'QRIS & Digital Vault',

    // Transactions / Ledger
    txEyebrow: 'JOURNAL & LEDGER AUDIT',
    txTitle: 'Ledger & History',
    netBalance: 'Net Balance',
    searchPlaceholder: 'Search transactions...',
    all: 'All',
    newTransaction: 'New Transaction',
    editTransaction: 'Edit Transaction',
    txDescription: 'Description',
    txAmount: 'Amount (Rp)',
    paymentMethod: 'Payment Method',
    category: 'Category',
    txDate: 'Transaction Date',
    notes: 'Additional Notes (Optional)',
    cancel: 'Cancel',
    save: 'Save',
    saving: 'Saving...',
    delete: 'Delete',
    emptyTransactions: 'No transaction entries matching criteria.',
    cash: 'Cash',
    transfer: 'Transfer',
    qris: 'QRIS',
    voicePrompt: 'Speak or type transaction details',

    // Reports
    reportTitle: 'Financial Reports',
    selectPeriodReport: 'Select a period to analyze reports',
    tabSummary: 'Summary',
    tabDaily: 'Daily / Monthly',
    tabCategories: 'Categories',
    tabAnalytics: 'Analytics & Insights',
    totalIncome: 'Total Income',
    totalExpense: 'Total Expenses',
    netCashflow: 'Net Cash Flow',
    print: 'Print',
    exportCsv: 'Export CSV',
    dailyAvg: 'Daily Average',
    highestExpense: 'Peak Outflow',
    categoryBreakdown: 'Category Breakdown',
    topSpends: 'Top Expenditures',
    savingsInsight: 'Savings Insights',

    // Profile & Settings
    profileEyebrow: 'SETTINGS & CATEGORIES',
    profileTitle: 'Profile & Settings',
    userStatusActive: 'Active',
    editAccountInfo: 'Account Information',
    fullName: 'Full Name',
    namePlaceholder: 'Enter your name...',
    waNumber: 'WhatsApp ID (Primary Access)',
    waHint: 'Verified phone identifier linked to your active session.',
    saveChanges: 'Save Changes',
    categoriesManager: 'Transaction Categories',
    categoriesDesc: 'Configure transaction categories and AI keyword matching.',
    newCategory: 'New Category',
    categoryName: 'Category Name',
    txType: 'Transaction Type',
    indicatorColor: 'Label Color',
    both: 'Both (Income & Expense)',
    appPreferences: 'App Preferences',
    systemLanguage: 'Language',
    systemVersion: 'App Version',
    themeMode: 'Appearance Theme',
    lightMode: 'Light',
    darkMode: 'Dark',
    autoMode: 'Auto',
    signOut: 'Sign Out'
  }
};

@Injectable({ providedIn: 'root' })
export class I18nService {
  readonly currentLang = signal<Language>('id');

  readonly t = computed(() => TRANSLATIONS[this.currentLang()]);

  constructor() {
    const saved = localStorage.getItem('app-lang') as Language;
    if (saved === 'en' || saved === 'id') {
      this.currentLang.set(saved);
    }
  }

  setLanguage(lang: Language) {
    this.currentLang.set(lang);
    localStorage.setItem('app-lang', lang);
  }

  toggle() {
    this.setLanguage(this.currentLang() === 'id' ? 'en' : 'id');
  }
}
