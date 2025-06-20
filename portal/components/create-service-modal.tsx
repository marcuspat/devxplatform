'use client';

import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useTemplates } from '@/hooks/useTemplates';
import { useServiceCreation } from '@/hooks/useServiceCreation';

interface CreateServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  preSelectedTemplate?: string;
  onServiceCreated?: () => void;
}

const environments = [
  { id: 'dev', name: 'Development' },
  { id: 'staging', name: 'Staging' },
  { id: 'prod', name: 'Production' },
];

export function CreateServiceModal({ isOpen, onClose, preSelectedTemplate, onServiceCreated }: CreateServiceModalProps) {
  const [serviceName, setServiceName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(preSelectedTemplate || '');
  const [selectedEnvironment, setSelectedEnvironment] = useState('dev');
  const [cpu, setCpu] = useState(0.5);
  const [memory, setMemory] = useState(1);
  
  const { templates, loading: templatesLoading } = useTemplates();
  const { createService, isCreating, progress, error, resetState } = useServiceCreation();

  useEffect(() => {
    if (preSelectedTemplate) {
      setSelectedTemplate(preSelectedTemplate);
    }
  }, [preSelectedTemplate]);

  useEffect(() => {
    if (!isOpen) {
      // Reset form when modal closes
      setServiceName('');
      setSelectedTemplate(preSelectedTemplate || '');
      setSelectedEnvironment('dev');
      setCpu(0.5);
      setMemory(1);
      resetState();
    }
  }, [isOpen, preSelectedTemplate, resetState]);

  useEffect(() => {
    // Handle service creation completion
    if (progress?.status === 'completed') {
      setTimeout(() => {
        onServiceCreated?.();
        onClose();
      }, 2000); // Show completion state for 2 seconds before closing
    }
  }, [progress?.status, onServiceCreated, onClose]);

  const handleCreate = async () => {
    if (!serviceName || !selectedTemplate) {
      toast.error('Please fill in all required fields');
      return;
    }

    const result = await createService({
      name: serviceName,
      template: selectedTemplate,
      environment: selectedEnvironment,
      resources: {
        cpu,
        memory,
      },
    });

    if (result) {
      // Don't close modal immediately - wait for progress to complete
      // The modal will be closed when the service creation completes
    }
  };

  const handleClose = () => {
    if (!isCreating) {
      onClose();
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl glass-card p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="div"
                  className="flex items-center justify-between mb-6"
                >
                  <h3 className="text-2xl font-bold">Create New Service</h3>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-dark-card transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </Dialog.Title>

                <div className="space-y-6">
                  {/* Service Name */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Service Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={serviceName}
                      onChange={(e) => setServiceName(e.target.value)}
                      placeholder="my-awesome-service"
                      className="w-full px-4 py-2 bg-dark-card border border-dark-border rounded-lg focus:outline-none focus:border-primary-500 transition-colors"
                    />
                  </div>

                  {/* Template Selection */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Select Template <span className="text-red-400">*</span>
                    </label>
                    {templatesLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                        <span className="ml-2 text-dark-muted">Loading templates...</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                        {templates.map((template) => (
                          <motion.button
                            key={template.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setSelectedTemplate(template.id)}
                            className={`p-4 rounded-lg border text-left transition-all ${
                              selectedTemplate === template.id
                                ? 'border-primary-500 bg-primary-500/10'
                                : 'border-dark-border hover:border-primary-500/50'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-lg">{template.icon}</span>
                              <p className="font-medium">{template.name}</p>
                            </div>
                            <p className="text-sm text-dark-muted">
                              {template.framework}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs bg-primary-500/10 text-primary-400 px-2 py-1 rounded">
                                {template.language}
                              </span>
                              <span className="text-xs text-dark-muted">
                                {template.rating}★
                              </span>
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Environment */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Deploy to Environment
                    </label>
                    <div className="flex gap-3">
                      {environments.map((env) => (
                        <button
                          key={env.id}
                          onClick={() => setSelectedEnvironment(env.id)}
                          className={`px-4 py-2 rounded-lg transition-all ${
                            selectedEnvironment === env.id
                              ? 'bg-primary-500 text-white'
                              : 'bg-dark-card hover:bg-dark-border'
                          }`}
                        >
                          {env.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Advanced Options */}
                  <details className="group">
                    <summary className="cursor-pointer text-sm font-medium text-dark-muted hover:text-dark-text transition-colors">
                      Advanced Options
                    </summary>
                    <div className="mt-4 space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Resource Allocation
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-dark-muted">CPU (cores)</label>
                            <input
                              type="number"
                              value={cpu}
                              onChange={(e) => setCpu(parseFloat(e.target.value))}
                              min="0.1"
                              max="8"
                              step="0.1"
                              className="w-full px-3 py-1 bg-dark-card border border-dark-border rounded text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-dark-muted">Memory (GB)</label>
                            <input
                              type="number"
                              value={memory}
                              onChange={(e) => setMemory(parseFloat(e.target.value))}
                              min="0.5"
                              max="32"
                              step="0.5"
                              className="w-full px-3 py-1 bg-dark-card border border-dark-border rounded text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </details>
                </div>

                {/* Progress Tracking */}
                {progress && (
                  <div className="mt-6 p-4 bg-dark-card rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium">Creating Service: {progress.serviceName}</h4>
                      <span className="text-sm text-dark-muted">{progress.progress}%</span>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full bg-dark-bg rounded-full h-2 mb-3">
                      <div
                        className="h-2 rounded-full bg-primary-500 transition-all duration-500"
                        style={{ width: `${progress.progress}%` }}
                      />
                    </div>

                    {/* Current Step */}
                    <div className="space-y-2">
                      {progress.steps.map((step, index) => (
                        <div
                          key={index}
                          className={`flex items-center gap-2 text-sm ${
                            index < progress.currentStep
                              ? 'text-green-400'
                              : index === progress.currentStep
                              ? 'text-primary-400'
                              : 'text-dark-muted'
                          }`}
                        >
                          {index < progress.currentStep ? (
                            <div className="w-4 h-4 rounded-full bg-green-400 flex items-center justify-center">
                              <svg className="w-2 h-2 text-dark-bg" fill="currentColor" viewBox="0 0 8 8">
                                <path d="M6.564.75l-3.59 3.612-1.538-1.55L0 4.26l2.974 2.99L8 2.193z"/>
                              </svg>
                            </div>
                          ) : index === progress.currentStep ? (
                            <div className="w-4 h-4 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border-2 border-dark-border" />
                          )}
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Error Display */}
                {error && (
                  <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="mt-8 flex gap-3 justify-end">
                  <button
                    onClick={handleClose}
                    disabled={isCreating}
                    className="px-4 py-2 rounded-lg bg-dark-card hover:bg-dark-border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreating ? 'Creating...' : 'Cancel'}
                  </button>
                  {!progress || progress.status !== 'completed' ? (
                    <button
                      onClick={handleCreate}
                      disabled={isCreating || !serviceName || !selectedTemplate}
                      className="px-4 py-2 rounded-lg bg-primary-500 hover:bg-primary-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isCreating && (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      )}
                      {isCreating ? 'Creating...' : 'Create Service'}
                    </button>
                  ) : (
                    <button
                      onClick={handleClose}
                      className="px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white transition-colors"
                    >
                      Done
                    </button>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}