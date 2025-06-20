// Simple queue implementation without Redis/BullMQ dependency
const EventEmitter = require('events');

class SimpleQueue extends EventEmitter {
  constructor(name) {
    super();
    this.name = name;
    this.jobs = [];
  }

  async add(name, data, options = {}) {
    const job = {
      id: Date.now().toString(),
      name,
      data,
      options,
      status: 'waiting',
      createdAt: new Date(),
      attempts: 0
    };
    
    this.jobs.push(job);
    
    // Simulate async processing
    setTimeout(() => {
      this.emit('job-added', job);
    }, 100);
    
    return job;
  }

  async getJob(jobId) {
    return this.jobs.find(job => job.id === jobId);
  }

  async getJobs(types = ['waiting', 'active', 'completed', 'failed']) {
    return this.jobs.filter(job => types.includes(job.status));
  }
}

// Create service generation queue
const serviceGenerationQueue = new SimpleQueue('service-generation');

// Create deployment queue
const deploymentQueue = new SimpleQueue('deployment');

// Create notification queue
const notificationQueue = new SimpleQueue('notification');

// Mock queue event handler
serviceGenerationQueue.on('job-added', (job) => {
  console.log(`Job ${job.id} added to ${serviceGenerationQueue.name} queue`);
});

module.exports = {
  serviceGenerationQueue,
  deploymentQueue,
  notificationQueue,
  addServiceGenerationJob: async (data) => {
    return serviceGenerationQueue.add('generate-service', data);
  },
  addDeploymentJob: async (data) => {
    return deploymentQueue.add('deploy-service', data);
  },
  addNotificationJob: async (data) => {
    return notificationQueue.add('send-notification', data);
  }
};