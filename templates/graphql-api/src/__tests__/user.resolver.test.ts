import { graphql, GraphQLSchema } from 'graphql';
import { buildSchema } from 'type-graphql';
import { UserResolver } from '../resolvers/user.resolver';
import { Context } from '../types/context';

describe('UserResolver', () => {
  let schema: GraphQLSchema;

  beforeAll(async () => {
    schema = await buildSchema({
      resolvers: [UserResolver],
      authChecker: () => true, // Allow all for testing
      validate: false,
    });
  });

  const mockContext: Context = {
    req: {} as any,
    res: {} as any,
    requestId: 'test-id',
    loaders: {
      userLoader: {
        load: jest.fn().mockResolvedValue({ id: '1', name: 'Test User' }),
      } as any,
    },
  };

  describe('Query: users', () => {
    it('should return a list of users', async () => {
      const query = `
        query {
          users(limit: 10, offset: 0) {
            items {
              id
              email
              username
            }
            total
            hasMore
          }
        }
      `;

      const result = await graphql({
        schema,
        source: query,
        contextValue: mockContext,
      });

      expect(result.errors).toBeUndefined();
      expect(result.data?.users).toBeDefined();
      expect((result.data as any)?.users.items).toBeInstanceOf(Array);
    });
  });

  describe('Mutation: register', () => {
    it('should create a new user', async () => {
      const mutation = `
        mutation {
          register(input: {
            email: "test@example.com"
            username: "testuser"
            firstName: "Test"
            lastName: "User"
            password: "password123"
          }) {
            user {
              id
              email
              username
            }
            token
          }
        }
      `;

      const result = await graphql({
        schema,
        source: mutation,
        contextValue: mockContext,
      });

      expect(result.errors).toBeUndefined();
      expect(result.data?.register).toBeDefined();
      expect((result.data as any)?.register.user.email).toBe('test@example.com');
      expect((result.data as any)?.register.token).toBeTruthy();
    });
  });
});