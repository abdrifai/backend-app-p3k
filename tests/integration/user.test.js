import request from 'supertest';
import app from '../../src/app.js';
import prisma from '../../src/config/database.js';

describe('User Module API', () => {
  const testUser = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123',
    namaLengkap: 'Test User'
  };

  beforeAll(async () => {
    // Clear test cases from db
    await prisma.user.deleteMany({
      where: { email: testUser.email }
    });
  });

  afterAll(async () => {
    // Clean up
    await prisma.user.deleteMany({
      where: { email: testUser.email }
    });
    await prisma.$disconnect();
  });

  describe('POST /api/users/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/users/register')
        .send(testUser);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe(testUser.email);
    });

    it('should return 400 if validation fails', async () => {
      const response = await request(app)
        .post('/api/users/register')
        .send({
          email: 'invalidemail'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/users/login', () => {
    it('should login a user successfully', async () => {
      const response = await request(app)
        .post('/api/users/login')
        .send({
          username: testUser.username,
          password: testUser.password
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('should return 401 for invalid credentials', async () => {
      const response = await request(app)
        .post('/api/users/login')
        .send({
          username: testUser.username,
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});
