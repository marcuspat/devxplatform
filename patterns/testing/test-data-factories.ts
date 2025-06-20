import { faker } from '@faker-js/faker';
import { v4 as uuidv4 } from 'uuid';

/**
 * Base factory class for creating test data
 */
export abstract class BaseFactory<T> {
  protected sequence = 0;

  /**
   * Build a single instance
   */
  abstract build(overrides?: Partial<T>): T;

  /**
   * Build multiple instances
   */
  buildMany(count: number, overrides?: Partial<T>): T[] {
    return Array.from({ length: count }, () => this.build(overrides));
  }

  /**
   * Create and persist a single instance
   */
  async create(overrides?: Partial<T>): Promise<T> {
    const instance = this.build(overrides);
    return this.persist(instance);
  }

  /**
   * Create and persist multiple instances
   */
  async createMany(count: number, overrides?: Partial<T>): Promise<T[]> {
    const instances = this.buildMany(count, overrides);
    return Promise.all(instances.map(instance => this.persist(instance)));
  }

  /**
   * Override to implement persistence
   */
  protected async persist(instance: T): Promise<T> {
    // Override in subclasses if persistence is needed
    return instance;
  }

  /**
   * Get next sequence number
   */
  protected nextSequence(): number {
    return ++this.sequence;
  }

  /**
   * Reset sequence counter
   */
  resetSequence(): void {
    this.sequence = 0;
  }
}

/**
 * User factory
 */
export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  fullName: string;
  avatar: string;
  bio: string;
  dateOfBirth: Date;
  phoneNumber: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };
  isActive: boolean;
  emailVerified: boolean;
  roles: string[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export class UserFactory extends BaseFactory<User> {
  build(overrides?: Partial<User>): User {
    const sequence = this.nextSequence();
    const firstName = overrides?.firstName || faker.person.firstName();
    const lastName = overrides?.lastName || faker.person.lastName();
    
    return {
      id: uuidv4(),
      email: faker.internet.email({ firstName, lastName }).toLowerCase(),
      username: faker.internet.userName({ firstName, lastName }).toLowerCase(),
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`,
      avatar: faker.image.avatar(),
      bio: faker.person.bio(),
      dateOfBirth: faker.date.birthdate({ min: 18, max: 65, mode: 'age' }),
      phoneNumber: faker.phone.number(),
      address: {
        street: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state(),
        country: faker.location.country(),
        zipCode: faker.location.zipCode()
      },
      isActive: true,
      emailVerified: faker.datatype.boolean({ probability: 0.8 }),
      roles: ['user'],
      metadata: {},
      createdAt: faker.date.recent({ days: 30 }),
      updatedAt: faker.date.recent({ days: 7 }),
      ...overrides
    };
  }

  buildAdmin(overrides?: Partial<User>): User {
    return this.build({
      roles: ['user', 'admin'],
      emailVerified: true,
      ...overrides
    });
  }

  buildInactive(overrides?: Partial<User>): User {
    return this.build({
      isActive: false,
      ...overrides
    });
  }
}

/**
 * Product factory
 */
export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  subcategory: string;
  brand: string;
  price: number;
  compareAtPrice: number;
  cost: number;
  currency: string;
  weight: number;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  images: string[];
  tags: string[];
  inStock: boolean;
  inventory: number;
  lowStockThreshold: number;
  attributes: Record<string, any>;
  rating: number;
  reviewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export class ProductFactory extends BaseFactory<Product> {
  build(overrides?: Partial<Product>): Product {
    const price = faker.commerce.price({ min: 10, max: 1000 });
    const compareAtPrice = faker.commerce.price({ 
      min: Number(price) * 1.2, 
      max: Number(price) * 2 
    });
    
    return {
      id: uuidv4(),
      sku: `SKU-${faker.string.alphanumeric(8).toUpperCase()}`,
      name: faker.commerce.productName(),
      description: faker.commerce.productDescription(),
      category: faker.commerce.department(),
      subcategory: faker.commerce.product(),
      brand: faker.company.name(),
      price: Number(price),
      compareAtPrice: Number(compareAtPrice),
      cost: Number(price) * 0.6,
      currency: 'USD',
      weight: faker.number.float({ min: 0.1, max: 50, precision: 0.1 }),
      dimensions: {
        length: faker.number.float({ min: 1, max: 100, precision: 0.1 }),
        width: faker.number.float({ min: 1, max: 100, precision: 0.1 }),
        height: faker.number.float({ min: 1, max: 100, precision: 0.1 })
      },
      images: Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, 
        () => faker.image.url()),
      tags: faker.helpers.arrayElements(
        ['new', 'sale', 'featured', 'popular', 'limited', 'exclusive'],
        faker.number.int({ min: 0, max: 3 })
      ),
      inStock: faker.datatype.boolean({ probability: 0.8 }),
      inventory: faker.number.int({ min: 0, max: 1000 }),
      lowStockThreshold: 10,
      attributes: {},
      rating: faker.number.float({ min: 3, max: 5, precision: 0.1 }),
      reviewCount: faker.number.int({ min: 0, max: 500 }),
      createdAt: faker.date.recent({ days: 90 }),
      updatedAt: faker.date.recent({ days: 30 }),
      ...overrides
    };
  }

  buildOutOfStock(overrides?: Partial<Product>): Product {
    return this.build({
      inStock: false,
      inventory: 0,
      ...overrides
    });
  }

  buildOnSale(overrides?: Partial<Product>): Product {
    const baseProduct = this.build(overrides);
    return {
      ...baseProduct,
      price: baseProduct.compareAtPrice * 0.7,
      tags: [...baseProduct.tags, 'sale']
    };
  }
}

/**
 * Order factory
 */
export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  items: OrderItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  currency: string;
  paymentMethod: string;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  shippingAddress: {
    name: string;
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };
  billingAddress: {
    name: string;
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };
  trackingNumber?: string;
  notes?: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  productId: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  total: number;
}

export class OrderFactory extends BaseFactory<Order> {
  constructor(private productFactory = new ProductFactory()) {
    super();
  }

  build(overrides?: Partial<Order>): Order {
    const items = overrides?.items || this.buildOrderItems(faker.number.int({ min: 1, max: 5 }));
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const tax = subtotal * 0.08;
    const shipping = subtotal > 100 ? 0 : 10;
    const discount = faker.datatype.boolean({ probability: 0.3 }) ? subtotal * 0.1 : 0;
    const total = subtotal + tax + shipping - discount;
    
    const address = {
      name: faker.person.fullName(),
      street: faker.location.streetAddress(),
      city: faker.location.city(),
      state: faker.location.state(),
      country: faker.location.country(),
      zipCode: faker.location.zipCode()
    };
    
    return {
      id: uuidv4(),
      orderNumber: `ORD-${faker.string.numeric(8)}`,
      userId: uuidv4(),
      status: faker.helpers.arrayElement(['pending', 'processing', 'shipped', 'delivered']),
      items,
      subtotal: Math.round(subtotal * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      shipping: Math.round(shipping * 100) / 100,
      discount: Math.round(discount * 100) / 100,
      total: Math.round(total * 100) / 100,
      currency: 'USD',
      paymentMethod: faker.helpers.arrayElement(['card', 'paypal', 'stripe']),
      paymentStatus: 'paid',
      shippingAddress: address,
      billingAddress: faker.datatype.boolean({ probability: 0.7 }) ? address : {
        name: faker.person.fullName(),
        street: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state(),
        country: faker.location.country(),
        zipCode: faker.location.zipCode()
      },
      trackingNumber: faker.helpers.maybe(() => faker.string.alphanumeric(16).toUpperCase()),
      notes: faker.helpers.maybe(() => faker.lorem.sentence()),
      metadata: {},
      createdAt: faker.date.recent({ days: 30 }),
      updatedAt: faker.date.recent({ days: 7 }),
      ...overrides
    };
  }

  private buildOrderItems(count: number): OrderItem[] {
    return Array.from({ length: count }, () => {
      const product = this.productFactory.build();
      const quantity = faker.number.int({ min: 1, max: 5 });
      
      return {
        productId: product.id,
        name: product.name,
        sku: product.sku,
        price: product.price,
        quantity,
        total: Math.round(product.price * quantity * 100) / 100
      };
    });
  }

  buildPending(overrides?: Partial<Order>): Order {
    return this.build({
      status: 'pending',
      paymentStatus: 'pending',
      ...overrides
    });
  }

  buildCancelled(overrides?: Partial<Order>): Order {
    return this.build({
      status: 'cancelled',
      paymentStatus: 'refunded',
      ...overrides
    });
  }
}

/**
 * Factory registry for managing all factories
 */
export class FactoryRegistry {
  private static instance: FactoryRegistry;
  private factories = new Map<string, BaseFactory<any>>();

  private constructor() {
    // Register default factories
    this.register('user', new UserFactory());
    this.register('product', new ProductFactory());
    this.register('order', new OrderFactory());
  }

  static getInstance(): FactoryRegistry {
    if (!this.instance) {
      this.instance = new FactoryRegistry();
    }
    return this.instance;
  }

  register<T>(name: string, factory: BaseFactory<T>): void {
    this.factories.set(name, factory);
  }

  get<T>(name: string): BaseFactory<T> {
    const factory = this.factories.get(name);
    if (!factory) {
      throw new Error(`Factory '${name}' not found`);
    }
    return factory;
  }

  resetAll(): void {
    this.factories.forEach(factory => factory.resetSequence());
  }
}

/**
 * Helper functions for easy factory access
 */
export const factory = {
  user: new UserFactory(),
  product: new ProductFactory(),
  order: new OrderFactory()
};

/**
 * State builder for complex test scenarios
 */
export class TestStateBuilder {
  private users: User[] = [];
  private products: Product[] = [];
  private orders: Order[] = [];

  withUsers(count: number, overrides?: Partial<User>): this {
    this.users = factory.user.buildMany(count, overrides);
    return this;
  }

  withProducts(count: number, overrides?: Partial<Product>): this {
    this.products = factory.product.buildMany(count, overrides);
    return this;
  }

  withOrders(count: number, overrides?: Partial<Order>): this {
    if (this.users.length === 0) {
      throw new Error('Must have users before creating orders');
    }
    
    this.orders = factory.order.buildMany(count, {
      userId: faker.helpers.arrayElement(this.users).id,
      ...overrides
    });
    return this;
  }

  build() {
    return {
      users: this.users,
      products: this.products,
      orders: this.orders
    };
  }

  async persist(persistFn: (state: any) => Promise<void>) {
    const state = this.build();
    await persistFn(state);
    return state;
  }
}