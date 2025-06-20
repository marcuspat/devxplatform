const { createBullBoard } = require('@bull-board/api');
const { BullMQAdapter } = require('@bull-board/api/bullMQAdapter');
const { ExpressAdapter } = require('@bull-board/express');

const {
  serviceGenerationQueue,
  serviceBuildQueue,
  serviceDeploymentQueue,
  serviceCleanupQueue,
} = require('../queues/index-simple');

// Create Bull Board
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

const { addQueue, removeQueue, setQueues, replaceQueues } = createBullBoard({
  queues: [
    new BullMQAdapter(serviceGenerationQueue),
    new BullMQAdapter(serviceBuildQueue),
    new BullMQAdapter(serviceDeploymentQueue),
    new BullMQAdapter(serviceCleanupQueue),
  ],
  serverAdapter: serverAdapter,
});

module.exports = {
  serverAdapter,
  addQueue,
  removeQueue,
  setQueues,
  replaceQueues,
};