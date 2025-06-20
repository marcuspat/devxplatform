'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/solid';
import { clsx } from 'clsx';

interface ServiceHealth {
  name: string;
  status: 'healthy' | 'warning' | 'error';
  uptime: number;
  responseTime: number;
  lastChecked: Date;
}

const mockServices: ServiceHealth[] = [
  {
    name: 'API Gateway',
    status: 'healthy',
    uptime: 99.99,
    responseTime: 45,
    lastChecked: new Date(),
  },
  {
    name: 'Database Cluster',
    status: 'healthy',
    uptime: 99.95,
    responseTime: 12,
    lastChecked: new Date(),
  },
  {
    name: 'Message Queue',
    status: 'warning',
    uptime: 98.5,
    responseTime: 230,
    lastChecked: new Date(),
  },
  {
    name: 'Cache Layer',
    status: 'healthy',
    uptime: 99.99,
    responseTime: 3,
    lastChecked: new Date(),
  },
];

export function HealthMonitor() {
  const [services, setServices] = useState(mockServices);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Simulate refresh
    setTimeout(() => {
      setServices([...mockServices]);
      setIsRefreshing(false);
    }, 1000);
  };

  const overallHealth = services.every(s => s.status === 'healthy')
    ? 'healthy'
    : services.some(s => s.status === 'error')
    ? 'error'
    : 'warning';

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold mb-1">Service Health</h2>
          <p className="text-dark-muted">Real-time system status</p>
        </div>
        <button
          onClick={handleRefresh}
          className="p-2 rounded-lg hover:bg-dark-card transition-colors"
          disabled={isRefreshing}
        >
          <ArrowPathIcon className={clsx('w-5 h-5', isRefreshing && 'animate-spin')} />
        </button>
      </div>

      {/* Overall Status */}
      <div className={clsx(
        'rounded-lg p-4 mb-6 flex items-center justify-between',
        overallHealth === 'healthy' && 'bg-green-500/10 border border-green-500/20',
        overallHealth === 'warning' && 'bg-yellow-500/10 border border-yellow-500/20',
        overallHealth === 'error' && 'bg-red-500/10 border border-red-500/20'
      )}>
        <div className="flex items-center gap-3">
          {overallHealth === 'healthy' && <CheckCircleIcon className="w-6 h-6 text-green-400" />}
          {overallHealth === 'warning' && <ExclamationTriangleIcon className="w-6 h-6 text-yellow-400" />}
          {overallHealth === 'error' && <XCircleIcon className="w-6 h-6 text-red-400" />}
          <div>
            <p className="font-semibold">System Status</p>
            <p className={clsx(
              'text-sm',
              overallHealth === 'healthy' && 'text-green-400',
              overallHealth === 'warning' && 'text-yellow-400',
              overallHealth === 'error' && 'text-red-400'
            )}>
              {overallHealth === 'healthy' && 'All systems operational'}
              {overallHealth === 'warning' && 'Minor issues detected'}
              {overallHealth === 'error' && 'Major outage detected'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold">
            {services.filter(s => s.status === 'healthy').length}/{services.length}
          </p>
          <p className="text-sm text-dark-muted">Services healthy</p>
        </div>
      </div>

      {/* Service List */}
      <div className="space-y-3">
        {services.map((service, index) => (
          <motion.div
            key={service.name}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="bg-dark-bg rounded-lg p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className={clsx(
                'w-3 h-3 rounded-full',
                service.status === 'healthy' && 'bg-green-400',
                service.status === 'warning' && 'bg-yellow-400',
                service.status === 'error' && 'bg-red-400'
              )} />
              <div>
                <p className="font-medium">{service.name}</p>
                <p className="text-sm text-dark-muted">Uptime: {service.uptime}%</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-mono text-sm">{service.responseTime}ms</p>
              <p className="text-xs text-dark-muted">Response time</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}