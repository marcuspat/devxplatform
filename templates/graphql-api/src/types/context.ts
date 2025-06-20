import { Request, Response } from 'express';
import DataLoader from 'dataloader';

export interface Context {
  req: Request;
  res: Response;
  user?: {
    id: string;
    email: string;
    role: string;
  };
  loaders: {
    userLoader: DataLoader<string, any>;
    // Add more data loaders as needed
  };
  requestId: string;
}