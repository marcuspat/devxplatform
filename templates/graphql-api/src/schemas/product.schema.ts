import { ObjectType, Field, ID, InputType, Float } from 'type-graphql';
import { IsOptional, Length, Min } from 'class-validator';

@ObjectType()
export class Product {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  description: string;

  @Field(() => Float)
  price: number;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

@InputType()
export class CreateProductInput {
  @Field()
  @Length(1, 100)
  name: string;

  @Field()
  @Length(1, 1000)
  description: string;

  @Field(() => Float)
  @Min(0)
  price: number;
}

@InputType()
export class UpdateProductInput {
  @Field({ nullable: true })
  @IsOptional()
  @Length(1, 100)
  name?: string;

  @Field({ nullable: true })
  @IsOptional()
  @Length(1, 1000)
  description?: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @Min(0)
  price?: number;
}