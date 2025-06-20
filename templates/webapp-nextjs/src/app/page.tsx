import { Hero } from '@/components/hero';
import { Features } from '@/components/features';
import { CTA } from '@/components/cta';

export default function HomePage() {
  return (
    <div className="flex flex-col">
      <Hero />
      <Features />
      <CTA />
    </div>
  );
}