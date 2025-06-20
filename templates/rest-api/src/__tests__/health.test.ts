import request from 'supertest';
import { Express } from 'express';
import { createServer } from '../server';

describe('Health Check Endpoints', () => {
  let app: Express;

  beforeAll(async () => {
    app = await createServer();
  });

  describe('GET /health/live', () => {
    it('should return 200 OK for liveness probe', async () => {
      const response = await request(app)
        .get('/health/live')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('GET /health/ready', () => {
    it('should return 200 OK when service is ready', async () => {
      const response = await request(app)
        .get('/health/ready')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('checks');
    });
  });

  describe('GET /health', () => {
    it('should return detailed health information', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('system');
      expect(response.body.system).toHaveProperty('memory');
      expect(response.body.system).toHaveProperty('cpu');
    });
  });
});