import { Resolver, Query, Mutation, Arg, Authorized } from 'type-graphql';
import { Product, CreateProductInput, UpdateProductInput } from '../schemas/product.schema';

// Example in-memory storage
const products = new Map<string, Product>();

@Resolver(Product)
export class ProductResolver {
  @Query(() => [Product])
  async products(): Promise<Product[]> {
    return Array.from(products.values());
  }

  @Query(() => Product, { nullable: true })
  async product(@Arg('id') id: string): Promise<Product | null> {
    return products.get(id) || null;
  }

  @Authorized()
  @Mutation(() => Product)
  async createProduct(@Arg('input') input: CreateProductInput): Promise<Product> {
    const product = new Product();
    product.id = Date.now().toString();
    product.name = input.name;
    product.description = input.description;
    product.price = input.price;
    product.createdAt = new Date();
    product.updatedAt = new Date();

    products.set(product.id, product);
    return product;
  }

  @Authorized()
  @Mutation(() => Product)
  async updateProduct(
    @Arg('id') id: string,
    @Arg('input') input: UpdateProductInput
  ): Promise<Product> {
    const product = products.get(id);
    if (!product) {
      throw new Error('Product not found');
    }

    if (input.name !== undefined) product.name = input.name;
    if (input.description !== undefined) product.description = input.description;
    if (input.price !== undefined) product.price = input.price;
    product.updatedAt = new Date();

    return product;
  }

  @Authorized('admin')
  @Mutation(() => Boolean)
  async deleteProduct(@Arg('id') id: string): Promise<boolean> {
    return products.delete(id);
  }
}