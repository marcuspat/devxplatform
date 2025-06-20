'use client';

import { ServiceCatalog } from '@/components/service-catalog';
// import { DependencyGraph } from '@/components/dependency-graph'; // Temporarily disabled for build
import { motion } from 'framer-motion';

export default function ServicesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-8"
      >
        <div>
          <h1 className="text-3xl font-bold mb-2">Services</h1>
          <p className="text-dark-muted">
            Manage and monitor all your deployed services
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div>
            <ServiceCatalog />
          </div>
          {/* <div>
            <DependencyGraph />
          </div> */}
        </div>
      </motion.div>
    </div>
  );
}