export const WA_QUEUE_NAME = 'whatsapp-messages';

export const WA_HELP_MESSAGE = `
*🤖 WA Finance Bot*

*Format Pencatatan:*
> \`[deskripsi] [nominal]\`
> \`[nominal] [deskripsi]\`

*Contoh Pengeluaran:*
> \`makan 50rb\`
> \`bensin 80k\`
> \`bayar listrik 200.000\`

*Contoh Pemasukan:*
> \`gajian 5jt\`
> \`bonus 1jt transfer\`
> \`+3jt freelance\`

*Metode Pembayaran (opsional):*
> Tambahkan di akhir: \`cash\` | \`transfer\` | \`qris\`
> Alias: \`tunai\`, \`bca\`, \`mandiri\`, \`gopay\`, \`shopeepay\`, dll

*Perintah:*
> \`/total\` — total hari ini
> \`/saldo\` — saldo bulan ini
> \`/laporan\` — laporan bulan ini
> \`/bantuan\` — tampilkan pesan ini
`.trim();
