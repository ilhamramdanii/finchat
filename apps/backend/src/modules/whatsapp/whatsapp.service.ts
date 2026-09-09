import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
  proto,
  Browsers,
  areJidsSameUser,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import * as fs from 'fs';
import * as path from 'path';
import * as qrcode from 'qrcode-terminal';
import { WA_QUEUE_NAME } from './whatsapp.constants';

export interface IncomingMessage {
  from: string;
  text: string;
  pushName: string | null;
  messageId: string;
}

@Injectable()
export class WhatsappService implements OnModuleInit {
  private readonly logger = new Logger(WhatsappService.name);
  private socket: WASocket | null = null;
  private readonly sessionPath: string;
  private readonly ownerPhone: string;
  private readonly sentMessageIds = new Set<string>();

  constructor(
    private readonly config: ConfigService,
    @InjectQueue(WA_QUEUE_NAME) private readonly queue: Queue,
  ) {
    const rawPath = config.get<string>('whatsapp.sessionPath') ?? './wa-sessions';
    this.sessionPath = path.isAbsolute(rawPath)
      ? rawPath
      : path.resolve(process.cwd(), rawPath);
    this.ownerPhone = config.get<string>('whatsapp.ownerPhone') ?? '';
  }

  async onModuleInit() {
    await this.connect();
  }

  private async connect() {
    if (!fs.existsSync(this.sessionPath)) {
      fs.mkdirSync(this.sessionPath, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(this.sessionPath);

    const silentLogger: any = {
      level: 'silent',
      trace: () => {}, debug: () => {}, info: () => {},
      warn: () => {}, error: () => {}, fatal: () => {},
      child: () => silentLogger,
    };

    this.socket = makeWASocket({
      auth: state,
      logger: silentLogger,
      browser: Browsers.ubuntu('Chrome'),
      syncFullHistory: false,
      connectTimeoutMs: 30_000,
      retryRequestDelayMs: 2000,
    });

    this.socket.ev.on('creds.update', saveCreds);

    this.socket.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
      if (qr) {
        this.logger.log('📱 Scan QR code berikut dengan WhatsApp kamu:');
        qrcode.generate(qr, { small: true });
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        this.logger.warn(`Koneksi WA terputus. StatusCode: ${statusCode}`);

        if (statusCode === DisconnectReason.loggedOut) {
          this.logger.warn('Session tidak valid, menghapus session dan reconnect...');
          fs.rmSync(this.sessionPath, { recursive: true, force: true });
          setTimeout(() => this.connect(), 2000);
        } else {
          setTimeout(() => this.connect(), 5000);
        }
      }

      if (connection === 'open') {
        this.logger.log('✅ WhatsApp terhubung');
      }
    });

    this.socket.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify' && type !== 'append') return;

      for (const msg of messages) {
        if (!msg.message) continue;

        const msgId = msg.key.id!;
        const from = msg.key.remoteJid!;

        // Skip pesan yang dikirim oleh bot sendiri
        if (this.sentMessageIds.has(msgId)) continue;

        // Hanya proses pesan dari self-chat (kirim ke diri sendiri)
        const myJid = this.socket?.user?.id;
        const myLid = (this.socket?.user as any)?.lid;
        const isSelfChat =
          (myJid && areJidsSameUser(from, myJid)) ||
          (myLid && areJidsSameUser(from, myLid));
        if (!isSelfChat) continue;

        const text = this.extractText(msg);
        if (!text) continue;

        this.logger.log(`📨 Pesan masuk: "${text}"`);

        // Normalisasi from: jika format @lid, ganti dengan JID nomor HP asli
        const myId = this.socket?.user?.id; // contoh: "6282124530097:98@s.whatsapp.net"
        const normalizedFrom = myId
          ? myId.split(':')[0] + '@s.whatsapp.net'
          : from;

        const incoming: IncomingMessage = {
          from: normalizedFrom,
          text,
          pushName: msg.pushName ?? null,
          messageId: msgId,
        };

        await this.queue.add('process-message', incoming, {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
        });
      }
    });
  }

  async sendMessage(to: string, text: string) {
    if (!this.socket) {
      this.logger.error('Socket WA belum terhubung');
      return;
    }
    const result = await this.socket.sendMessage(to, { text });
    if (result?.key?.id) {
      const id = result.key.id;
      this.sentMessageIds.add(id);
      // Bersihkan setelah 30 detik
      setTimeout(() => this.sentMessageIds.delete(id), 30_000);
    }
  }

  private extractText(msg: proto.IWebMessageInfo): string | null {
    return (
      msg.message?.conversation ??
      msg.message?.extendedTextMessage?.text ??
      null
    );
  }

  isConnected(): boolean {
    return this.socket !== null;
  }
}
