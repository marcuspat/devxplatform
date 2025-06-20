'use client';

import { useState } from 'react';
import { ServiceCatalog } from '@/components/service-catalog';
import { CostDashboard } from '@/components/cost-dashboard';
import { QuickActions } from '@/components/quick-actions';
import { HealthMonitor } from '@/components/health-monitor';
import { motion } from 'framer-motion';

export default function HomePage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleServiceCreated = () => {
    // Trigger refresh by updating the key
    setRefreshKey(prev => prev + 1);
  };
  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-8"
      >
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
            DevX Platform
          </h1>
          <p className="text-dark-muted text-lg max-w-2xl mx-auto">
            Accelerate your development workflow with self-service infrastructure,
            automated deployments, and real-time monitoring.
          </p>
        </div>

        {/* Quick Actions */}
        <QuickActions onServiceCreated={handleServiceCreated} />

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Service Health */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <HealthMonitor />
          </motion.div>

          {/* Cost Dashboard */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <CostDashboard />
          </motion.div>
        </div>

        {/* Service Catalog */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <ServiceCatalog key={refreshKey} />
        </motion.div>
      </motion.div>
    </div>
  );
}