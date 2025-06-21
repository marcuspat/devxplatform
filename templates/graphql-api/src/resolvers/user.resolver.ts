import {
  Resolver,
  Query,
  Mutation,
  Arg,
  Ctx,
  Authorized,
  FieldResolver,
  Root,
  Args,
} from 'type-graphql';
import { User, CreateUserInput, UpdateUserInput, LoginInput, AuthResponse } from '../schemas/user.schema';
import { Context } from '../types/context';
import { PaginationArgs } from '../schemas/pagination.schema';
import { signToken } from '../auth/jwt';
import { ObjectType, Field, Int } from 'type-graphql';

@ObjectType()
class PaginatedUsers {
  @Field(() => [User])
  items: User[];

  @Field(() => Int)
  total: number;

  @Field()
  hasMore: boolean;
}

// Example in-memory storage (replace with actual database)
const users = new Map<string, User>();

@Resolver(User)
export class UserResolver {
  @Query(() => User, { nullable: true })
  async user(@Arg('id') id: string, @Ctx() ctx: Context): Promise<User | null> {
    // Use DataLoader for efficient batching
    return ctx.loaders.userLoader.load(id);
  }

  @Query(() => PaginatedUsers)
  async users(@Args() { limit, offset }: PaginationArgs): Promise<PaginatedUsers> {
    const allUsers = Array.from(users.values());
    const total = allUsers.length;
    const items = allUsers.slice(offset, offset + limit);

    return {
      items,
      total,
      hasMore: offset + limit < total,
    };
  }

  @Authorized()
  @Query(() => User, { nullable: true })
  async me(@Ctx() ctx: Context): Promise<User | null> {
    if (!ctx.user) return null;
    return users.get(ctx.user.id) || null;
  }

  @Mutation(() => AuthResponse)
  async register(@Arg('input') input: CreateUserInput): Promise<AuthResponse> {
    // Validate input
    if (Array.from(users.values()).some(u => u.email === input.email)) {
      throw new Error('Email already exists');
    }

    // Create user
    const user = new User();
    user.id = Date.now().toString();
    user.email = input.email;
    user.username = input.username;
    user.firstName = input.firstName;
    user.lastName = input.lastName;
    user.role = input.role || 'user';
    user.createdAt = new Date();
    user.updatedAt = new Date();

    // Save user (in real app, hash password and save to DB)
    users.set(user.id, user);

    // Generate token
    const token = await signToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return { user, token };
  }

  @Mutation(() => AuthResponse)
  async login(@Arg('input') input: LoginInput): Promise<AuthResponse> {
    // Find user by email
    const user = Array.from(users.values()).find(u => u.email === input.email);
    
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // In real app, verify password hash
    // For demo, any password works

    // Generate token
    const token = await signToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return { user, token };
  }

  @Authorized()
  @Mutation(() => User)
  async updateProfile(
    @Arg('input') input: UpdateUserInput,
    @Ctx() ctx: Context
  ): Promise<User> {
    if (!ctx.user) {
      throw new Error('Not authenticated');
    }

    const user = users.get(ctx.user.id);
    if (!user) {
      throw new Error('User not found');
    }

    // Update fields
    if (input.username) user.username = input.username;
    if (input.firstName) user.firstName = input.firstName;
    if (input.lastName) user.lastName = input.lastName;
    user.updatedAt = new Date();

    return user;
  }

  @Authorized('admin')
  @Mutation(() => Boolean)
  async deleteUser(@Arg('id') id: string): Promise<boolean> {
    return users.delete(id);
  }

  // Field resolver example
  @FieldResolver(() => String)
  fullName(@Root() user: User): string {
    return `${user.firstName} ${user.lastName}`;
  }
}