export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  password?: string; // Excluded from responses
  role: 'user' | 'admin';
  createdAt: string;
  updatedAt: string;
}

export type CreateUserDto = Omit<User, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateUserDto = Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>;