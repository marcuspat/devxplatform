import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import DataLoader from 'dataloader';
import { Context } from '../types/context';
import { verifyToken } from '../auth/jwt';

// Example data loader functions
async function batchLoadUsers(ids: readonly string[]): Promise<any[]> {
  // TODO: Implement batch loading from database
  // This is just an example
  return ids.map(id => ({ id, name: `User ${id}` }));
}

export async function createContext({ req, res }: { req: Request; res: Response }): Promise<Context> {
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();
  
  // Extract user from JWT token if present
  let user;
  const authorization = req.headers.authorization;
  if (authorization) {
    const token = authorization.replace('Bearer ', '');
    try {
      user = await verifyToken(token);
    } catch (error) {
      // Invalid token, user remains undefined
    }
  }
  
  // Create data loaders for this request
  const loaders = {
    userLoader: new DataLoader(batchLoadUsers),
    // Add more loaders as needed
  };
  
  return {
    req,
    res,
    user,
    loaders,
    requestId,
  };
}