import { AuthService } from '../../modules/auth/auth.service';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };
  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  };
});

jest.mock('bcrypt');
jest.mock('jsonwebtoken');

const { PrismaClient } = require('@prisma/client');
const mockPrisma = new PrismaClient();

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      const input = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
      mockPrisma.user.create.mockResolvedValue({
        id: 'user123',
        name: 'John Doe',
        email: 'john@example.com',
        password: 'hashed_password',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      (jwt.sign as jest.Mock).mockReturnValue('mock_token');

      const result = await authService.register(input);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: input.email },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(input.password, 10);
      expect(result.user).not.toHaveProperty('password');
      expect(result.token).toBe('mock_token');
    });

    it('should throw error if email already exists', async () => {
      const input = {
        name: 'John Doe',
        email: 'existing@example.com',
        password: 'password123',
      };

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'existing_user',
        email: 'existing@example.com',
      });

      await expect(authService.register(input)).rejects.toThrow('EMAIL_EXISTS');
    });
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const input = {
        email: 'john@example.com',
        password: 'password123',
      };

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user123',
        name: 'John Doe',
        email: 'john@example.com',
        password: 'hashed_password',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock).mockReturnValue('mock_token');

      const result = await authService.login(input);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: input.email },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(input.password, 'hashed_password');
      expect(result.user).not.toHaveProperty('password');
      expect(result.token).toBe('mock_token');
    });

    it('should throw error if user not found', async () => {
      const input = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(authService.login(input)).rejects.toThrow('INVALID_CREDENTIALS');
    });

    it('should throw error if password is incorrect', async () => {
      const input = {
        email: 'john@example.com',
        password: 'wrong_password',
      };

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user123',
        email: 'john@example.com',
        password: 'hashed_password',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(authService.login(input)).rejects.toThrow('INVALID_CREDENTIALS');
    });
  });
});
