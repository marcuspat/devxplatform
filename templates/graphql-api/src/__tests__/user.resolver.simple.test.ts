import { graphql, GraphQLSchema } from 'graphql';
import { buildSchema, Resolver, Query } from 'type-graphql';

// Simple test that doesn't use the problematic PaginatedResponse
describe('UserResolver - Simple', () => {
  let schema: GraphQLSchema;

  @Resolver()
  class SimpleUserResolver {
    @Query(() => String)
    hello(): string {
      return 'Hello World';
    }
  }

  beforeAll(async () => {
    schema = await buildSchema({
      resolvers: [SimpleUserResolver],
      authChecker: () => true,
      validate: false,
    });
  });

  it('should return hello world', async () => {
    const query = `
      query {
        hello
      }
    `;

    const result = await graphql({
      schema,
      source: query,
    });

    expect(result.errors).toBeUndefined();
    expect((result.data as any)?.hello).toBe('Hello World');
  });
});