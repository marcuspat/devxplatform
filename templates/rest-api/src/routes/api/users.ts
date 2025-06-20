import { Router, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { validateRequest } from '../../middleware/validate-request';
import { userSchemas } from '../../schemas/user.schema';
import { AppError } from '../../middleware/error-handler';
import { asyncHandler } from '../../utils/async-handler';

export const usersRouter = Router();

// Example in-memory storage (replace with actual database)
const users = new Map<string, any>();

// GET /users - List all users
usersRouter.get('/', asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 10, sort = 'createdAt', order = 'desc' } = req.query;
  
  const usersList = Array.from(users.values());
  const total = usersList.length;
  
  // Pagination
  const startIndex = (Number(page) - 1) * Number(limit);
  const endIndex = startIndex + Number(limit);
  const paginatedUsers = usersList.slice(startIndex, endIndex);
  
  res.json({
    data: paginatedUsers,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  });
}));

// GET /users/:id - Get user by ID
usersRouter.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = users.get(id);
  
  if (!user) {
    throw new AppError('User not found', StatusCodes.NOT_FOUND, 'USER_NOT_FOUND');
  }
  
  res.json({ data: user });
}));

// POST /users - Create new user
usersRouter.post('/', 
  validateRequest(userSchemas.create),
  asyncHandler(async (req: Request, res: Response) => {
    const userData = req.body;
    const id = Date.now().toString(); // Simple ID generation
    
    const newUser = {
      id,
      ...userData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    users.set(id, newUser);
    
    res.status(StatusCodes.CREATED).json({
      data: newUser,
      message: 'User created successfully',
    });
  })
);

// PUT /users/:id - Update user
usersRouter.put('/:id',
  validateRequest(userSchemas.update),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const existingUser = users.get(id);
    
    if (!existingUser) {
      throw new AppError('User not found', StatusCodes.NOT_FOUND, 'USER_NOT_FOUND');
    }
    
    const updatedUser = {
      ...existingUser,
      ...req.body,
      id, // Ensure ID doesn't change
      updatedAt: new Date().toISOString(),
    };
    
    users.set(id, updatedUser);
    
    res.json({
      data: updatedUser,
      message: 'User updated successfully',
    });
  })
);

// DELETE /users/:id - Delete user
usersRouter.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  if (!users.has(id)) {
    throw new AppError('User not found', StatusCodes.NOT_FOUND, 'USER_NOT_FOUND');
  }
  
  users.delete(id);
  
  res.status(StatusCodes.NO_CONTENT).send();
}));