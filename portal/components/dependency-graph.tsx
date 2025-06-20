'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowsPointingOutIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

const dependencies = {
  nodes: [
    { id: 'user-service', label: 'User Service', type: 'service', status: 'healthy' },
    { id: 'payment-gateway', label: 'Payment Gateway', type: 'service', status: 'warning' },
    { id: 'order-service', label: 'Order Service', type: 'service', status: 'healthy' },
    { id: 'notification-service', label: 'Notification Service', type: 'service', status: 'healthy' },
    { id: 'postgres', label: 'PostgreSQL', type: 'database', status: 'healthy' },
    { id: 'redis', label: 'Redis', type: 'cache', status: 'healthy' },
    { id: 'rabbitmq', label: 'RabbitMQ', type: 'queue', status: 'healthy' },
  ],
  edges: [
    { from: 'user-service', to: 'postgres' },
    { from: 'user-service', to: 'redis' },
    { from: 'payment-gateway', to: 'postgres' },
    { from: 'payment-gateway', to: 'rabbitmq' },
    { from: 'order-service', to: 'user-service' },
    { from: 'order-service', to: 'payment-gateway' },
    { from: 'order-service', to: 'postgres' },
    { from: 'notification-service', to: 'rabbitmq' },
  ],
};

const getNodeColor = (type: string, status: string) => {
  const statusColors = {
    healthy: 'border-green-500 bg-green-500/10',
    warning: 'border-yellow-500 bg-yellow-500/10',
    error: 'border-red-500 bg-red-500/10',
  };
  
  return statusColors[status as keyof typeof statusColors] || statusColors.healthy;
};

const getNodeIcon = (type: string) => {
  switch (type) {
    case 'service':
      return '🔧';
    case 'database':
      return '🗄️';
    case 'cache':
      return '⚡';
    case 'queue':
      return '📨';
    default:
      return '⚪';
  }
};

export function DependencyGraph() {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold mb-1">Service Dependencies</h2>
          <p className="text-dark-muted">Visualize service relationships</p>
        </div>
        <div className="flex gap-2">
          <button className="p-2 rounded-lg hover:bg-dark-card transition-colors">
            <MagnifyingGlassIcon className="w-5 h-5" />
          </button>
          <button className="p-2 rounded-lg hover:bg-dark-card transition-colors">
            <ArrowsPointingOutIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Simplified graph visualization */}
      <div className="relative bg-dark-bg rounded-lg p-6 min-h-[400px] overflow-hidden">
        {/* Background grid */}
        <div className="absolute inset-0 opacity-20">
          <svg className="w-full h-full">
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#374151" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Nodes */}
        <div className="relative z-10">
          {/* Services Layer */}
          <div className="flex justify-center mb-12">
            <div className="grid grid-cols-2 gap-8">
              {dependencies.nodes.filter(n => n.type === 'service').map((node, index) => (
                <motion.div
                  key={node.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className={`
                    relative px-4 py-3 rounded-lg border-2 cursor-pointer transition-all
                    ${getNodeColor(node.type, node.status)}
                    ${selectedNode === node.id ? 'ring-2 ring-primary-500' : ''}
                    hover:scale-105
                  `}
                  onClick={() => setSelectedNode(selectedNode === node.id ? null : node.id)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getNodeIcon(node.type)}</span>
                    <div>
                      <div className="font-medium text-sm">{node.label}</div>
                      <div className="text-xs text-dark-muted capitalize">{node.type}</div>
                    </div>
                  </div>
                  
                  {/* Connection lines */}
                  {dependencies.edges
                    .filter(edge => edge.from === node.id)
                    .map((edge, edgeIndex) => (
                      <div
                        key={`${edge.from}-${edge.to}`}
                        className="absolute top-full left-1/2 w-px bg-primary-500/50 z-0"
                        style={{ height: '30px' }}
                      />
                    ))
                  }
                </motion.div>
              ))}
            </div>
          </div>

          {/* Infrastructure Layer */}
          <div className="flex justify-center">
            <div className="grid grid-cols-3 gap-6">
              {dependencies.nodes.filter(n => n.type !== 'service').map((node, index) => (
                <motion.div
                  key={node.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: (index + 4) * 0.1 }}
                  className={`
                    px-3 py-2 rounded-lg border-2 cursor-pointer transition-all
                    ${getNodeColor(node.type, node.status)}
                    ${selectedNode === node.id ? 'ring-2 ring-primary-500' : ''}
                    hover:scale-105
                  `}
                  onClick={() => setSelectedNode(selectedNode === node.id ? null : node.id)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{getNodeIcon(node.type)}</span>
                    <div>
                      <div className="font-medium text-xs">{node.label}</div>
                      <div className="text-xs text-dark-muted capitalize">{node.type}</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Node Details */}
      {selectedNode && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 bg-dark-bg rounded-lg"
        >
          {(() => {
            const node = dependencies.nodes.find(n => n.id === selectedNode);
            if (!node) return null;
            
            const incomingConnections = dependencies.edges.filter(e => e.to === selectedNode);
            const outgoingConnections = dependencies.edges.filter(e => e.from === selectedNode);
            
            return (
              <div>
                <h3 className="font-semibold mb-2">{node.label}</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-dark-muted">Type: <span className="text-dark-text">{node.type}</span></p>
                    <p className="text-dark-muted">Status: <span className="text-dark-text capitalize">{node.status}</span></p>
                  </div>
                  <div>
                    <p className="text-dark-muted">Incoming: <span className="text-dark-text">{incomingConnections.length}</span></p>
                    <p className="text-dark-muted">Outgoing: <span className="text-dark-text">{outgoingConnections.length}</span></p>
                  </div>
                </div>
                
                {outgoingConnections.length > 0 && (
                  <div className="mt-3">
                    <p className="text-dark-muted text-sm mb-1">Dependencies:</p>
                    <div className="flex flex-wrap gap-1">
                      {outgoingConnections.map(conn => {
                        const targetNode = dependencies.nodes.find(n => n.id === conn.to);
                        return (
                          <button
                            key={conn.to}
                            onClick={() => setSelectedNode(conn.to)}
                            className="px-2 py-1 bg-primary-500/10 text-primary-400 rounded text-xs hover:bg-primary-500/20 transition-colors"
                          >
                            {targetNode?.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })()
          )}
        </motion.div>
      )}

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500"></div>
          <span className="text-dark-muted">Healthy</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500"></div>
          <span className="text-dark-muted">Warning</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500"></div>
          <span className="text-dark-muted">Error</span>
        </div>
      </div>
    </div>
  );
}