import jwt from 'jsonwebtoken';
import { config } from '../config';

interface TokenPayload {
  id: string;
  email: string;
  role: string;
}

export async function signToken(payload: TokenPayload): Promise<string> {
  return jwt.sign(payload, config.auth.jwtSecret, {
    expiresIn: config.auth.jwtExpiry,
  });
}

export async function verifyToken(token: string): Promise<TokenPayload> {
  const decoded = jwt.verify(token, config.auth.jwtSecret) as any;
  return {
    id: decoded.id,
    email: decoded.email,
    role: decoded.role,
  };
}