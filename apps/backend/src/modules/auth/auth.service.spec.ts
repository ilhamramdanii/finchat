import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { OtpService } from './otp.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: { user: { upsert: jest.Mock; findUnique: jest.Mock } };
  let jwt: { sign: jest.Mock };
  let otp: { request: jest.Mock; verify: jest.Mock };

  beforeEach(async () => {
    prisma = {
      user: {
        upsert: jest.fn(),
        findUnique: jest.fn(),
      },
    };
    jwt = { sign: jest.fn() };
    otp = { request: jest.fn(), verify: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
        { provide: OtpService, useValue: otp },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('upserts the user and returns a signed token', async () => {
      const user = { id: 'u1', phone: '628123', name: 'Ilham' };
      prisma.user.upsert.mockResolvedValue(user);
      jwt.sign.mockReturnValue('signed.jwt.token');

      const result = await service.login({ phone: '628123', name: 'Ilham' });

      expect(prisma.user.upsert).toHaveBeenCalledWith({
        where: { phone: '628123' },
        update: {},
        create: { phone: '628123', name: 'Ilham' },
      });
      expect(jwt.sign).toHaveBeenCalledWith({ sub: 'u1', phone: '628123' });
      expect(result).toEqual({ token: 'signed.jwt.token', user });
    });

    it('reuses existing user on repeat login (upsert update path)', async () => {
      const user = { id: 'u1', phone: '628123', name: 'Ilham' };
      prisma.user.upsert.mockResolvedValue(user);
      jwt.sign.mockReturnValue('token');

      const result = await service.login({ phone: '628123', name: 'Ilham' });

      expect(result.user).toBe(user);
      expect(prisma.user.upsert).toHaveBeenCalledTimes(1);
    });
  });

  describe('getProfile', () => {
    it('returns the user by id', async () => {
      const user = { id: 'u1', phone: '628123', name: 'Ilham' };
      prisma.user.findUnique.mockResolvedValue(user);

      const result = await service.getProfile('u1');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'u1' } });
      expect(result).toBe(user);
    });

    it('returns null when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      expect(await service.getProfile('nope')).toBeNull();
    });
  });

  describe('verifyOtp', () => {
    it('issues token on valid OTP (single-use)', async () => {
      const user = { id: 'u1', phone: '628123', name: 'Ilham' };
      otp.verify.mockReturnValue(true);
      prisma.user.upsert.mockResolvedValue(user);
      jwt.sign.mockReturnValue('otp.jwt.token');

      const result = await service.verifyOtp('628123', '123456', 'Ilham');
      expect(otp.verify).toHaveBeenCalledWith('628123', '123456');
      expect(result).toEqual({ token: 'otp.jwt.token', user });
    });

    it('rejects invalid OTP', async () => {
      otp.verify.mockReturnValue(false);
      await expect(service.verifyOtp('628123', '000000')).rejects.toThrow();
      expect(prisma.user.upsert).not.toHaveBeenCalled();
    });
  });
});
