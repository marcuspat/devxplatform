import { ObjectType, Field, Int, ArgsType, ClassType } from 'type-graphql';
import { Min, Max } from 'class-validator';

@ArgsType()
export class PaginationArgs {
  @Field(() => Int, { defaultValue: 0 })
  @Min(0)
  offset: number = 0;

  @Field(() => Int, { defaultValue: 10 })
  @Min(1)
  @Max(100)
  limit: number = 10;
}

export function PaginatedResponse<T>(ItemClass: ClassType<T>) {
  @ObjectType({ isAbstract: true })
  abstract class PaginatedResponseClass {
    @Field(() => [ItemClass])
    items: T[];

    @Field(() => Int)
    total: number;

    @Field()
    hasMore: boolean;
  }
  return PaginatedResponseClass;
}

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  hasMore: boolean;
};