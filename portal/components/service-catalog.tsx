'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
  ServerIcon,
  GlobeAltIcon,
  CircleStackIcon,
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import { useServices } from '@/hooks/useServices';

const getServiceIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case 'rest api':
      return ServerIcon;
    case 'grpc service':
      return CircleStackIcon;
    case 'next.js app':
    case 'vue.js app':
      return GlobeAltIcon;
    default:
      return ServerIcon;
  }
};

export function ServiceCatalog() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  
  const { services, loading, error, refreshServices } = useServices();

  const filteredServices = services.filter((service) => {
    const matchesSearch = service.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'all' || service.type === selectedType;
    return matchesSearch && matchesType;
  });

  const uniqueTypes = ['all', ...Array.from(new Set(services.map(s => s.type)))];

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold mb-1">Service Catalog</h2>
          <p className="text-dark-muted">Manage and monitor your deployed services</p>
        </div>
        <button 
          onClick={refreshServices}
          disabled={loading}
          className="p-2 rounded-lg hover:bg-dark-card transition-colors disabled:opacity-50"
        >
          <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-muted" />
          <input
            type="text"
            placeholder="Search services..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-dark-card border border-dark-border rounded-lg focus:outline-none focus:border-primary-500 transition-colors"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-dark-card border border-dark-border rounded-lg hover:border-primary-500/50 transition-colors">
          <FunnelIcon className="w-5 h-5" />
          <span>Filters</span>
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="text-center py-8">
          <div className="text-red-400 mb-4">⚠️</div>
          <h3 className="text-lg font-semibold mb-2">Failed to load services</h3>
          <p className="text-dark-muted mb-4">{error}</p>
          <button
            onClick={refreshServices}
            className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, index) => (
            <div key={index} className="bg-dark-card border border-dark-border rounded-lg p-5 animate-pulse">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-dark-bg" />
                  <div>
                    <div className="h-4 bg-dark-bg rounded w-24 mb-2" />
                    <div className="h-3 bg-dark-bg rounded w-16" />
                  </div>
                </div>
                <div className="h-6 bg-dark-bg rounded w-16" />
              </div>
              <div className="space-y-3">
                <div className="h-3 bg-dark-bg rounded" />
                <div className="h-3 bg-dark-bg rounded" />
                <div className="h-3 bg-dark-bg rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Service Grid */}
      {!loading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredServices.map((service, index) => {
            const ServiceIcon = getServiceIcon(service.type);
            return (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="bg-dark-card border border-dark-border rounded-lg p-5 hover:border-primary-500/50 transition-all hover-scale cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
                      <ServiceIcon className="w-5 h-5 text-primary-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{service.name}</h3>
                      <p className="text-sm text-dark-muted">{service.type}</p>
                    </div>
                  </div>
                  <span
                    className={clsx(
                      'status-badge',
                      service.status === 'healthy' && 'bg-green-500/10 text-green-400',
                      service.status === 'warning' && 'bg-yellow-500/10 text-yellow-400',
                      service.status === 'error' && 'bg-red-500/10 text-red-400',
                      service.status === 'provisioning' && 'bg-blue-500/10 text-blue-400'
                    )}
                  >
                    <span className={clsx(
                      'w-2 h-2 rounded-full',
                      service.status === 'healthy' && 'bg-green-400',
                      service.status === 'warning' && 'bg-yellow-400',
                      service.status === 'error' && 'bg-red-400',
                      service.status === 'provisioning' && 'bg-blue-400'
                    )} />
                    {service.status}
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-dark-muted">Version</span>
                    <span className="font-mono">{service.version}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-dark-muted">Instances</span>
                    <span>
                      {typeof service.instances === 'object' 
                        ? `${service.instances.running}/${service.instances.desired}`
                        : service.instances || 1}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-dark-muted">Requests</span>
                    <span>{service.metrics?.requests_per_minute || 0}/min</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-dark-muted">Environment</span>
                    <span className="capitalize">{service.environment}</span>
                  </div>

                  {/* Resource Usage */}
                  <div className="pt-3 border-t border-dark-border space-y-2">
                    <div>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-dark-muted">CPU</span>
                        <span>{service.resources?.cpu || service.cpu || 0}%</span>
                      </div>
                      <div className="w-full bg-dark-bg rounded-full h-2">
                        <div
                          className={clsx(
                            'h-2 rounded-full transition-all',
                            (service.resources?.cpu || service.cpu || 0) < 70 ? 'bg-green-500' : 
                            (service.resources?.cpu || service.cpu || 0) < 90 ? 'bg-yellow-500' : 'bg-red-500'
                          )}
                          style={{ width: `${Math.min(service.resources?.cpu || service.cpu || 0, 100)}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-dark-muted">Memory</span>
                        <span>{service.resources?.memory || service.memory || 0}%</span>
                      </div>
                      <div className="w-full bg-dark-bg rounded-full h-2">
                        <div
                          className={clsx(
                            'h-2 rounded-full transition-all',
                            (service.resources?.memory || service.memory || 0) < 70 ? 'bg-green-500' : 
                            (service.resources?.memory || service.memory || 0) < 90 ? 'bg-yellow-500' : 'bg-red-500'
                          )}
                          style={{ width: `${Math.min(service.resources?.memory || service.memory || 0, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* No Services Found */}
      {!loading && !error && filteredServices.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold mb-2">No services found</h3>
          <p className="text-dark-muted">
            {searchQuery || selectedType !== 'all' 
              ? 'Try adjusting your search or filter criteria'
              : 'Get started by creating your first service'
            }
          </p>
        </div>
      )}
    </div>
  );
}