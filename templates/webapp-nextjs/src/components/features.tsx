import {
  Zap,
  Shield,
  Palette,
  Code,
  Globe,
  Smartphone,
  Database,
  BarChart3,
} from 'lucide-react';

const features = [
  {
    name: 'Lightning Fast',
    description: 'Optimized for performance with Next.js 14 and modern web standards.',
    icon: Zap,
  },
  {
    name: 'Secure by Default',
    description: 'Built-in security features and best practices to keep your app safe.',
    icon: Shield,
  },
  {
    name: 'Beautiful UI',
    description: 'Carefully crafted components with Tailwind CSS and Radix UI.',
    icon: Palette,
  },
  {
    name: 'TypeScript First',
    description: 'Full type safety throughout your application for better developer experience.',
    icon: Code,
  },
  {
    name: 'SEO Optimized',
    description: 'Server-side rendering and meta tags for better search engine visibility.',
    icon: Globe,
  },
  {
    name: 'Mobile Ready',
    description: 'Responsive design that works perfectly on all device sizes.',
    icon: Smartphone,
  },
  {
    name: 'Database Ready',
    description: 'Prisma ORM integration for type-safe database operations.',
    icon: Database,
  },
  {
    name: 'Analytics Built-in',
    description: 'Ready for analytics integration to track your app performance.',
    icon: BarChart3,
  },
];

export function Features() {
  return (
    <section className="bg-muted/50 py-24">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need to build
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            A complete toolkit for modern web development with best practices
            baked in.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div
              key={feature.name}
              className="rounded-lg border bg-background p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <feature.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">{feature.name}</h3>
              <p className="text-sm text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}