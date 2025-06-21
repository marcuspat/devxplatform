import { Router, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { validateRequest } from '../../middleware/validate-request';
import { userSchemas } from '../../schemas/user.schema';
import { AppError } from '../../middleware/error-handler';
import { User, CreateUserDto, UpdateUserDto } from '../../types/user.types';

// Extended Request types for better type safety
interface CreateUserRequest extends Request {
  body: CreateUserDto;
}

interface UpdateUserRequest extends Request {
  body: UpdateUserDto;
  params: {
    id: string;
  };
}

export const usersRouter = Router();

// Example in-memory storage (replace with actual database)
const users = new Map<string, User>();

// GET /users - List all users
usersRouter.get('/', (req: Request, res: Response) => {
  const { page = 1, limit = 10 } = req.query;
  
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
});

// GET /users/:id - Get user by ID
usersRouter.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const user = users.get(id);
  
  if (!user) {
    throw new AppError('User not found', StatusCodes.NOT_FOUND, 'USER_NOT_FOUND');
  }
  
  res.json({ data: user });
});

// POST /users - Create new user
usersRouter.post('/', 
  validateRequest(userSchemas.create),
  (req: CreateUserRequest, res: Response) => {
    const userData: CreateUserDto = req.body;
    const id = Date.now().toString(); // Simple ID generation
    
    const newUser: User = {
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
  }
);

// PUT /users/:id - Update user
usersRouter.put('/:id',
  validateRequest(userSchemas.update),
  (req: UpdateUserRequest, res: Response) => {
    const { id } = req.params;
    const existingUser = users.get(id);
    
    if (!existingUser) {
      throw new AppError('User not found', StatusCodes.NOT_FOUND, 'USER_NOT_FOUND');
    }
    
    const updateData: UpdateUserDto = req.body;
    const updatedUser: User = {
      ...existingUser,
      ...updateData,
      id, // Ensure ID doesn't change
      updatedAt: new Date().toISOString(),
    };
    
    users.set(id, updatedUser);
    
    res.json({
      data: updatedUser,
      message: 'User updated successfully',
    });
  }
);

// DELETE /users/:id - Delete user
usersRouter.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  
  if (!users.has(id)) {
    throw new AppError('User not found', StatusCodes.NOT_FOUND, 'USER_NOT_FOUND');
  }
  
  users.delete(id);
  
  res.status(StatusCodes.NO_CONTENT).send();
});