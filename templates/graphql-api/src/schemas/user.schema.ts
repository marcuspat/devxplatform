import { ObjectType, Field, ID, InputType, registerEnumType } from 'type-graphql';
import { IsEmail, Length, IsEnum, IsOptional } from 'class-validator';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

registerEnumType(UserRole, {
  name: 'UserRole',
  description: 'User role enumeration',
});

@ObjectType()
export class User {
  @Field(() => ID)
  id: string;

  @Field()
  email: string;

  @Field()
  username: string;

  @Field()
  firstName: string;

  @Field()
  lastName: string;

  @Field(() => UserRole)
  role: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

@InputType()
export class CreateUserInput {
  @Field()
  @IsEmail()
  email: string;

  @Field()
  @Length(3, 30)
  username: string;

  @Field()
  @Length(1, 50)
  firstName: string;

  @Field()
  @Length(1, 50)
  lastName: string;

  @Field()
  @Length(8, 100)
  password: string;

  @Field(() => UserRole, { nullable: true })
  @IsOptional()
  @IsEnum(UserRole)
  role?: string;
}

@InputType()
export class UpdateUserInput {
  @Field({ nullable: true })
  @IsOptional()
  @Length(3, 30)
  username?: string;

  @Field({ nullable: true })
  @IsOptional()
  @Length(1, 50)
  firstName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @Length(1, 50)
  lastName?: string;
}

@InputType()
export class LoginInput {
  @Field()
  @IsEmail()
  email: string;

  @Field()
  password: string;
}

@ObjectType()
export class AuthResponse {
  @Field(() => User)
  user: User;

  @Field()
  token: string;
}