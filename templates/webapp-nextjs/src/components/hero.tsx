import Link from 'next/link';
import { ArrowRight, GitHub, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Hero() {
  return (
    <section className="container flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center text-center">
      <div className="mx-auto max-w-4xl">
        {/* Badge */}
        <div className="mb-8 inline-flex items-center rounded-full border px-3 py-1 text-sm">
          <Star className="mr-2 h-4 w-4" />
          Production-ready template
        </div>

        {/* Heading */}
        <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-6xl">
          Build faster with{' '}
          <span className="text-primary">Next.js</span>
        </h1>

        {/* Description */}
        <p className="mb-8 text-xl text-muted-foreground sm:text-2xl">
          A modern, production-ready Next.js template with TypeScript, Tailwind CSS,
          and all the tools you need to ship fast.
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Button size="lg" asChild>
            <Link href="/get-started">
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="https://github.com" target="_blank">
              <GitHub className="mr-2 h-4 w-4" />
              View on GitHub
            </Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-3 gap-8 border-t pt-8">
          <div>
            <div className="text-2xl font-bold">100%</div>
            <div className="text-sm text-muted-foreground">TypeScript</div>
          </div>
          <div>
            <div className="text-2xl font-bold">A11y</div>
            <div className="text-sm text-muted-foreground">Accessible</div>
          </div>
          <div>
            <div className="text-2xl font-bold">SEO</div>
            <div className="text-sm text-muted-foreground">Optimized</div>
          </div>
        </div>
      </div>
    </section>
  );
}