'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  StarIcon,
  ClockIcon,
  RocketLaunchIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { clsx } from 'clsx';
import { CreateServiceModal } from './create-service-modal';
import { useTemplates } from '@/hooks/useTemplates';

interface TemplateMarketplaceProps {
  onServiceCreated?: () => void;
}

export function TemplateMarketplace({ onServiceCreated }: TemplateMarketplaceProps = {}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedLanguage, setSelectedLanguage] = useState('All');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');

  const { templates, loading, error } = useTemplates();

  // Extract unique categories and languages from templates
  const categories = ['All', ...Array.from(new Set(templates.map(t => t.category)))];
  const languages = ['All', ...Array.from(new Set(templates.map(t => t.language)))];

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || template.category === selectedCategory;
    const matchesLanguage = selectedLanguage === 'All' || template.language === selectedLanguage;
    return matchesSearch && matchesCategory && matchesLanguage;
  });

  const handleUseTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    setShowCreateModal(true);
  };

  return (
    <>
      <div className="space-y-6">
        {/* Error State */}
        {error && (
          <div className="glass-card p-6">
            <div className="text-center py-8">
              <div className="text-red-400 mb-4">⚠️</div>
              <h3 className="text-lg font-semibold mb-2">Failed to load templates</h3>
              <p className="text-dark-muted mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
              >
                Reload
              </button>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        {!error && (
          <div className="glass-card p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-muted" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-dark-card border border-dark-border rounded-lg focus:outline-none focus:border-primary-500 transition-colors"
              />
            </div>

            {/* Category Filter */}
            <div className="flex gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={clsx(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    selectedCategory === category
                      ? 'bg-primary-500 text-white'
                      : 'bg-dark-card hover:bg-dark-border text-dark-muted hover:text-dark-text'
                  )}
                >
                  {category}
                </button>
              ))}
            </div>

            {/* Language Filter */}
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="px-4 py-2 bg-dark-card border border-dark-border rounded-lg focus:outline-none focus:border-primary-500 text-sm"
            >
              {languages.map((language) => (
                <option key={language} value={language}>
                  {language}
                </option>
              ))}
            </select>
          </div>
          </div>
        )}

        {/* Loading State */}
        {loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="glass-card p-6 animate-pulse">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-dark-bg" />
                    <div>
                      <div className="h-4 bg-dark-bg rounded w-24 mb-2" />
                      <div className="h-3 bg-dark-bg rounded w-16" />
                    </div>
                  </div>
                  <div className="h-6 bg-dark-bg rounded w-16" />
                </div>
                <div className="space-y-3">
                  <div className="h-3 bg-dark-bg rounded" />
                  <div className="h-3 bg-dark-bg rounded w-3/4" />
                  <div className="h-8 bg-dark-bg rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Templates Grid */}
        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template, index) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="glass-card p-6 hover:border-primary-500/50 hover-scale cursor-pointer group"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-primary-500/10 flex items-center justify-center text-2xl">
                    {template.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold group-hover:text-primary-400 transition-colors">
                      {template.name}
                    </h3>
                    <p className="text-sm text-dark-muted">{template.framework}</p>
                  </div>
                </div>
                <span className="px-2 py-1 bg-dark-card rounded text-xs text-dark-muted">
                  {template.category}
                </span>
              </div>

              {/* Description */}
              <p className="text-sm text-dark-muted mb-4 line-clamp-2">
                {template.description}
              </p>

              {/* Features */}
              <div className="mb-4">
                <div className="flex flex-wrap gap-1">
                  {template.features.slice(0, 3).map((feature) => (
                    <span
                      key={feature}
                      className="px-2 py-1 bg-primary-500/10 text-primary-400 rounded text-xs"
                    >
                      {feature}
                    </span>
                  ))}
                  {template.features.length > 3 && (
                    <span className="px-2 py-1 bg-dark-card text-dark-muted rounded text-xs">
                      +{template.features.length - 3} more
                    </span>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center justify-between mb-4 text-sm text-dark-muted">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <StarIconSolid className="w-4 h-4 text-yellow-400" />
                    <span>{template.rating}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>{template.downloads.toLocaleString()} uses</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <ClockIcon className="w-4 h-4" />
                  <span>{template.lastUpdated}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleUseTemplate(template.id)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
                >
                  <RocketLaunchIcon className="w-4 h-4" />
                  <span>Use Template</span>
                </button>
                <button className="px-3 py-2 bg-dark-card hover:bg-dark-border rounded-lg transition-colors">
                  <StarIcon className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
          </div>
        )}

        {/* No Templates Found */}
        {!loading && !error && filteredTemplates.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold mb-2">No templates found</h3>
            <p className="text-dark-muted">
              {searchQuery || selectedCategory !== 'All' || selectedLanguage !== 'All'
                ? 'Try adjusting your search or filter criteria'
                : 'No templates available'
              }
            </p>
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateServiceModal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            setSelectedTemplate('');
          }}
          preSelectedTemplate={selectedTemplate}
          onServiceCreated={onServiceCreated}
        />
      )}
    </>
  );
}