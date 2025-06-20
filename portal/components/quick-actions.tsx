'use client';

import { motion } from 'framer-motion';
import {
  PlusIcon,
  RocketLaunchIcon,
  CommandLineIcon,
  CloudArrowUpIcon,
} from '@heroicons/react/24/outline';
import { useState } from 'react';
import { CreateServiceModal } from './create-service-modal';
import { apiClient } from '@/lib/api';
import { useAuth } from './auth/auth-provider';

const actions = [
  {
    name: 'Create Service',
    description: 'Deploy a new microservice from templates',
    icon: PlusIcon,
    color: 'from-blue-500 to-blue-600',
    action: 'create',
  },
  {
    name: 'Deploy Update',
    description: 'Push changes to production',
    icon: RocketLaunchIcon,
    color: 'from-green-500 to-green-600',
    action: 'deploy',
  },
  {
    name: 'Open Terminal',
    description: 'Launch cloud development environment',
    icon: CommandLineIcon,
    color: 'from-purple-500 to-purple-600',
    action: 'terminal',
  },
  {
    name: 'Import Project',
    description: 'Migrate existing codebase',
    icon: CloudArrowUpIcon,
    color: 'from-orange-500 to-orange-600',
    action: 'import',
  },
];

interface QuickActionsProps {
  onServiceCreated?: () => void;
}

export function QuickActions({ onServiceCreated }: QuickActionsProps = {}) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [showTerminalModal, setShowTerminalModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { isAuthenticated } = useAuth();

  const handleAction = async (action: string) => {
    if (!isAuthenticated) {
      alert('Please log in to use this feature');
      return;
    }

    switch (action) {
      case 'create':
        setShowCreateModal(true);
        break;
      case 'deploy':
        setShowDeployModal(true);
        break;
      case 'terminal':
        setShowTerminalModal(true);
        break;
      case 'import':
        setShowImportModal(true);
        break;
    }
  };

  const handleDeploy = async (serviceSlug: string = '') => {
    try {
      setLoading(true);
      if (serviceSlug) {
        // Deploy specific service
        const response = await apiClient.deployService(serviceSlug);
        alert(`Deployment initiated for ${serviceSlug}. Check the services page for status.`);
      } else {
        alert('Please select a service to deploy from the services page.');
      }
    } catch (error: any) {
      alert(`Deployment failed: ${error.message}`);
    } finally {
      setLoading(false);
      setShowDeployModal(false);
    }
  };

  const handleOpenTerminal = async () => {
    try {
      setLoading(true);
      // Create a cloud terminal session
      const response = await apiClient.createTerminalSession();
      // Open terminal in new window/tab
      if (response.terminal_url) {
        window.open(response.terminal_url, '_blank');
      } else {
        alert('Terminal session created. Connect via SSH: ' + response.ssh_command);
      }
    } catch (error: any) {
      alert(`Failed to open terminal: ${error.message}`);
    } finally {
      setLoading(false);
      setShowTerminalModal(false);
    }
  };

  const handleImportProject = async (importData: any) => {
    try {
      setLoading(true);
      const response = await apiClient.importProject(importData);
      alert(`Project imported successfully: ${response.project.name}`);
      onServiceCreated?.();
    } catch (error: any) {
      alert(`Import failed: ${error.message}`);
    } finally {
      setLoading(false);
      setShowImportModal(false);
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {actions.map((action, index) => (
          <motion.button
            key={action.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            onClick={() => handleAction(action.action)}
            className="glass-card p-6 text-left hover:border-primary-500/50 hover-scale group"
          >
            <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
              <action.icon className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-semibold mb-1">{action.name}</h3>
            <p className="text-sm text-dark-muted">{action.description}</p>
          </motion.button>
        ))}
      </div>

      {showCreateModal && (
        <CreateServiceModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onServiceCreated={onServiceCreated}
        />
      )}

      {/* Deploy Modal */}
      {showDeployModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-card border border-dark-border rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Deploy Update</h3>
            <p className="text-dark-muted mb-6">
              Deploy the latest changes to your services. This will trigger a new deployment pipeline.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeployModal(false)}
                className="px-4 py-2 text-dark-muted hover:text-white transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeploy()}
                disabled={loading}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Deploying...' : 'Deploy All Services'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Terminal Modal */}
      {showTerminalModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-card border border-dark-border rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Open Terminal</h3>
            <p className="text-dark-muted mb-6">
              Launch a cloud development environment with access to your services and infrastructure.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowTerminalModal(false)}
                className="px-4 py-2 text-dark-muted hover:text-white transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleOpenTerminal}
                disabled={loading}
                className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Connecting...' : 'Open Terminal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-card border border-dark-border rounded-lg p-6 max-w-lg w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Import Project</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              const importData = {
                name: formData.get('name') as string,
                repository_url: formData.get('repository_url') as string,
                technology: formData.get('technology') as string,
                framework: formData.get('framework') as string,
              };
              handleImportProject(importData);
            }}>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Project Name</label>
                  <input
                    name="name"
                    type="text"
                    required
                    className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg focus:outline-none focus:border-primary-500"
                    placeholder="my-awesome-project"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Repository URL</label>
                  <input
                    name="repository_url"
                    type="url"
                    className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg focus:outline-none focus:border-primary-500"
                    placeholder="https://github.com/username/repo"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Technology</label>
                    <select
                      name="technology"
                      className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg focus:outline-none focus:border-primary-500"
                    >
                      <option value="">Select Technology</option>
                      <option value="Node.js">Node.js</option>
                      <option value="Python">Python</option>
                      <option value="Go">Go</option>
                      <option value="Java">Java</option>
                      <option value="PHP">PHP</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Framework</label>
                    <select
                      name="framework"
                      className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg focus:outline-none focus:border-primary-500"
                    >
                      <option value="">Select Framework</option>
                      <option value="Express">Express</option>
                      <option value="FastAPI">FastAPI</option>
                      <option value="Django">Django</option>
                      <option value="Next.js">Next.js</option>
                      <option value="React">React</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 text-dark-muted hover:text-white transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? 'Importing...' : 'Import Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}