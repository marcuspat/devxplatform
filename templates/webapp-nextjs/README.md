# Next.js Webapp Template

A production-ready Next.js 14 template with TypeScript, Tailwind CSS, and comprehensive tooling for modern web development.

## Features

- ✅ **Next.js 14**: Latest features including App Router and Server Components
- ✅ **TypeScript**: Full type safety throughout the application
- ✅ **Tailwind CSS**: Utility-first CSS framework with custom design system
- ✅ **Radix UI**: Accessible, unstyled UI components
- ✅ **Dark Mode**: Built-in theme switching with next-themes
- ✅ **Authentication**: NextAuth.js integration with multiple providers
- ✅ **Database**: Prisma ORM with PostgreSQL
- ✅ **Form Handling**: React Hook Form with Zod validation
- ✅ **Data Fetching**: SWR for client-side data fetching
- ✅ **Testing**: Jest and React Testing Library setup
- ✅ **E2E Testing**: Playwright configuration
- ✅ **Storybook**: Component development and documentation
- ✅ **Linting**: ESLint and Prettier with TypeScript rules
- ✅ **SEO**: Comprehensive meta tags and Open Graph support
- ✅ **PWA Ready**: Service worker and manifest configuration
- ✅ **Docker**: Multi-stage Dockerfile for production deployment
- ✅ **Analytics Ready**: Integration points for GA, PostHog, etc.
- ✅ **Monitoring**: Error tracking setup with Sentry
- ✅ **Performance**: Bundle analyzer and optimization techniques

## Tech Stack

### Core
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI
- **Icons**: Lucide React

### Data & State
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **Client State**: SWR
- **Form Validation**: Zod with React Hook Form

### Development
- **Testing**: Jest + React Testing Library
- **E2E Testing**: Playwright
- **Storybook**: Component development
- **Linting**: ESLint + Prettier
- **Type Checking**: TypeScript

### Deployment
- **Containerization**: Docker
- **Hosting**: Vercel (recommended) or any Node.js host
- **Database**: PostgreSQL (Supabase, PlanetScale, or self-hosted)
- **Cache**: Redis (optional)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm, yarn, or pnpm
- PostgreSQL database
- Git

### Installation

1. **Clone or download the template**
```bash
git clone <repository-url>
cd webapp-nextjs-template
```

2. **Install dependencies**
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. **Set up environment variables**
```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:
- Database URL
- NextAuth configuration
- OAuth provider credentials
- Any additional services

4. **Set up the database**
```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma db push

# Seed the database (optional)
npx prisma db seed
```

5. **Start the development server**
```bash
npm run dev
```

Visit http://localhost:3000 to see your application.

## Available Scripts

### Development
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

### Testing
- `npm run test` - Run unit tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:e2e` - Run Playwright e2e tests
- `npm run test:e2e:ui` - Run Playwright tests with UI

### Storybook
- `npm run storybook` - Start Storybook development server
- `npm run build-storybook` - Build Storybook for production

### Database
- `npx prisma studio` - Open Prisma Studio
- `npx prisma generate` - Generate Prisma client
- `npx prisma db push` - Push schema changes to database
- `npx prisma migrate dev` - Create and apply migrations

### Quality Assurance
- `npm run validate` - Run all quality checks (lint, type-check, test, build)
- `npm run analyze` - Analyze bundle size

## Project Structure

```
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── globals.css      # Global styles
│   │   ├── layout.tsx       # Root layout
│   │   └── page.tsx         # Home page
│   ├── components/          # React components
│   │   ├── ui/              # Reusable UI components
│   │   ├── navigation.tsx   # Navigation component
│   │   ├── footer.tsx       # Footer component
│   │   └── providers.tsx    # App providers
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Utility libraries
│   ├── types/               # TypeScript type definitions
│   └── utils/               # Utility functions
├── public/                  # Static assets
├── prisma/                  # Database schema and migrations
├── e2e/                     # Playwright e2e tests
├── stories/                 # Storybook stories
├── __tests__/               # Jest unit tests
├── next.config.js           # Next.js configuration
├── tailwind.config.js       # Tailwind CSS configuration
├── tsconfig.json            # TypeScript configuration
└── package.json             # Dependencies and scripts
```

## Configuration

### Environment Variables

Key environment variables to configure:

```bash
# App
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Database
DATABASE_URL="postgresql://..."

# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key

# OAuth Providers
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Analytics
NEXT_PUBLIC_GA_MEASUREMENT_ID=
NEXT_PUBLIC_POSTHOG_KEY=

# Monitoring
SENTRY_DSN=
```

### Tailwind CSS

The template includes a custom design system built on Tailwind CSS:

- **Colors**: CSS variables for light/dark mode
- **Components**: Pre-built UI components with variants
- **Animations**: Custom animations and transitions
- **Responsive**: Mobile-first responsive design

### Database Schema

The template includes a basic Prisma schema with:
- User model for authentication
- Example models for common use cases
- Proper relationships and constraints

Extend the schema in `prisma/schema.prisma` as needed.

## Authentication

NextAuth.js is configured with:
- **Providers**: Google, GitHub (add more as needed)
- **Database**: User data stored in PostgreSQL
- **Sessions**: Database sessions for security
- **Callbacks**: Custom session and JWT callbacks

Add providers in `app/api/auth/[...nextauth]/route.ts`.

## Styling

### Design System

The template includes a comprehensive design system:

```tsx
// Colors
<div className="bg-primary text-primary-foreground" />
<div className="bg-secondary text-secondary-foreground" />

// Components
<Button variant="default" size="lg">Primary Button</Button>
<Button variant="outline" size="sm">Secondary Button</Button>

// Layout
<div className="container mx-auto px-4" />
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" />
```

### Component Library

Built-in components include:
- Button (multiple variants and sizes)
- Form inputs with validation
- Modal dialogs
- Navigation menus
- Cards and layouts
- Toast notifications

## Testing

### Unit Testing

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test -- --coverage
```

Example test:
```tsx
import { render, screen } from '@testing-library/react';
import { Button } from '@/components/ui/button';

test('renders button with text', () => {
  render(<Button>Click me</Button>);
  expect(screen.getByRole('button')).toHaveTextContent('Click me');
});
```

### E2E Testing

```bash
# Run e2e tests
npm run test:e2e

# Run with UI
npm run test:e2e:ui
```

Example e2e test:
```typescript
import { test, expect } from '@playwright/test';

test('homepage has title', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/NextApp/);
});
```

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Configure environment variables
4. Deploy automatically on push

### Docker

```bash
# Build image
docker build -t nextjs-app .

# Run container
docker run -p 3000:3000 nextjs-app
```

### Docker Compose

```bash
# Start all services
docker-compose up

# Production build
docker-compose -f docker-compose.prod.yml up
```

## Performance Optimization

### Bundle Analysis

```bash
npm run analyze
```

### Image Optimization

- Use Next.js `Image` component
- Optimize images at build time
- Serve WebP format when supported

### Caching

- Static assets cached with CDN
- API routes with proper cache headers
- Database query optimization with Prisma

### SEO

- Server-side rendering
- Meta tags and Open Graph
- Sitemap generation
- Structured data markup

## Security

### Best Practices

- Environment variables for secrets
- CSRF protection with NextAuth.js
- SQL injection prevention with Prisma
- XSS protection with React
- Content Security Policy headers

### Authentication

- Secure session management
- OAuth provider integration
- Role-based access control
- Password hashing (if using credentials)

## Monitoring

### Error Tracking

Configure Sentry for error monitoring:
```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
});
```

### Analytics

Integrate analytics providers:
- Google Analytics
- PostHog
- Mixpanel
- Custom tracking

### Performance Monitoring

- Core Web Vitals tracking
- Real user monitoring
- Server-side performance metrics

## Customization

### Adding Components

1. Create component in `src/components/ui/`
2. Add proper TypeScript types
3. Include Storybook story
4. Write unit tests
5. Export from `src/components/ui/index.ts`

### Styling Customization

1. Update `tailwind.config.js` for design tokens
2. Modify CSS variables in `globals.css`
3. Add custom animations and utilities
4. Update component variants

### Adding Features

1. Create feature directory in `src/app/`
2. Add necessary components
3. Update navigation
4. Add tests
5. Update documentation

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Update documentation
6. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

- Documentation: [Link to docs]
- Issues: [GitHub Issues]
- Discussions: [GitHub Discussions]
- Community: [Discord/Slack]

---

Built with ❤️ using modern web technologies