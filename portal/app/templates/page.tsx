'use client';

import { useState } from 'react';
import { TemplateMarketplace } from '@/components/template-marketplace';
import { motion } from 'framer-motion';

export default function TemplatesPage() {
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
        <div>
          <h1 className="text-3xl font-bold mb-2">Template Marketplace</h1>
          <p className="text-dark-muted">
            Browse and deploy pre-built service templates
          </p>
        </div>

        <TemplateMarketplace onServiceCreated={handleServiceCreated} />
      </motion.div>
    </div>
  );
}