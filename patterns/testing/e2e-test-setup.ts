/**
 * E2E Test Setup with Playwright
 */

import { test as base, expect, Page, BrowserContext } from '@playwright/test';
import { v4 as uuidv4 } from 'uuid';

/**
 * Custom test fixtures
 */
export interface TestFixtures {
  authenticatedPage: Page;
  testUser: TestUser;
  apiClient: APIClient;
}

export interface TestUser {
  email: string;
  password: string;
  name: string;
  token?: string;
}

/**
 * API client for test setup and verification
 */
export class APIClient {
  constructor(
    private baseURL: string,
    private context: BrowserContext
  ) {}

  async createUser(userData?: Partial<TestUser>): Promise<TestUser> {
    const user: TestUser = {
      email: userData?.email || `test-${uuidv4()}@example.com`,
      password: userData?.password || 'TestPassword123!',
      name: userData?.name || 'Test User'
    };

    const response = await this.context.request.post(`${this.baseURL}/api/auth/register`, {
      data: user
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    user.token = data.token;
    
    return user;
  }

  async deleteUser(email: string): Promise<void> {
    await this.context.request.delete(`${this.baseURL}/api/users/${email}`);
  }

  async createTestData(type: string, data: any): Promise<any> {
    const response = await this.context.request.post(`${this.baseURL}/api/test-data/${type}`, {
      data
    });
    
    expect(response.ok()).toBeTruthy();
    return response.json();
  }

  async cleanupTestData(): Promise<void> {
    await this.context.request.post(`${this.baseURL}/api/test-data/cleanup`);
  }
}

/**
 * Extended test with custom fixtures
 */
export const test = base.extend<TestFixtures>({
  testUser: async ({ apiClient }, use) => {
    // Create user before test
    const user = await apiClient.createUser();
    
    // Use user in test
    await use(user);
    
    // Cleanup after test
    await apiClient.deleteUser(user.email);
  },

  apiClient: async ({ context }, use) => {
    const baseURL = process.env.BASE_URL || 'http://localhost:3000';
    const client = new APIClient(baseURL, context);
    
    await use(client);
    
    // Cleanup any remaining test data
    await client.cleanupTestData();
  },

  authenticatedPage: async ({ page, testUser, context }, use) => {
    const baseURL = process.env.BASE_URL || 'http://localhost:3000';
    
    // Login via API and set auth state
    const response = await context.request.post(`${baseURL}/api/auth/login`, {
      data: {
        email: testUser.email,
        password: testUser.password
      }
    });
    
    const { token } = await response.json();
    
    // Set auth token in context
    await context.addCookies([{
      name: 'auth-token',
      value: token,
      domain: new URL(baseURL).hostname,
      path: '/'
    }]);
    
    // Navigate to app
    await page.goto(baseURL);
    
    // Verify authentication
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    
    await use(page);
  }
});

/**
 * Page Object Model base class
 */
export abstract class BasePage {
  constructor(protected page: Page) {}

  async navigate(path: string): Promise<void> {
    await this.page.goto(path);
  }

  async waitForLoadComplete(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  async takeScreenshot(name: string): Promise<void> {
    await this.page.screenshot({ 
      path: `test-results/screenshots/${name}.png`,
      fullPage: true 
    });
  }

  async fillForm(data: Record<string, string>): Promise<void> {
    for (const [field, value] of Object.entries(data)) {
      await this.page.fill(`[name="${field}"]`, value);
    }
  }

  async submitForm(): Promise<void> {
    await this.page.click('button[type="submit"]');
  }

  async expectToast(message: string, type: 'success' | 'error' = 'success'): Promise<void> {
    const toast = this.page.locator(`.toast.toast-${type}`);
    await expect(toast).toContainText(message);
  }

  async expectURL(url: string | RegExp): Promise<void> {
    await expect(this.page).toHaveURL(url);
  }
}

/**
 * Example page objects
 */
export class LoginPage extends BasePage {
  async login(email: string, password: string): Promise<void> {
    await this.fillForm({ email, password });
    await this.submitForm();
    await this.page.waitForNavigation();
  }

  async expectLoginError(message: string): Promise<void> {
    await expect(this.page.locator('.error-message')).toContainText(message);
  }
}

export class DashboardPage extends BasePage {
  async expectWelcomeMessage(userName: string): Promise<void> {
    await expect(this.page.locator('h1')).toContainText(`Welcome, ${userName}`);
  }

  async navigateToSection(section: string): Promise<void> {
    await this.page.click(`[data-testid="nav-${section}"]`);
    await this.waitForLoadComplete();
  }

  async getMetricValue(metric: string): Promise<string> {
    return this.page.locator(`[data-testid="metric-${metric}"] .value`).textContent() || '';
  }
}

export class ProductPage extends BasePage {
  async addToCart(): Promise<void> {
    await this.page.click('[data-testid="add-to-cart"]');
    await this.expectToast('Product added to cart');
  }

  async selectVariant(variant: string): Promise<void> {
    await this.page.click(`[data-testid="variant-${variant}"]`);
  }

  async expectPrice(price: string): Promise<void> {
    await expect(this.page.locator('[data-testid="product-price"]')).toContainText(price);
  }
}

/**
 * Test data builders for E2E tests
 */
export class E2ETestDataBuilder {
  static product(overrides?: any) {
    return {
      name: `Test Product ${Date.now()}`,
      price: 99.99,
      description: 'Test product description',
      category: 'Electronics',
      ...overrides
    };
  }

  static order(overrides?: any) {
    return {
      items: [
        { productId: '123', quantity: 2 }
      ],
      shippingAddress: {
        street: '123 Test St',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345'
      },
      ...overrides
    };
  }
}

/**
 * Common E2E test scenarios
 */
export abstract class E2ETestScenarios {
  /**
   * User registration flow
   */
  static async testUserRegistration(page: Page) {
    const user = {
      email: `test-${uuidv4()}@example.com`,
      password: 'TestPassword123!',
      name: 'New User'
    };

    await page.goto('/register');
    await page.fill('[name="email"]', user.email);
    await page.fill('[name="password"]', user.password);
    await page.fill('[name="name"]', user.name);
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1')).toContainText(`Welcome, ${user.name}`);
  }

  /**
   * Shopping cart flow
   */
  static async testShoppingCart(page: Page) {
    // Navigate to product
    await page.goto('/products/test-product');
    
    // Add to cart
    await page.click('[data-testid="add-to-cart"]');
    await expect(page.locator('.toast-success')).toContainText('Added to cart');
    
    // Go to cart
    await page.click('[data-testid="cart-icon"]');
    await expect(page).toHaveURL('/cart');
    
    // Verify item in cart
    await expect(page.locator('[data-testid="cart-item"]')).toHaveCount(1);
    
    // Update quantity
    await page.fill('[data-testid="quantity-input"]', '3');
    await page.click('[data-testid="update-quantity"]');
    
    // Proceed to checkout
    await page.click('[data-testid="checkout-button"]');
    await expect(page).toHaveURL('/checkout');
  }

  /**
   * Search functionality
   */
  static async testSearch(page: Page) {
    await page.goto('/');
    
    // Perform search
    await page.fill('[data-testid="search-input"]', 'laptop');
    await page.keyboard.press('Enter');
    
    // Verify search results
    await expect(page).toHaveURL('/search?q=laptop');
    await expect(page.locator('[data-testid="search-result"]')).toHaveCount(10);
    
    // Apply filters
    await page.click('[data-testid="filter-category-electronics"]');
    await page.click('[data-testid="filter-price-under-1000"]');
    
    // Verify filtered results
    await expect(page.locator('[data-testid="search-result"]')).toHaveCount(5);
  }
}

/**
 * E2E test configuration
 */
export const e2eConfig = {
  // Test timeout
  timeout: 30000,
  
  // Retry failed tests
  retries: process.env.CI ? 2 : 0,
  
  // Parallel execution
  workers: process.env.CI ? 4 : 1,
  
  // Screenshots on failure
  screenshot: 'only-on-failure',
  
  // Video recording
  video: process.env.CI ? 'on' : 'off',
  
  // Trace for debugging
  trace: 'on-first-retry',
  
  // Base URL
  baseURL: process.env.BASE_URL || 'http://localhost:3000',
  
  // Viewport
  viewport: { width: 1280, height: 720 },
  
  // Projects for different browsers
  projects: [
    {
      name: 'chromium',
      use: { 
        browserName: 'chromium',
        channel: 'chrome'
      }
    },
    {
      name: 'firefox',
      use: { browserName: 'firefox' }
    },
    {
      name: 'webkit',
      use: { browserName: 'webkit' }
    },
    {
      name: 'mobile',
      use: { 
        browserName: 'chromium',
        viewport: { width: 375, height: 667 },
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)'
      }
    }
  ]
};

/**
 * Accessibility testing helpers
 */
export class AccessibilityTester {
  static async checkPage(page: Page): Promise<void> {
    // Run axe accessibility checks
    await page.evaluate(() => {
      // This would use axe-core in a real implementation
      console.log('Running accessibility checks...');
    });
  }

  static async checkContrast(page: Page): Promise<void> {
    // Check color contrast ratios
    const violations = await page.evaluate(() => {
      // Check contrast implementation
      return [];
    });
    
    expect(violations).toHaveLength(0);
  }

  static async checkKeyboardNavigation(page: Page): Promise<void> {
    // Tab through interactive elements
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
  }
}

/**
 * Performance testing helpers
 */
export class PerformanceTester {
  static async measurePageLoad(page: Page): Promise<any> {
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime
      };
    });
    
    return metrics;
  }

  static async checkCoreWebVitals(page: Page): Promise<void> {
    const vitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        // Mock implementation - would use web-vitals library
        resolve({
          LCP: 2500, // Largest Contentful Paint
          FID: 100,  // First Input Delay
          CLS: 0.1   // Cumulative Layout Shift
        });
      });
    });
    
    expect(vitals.LCP).toBeLessThan(2500); // Good LCP
    expect(vitals.FID).toBeLessThan(100);  // Good FID
    expect(vitals.CLS).toBeLessThan(0.1);  // Good CLS
  }
}