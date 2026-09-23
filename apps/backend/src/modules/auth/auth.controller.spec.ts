import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';

// Stub whatsapp.service: Baileys ESM tidak bisa di-parse Jest.
jest.mock('../whatsapp/whatsapp.service', () => ({
  WhatsappService: jest.fn().mockImplementation(() => ({})),
}));

describe('AuthController', () => {
  let controller: AuthController;
  let auth: { login: jest.Mock; requestOtp: jest.Mock; verifyOtp: jest.Mock };
  let wa: { isConnected: jest.Mock; sendMessage: jest.Mock };
  const OLD_ENV = process.env.NODE_ENV;

  async function build(withWa: boolean) {
    auth = { login: jest.fn(), requestOtp: jest.fn(), verifyOtp: jest.fn() };
    wa = { isConnected: jest.fn(), sendMessage: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: auth },
        ...(withWa ? [{ provide: WhatsappService, useValue: wa }] : []),
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  }

  afterEach(() => {
    process.env.NODE_ENV = OLD_ENV;
  });

  describe('request-otp (dev/test)', () => {
    it('kirim kode via WA bila socket terhubung dan kembalikan devCode', async () => {
      await build(true);
      process.env.NODE_ENV = 'test';
      auth.requestOtp.mockReturnValue({ expiresInSec: 300, devCode: '123456' });
      wa.isConnected.mockReturnValue(true);

      const res = await controller.requestOtp({ phone: '6281234567890' });

      expect(auth.requestOtp).toHaveBeenCalledWith('6281234567890');
      expect(wa.sendMessage).toHaveBeenCalledWith(
        '6281234567890@s.whatsapp.net',
        expect.stringContaining('123456'),
      );
      expect(res).toEqual(expect.objectContaining({ devCode: '123456', expiresInSec: 300 }));
    });

    it('tetap kembalikan devCode tanpa kirim bila socket putus', async () => {
      await build(true);
      process.env.NODE_ENV = 'test';
      auth.requestOtp.mockReturnValue({ expiresInSec: 300, devCode: '654321' });
      wa.isConnected.mockReturnValue(false);

      const res = await controller.requestOtp({ phone: '6281234567890' });

      expect(wa.sendMessage).not.toHaveBeenCalled();
      expect(res).toEqual(expect.objectContaining({ devCode: '654321' }));
    });

    it('telan error kirim WA tanpa gagalkan response', async () => {
      await build(true);
      process.env.NODE_ENV = 'test';
      auth.requestOtp.mockReturnValue({ expiresInSec: 300, devCode: '111111' });
      wa.isConnected.mockReturnValue(true);
      wa.sendMessage.mockRejectedValue(new Error('socket down'));

      const res = await controller.requestOtp({ phone: '6281234567890' });

      expect(res).toEqual(expect.objectContaining({ devCode: '111111' }));
    });

    it('jalan tanpa WhatsappService (optional injection)', async () => {
      await build(false);
      process.env.NODE_ENV = 'test';
      auth.requestOtp.mockReturnValue({ expiresInSec: 300, devCode: '222222' });

      const res = await controller.requestOtp({ phone: '6281234567890' });

      expect(res).toEqual(expect.objectContaining({ devCode: '222222' }));
    });
  });

  describe('request-otp (production)', () => {
    it('sembunyikan devCode dari response', async () => {
      await build(true);
      process.env.NODE_ENV = 'production';
      auth.requestOtp.mockReturnValue({ expiresInSec: 300, devCode: null });

      const res = await controller.requestOtp({ phone: '6281234567890' });

      expect(res).not.toHaveProperty('devCode');
      expect(res).toEqual(expect.objectContaining({ expiresInSec: 300 }));
    });
  });

  describe('verify-otp & login', () => {
    it('teruskan phone/code/name ke service', async () => {
      await build(false);
      auth.verifyOtp.mockResolvedValue({ token: 'tok', user: { id: 'u1' } });

      const res = await controller.verifyOtp({ phone: '6281234567890', code: '123456', name: 'Ilham' });

      expect(auth.verifyOtp).toHaveBeenCalledWith('6281234567890', '123456', 'Ilham');
      expect(res).toEqual({ token: 'tok', user: { id: 'u1' } });
    });

    it('login legacy teruskan dto ke service', async () => {
      await build(false);
      auth.login.mockResolvedValue({ token: 'tok' });

      await controller.login({ phone: '6281234567890' });

      expect(auth.login).toHaveBeenCalledWith({ phone: '6281234567890' });
    });
  });
});
