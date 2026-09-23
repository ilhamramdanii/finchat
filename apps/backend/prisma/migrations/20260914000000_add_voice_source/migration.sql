-- AlterEnum: tambah source VOICE untuk transaksi dari voice command.
-- Dibuat manual karena database lokal tidak terjangkau saat build
-- (auth Postgres lokal tidak diketahui). Untuk database yang sudah punya
-- baseline migration, cukup jalankan `prisma migrate deploy`.
-- Untuk database fresh, `prisma migrate dev` akan memasukkan VOICE
-- ke baseline migration otomatis dari schema.prisma.
ALTER TYPE "TransactionSource" ADD VALUE 'VOICE';
