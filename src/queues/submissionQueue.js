const { Queue, Worker, QueueEvents } = require('bullmq');
const IORedis = require('ioredis');
const { executeSandbox } = require('../services/sandboxService');
const Submission = require('../models/Submission');

const connection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false
});

const submissionQueue = new Queue('submission-queue', { connection });

// Worker running asynchronously with controlled concurrency (e.g. max 5 jobs per worker)
const submissionWorker = new Worker('submission-queue', async (job) => {
  const { submissionId, code, language, testScript } = job.data;
  
  await Submission.findByIdAndUpdate(submissionId, { status: 'RUNNING' });

  try {
    const result = await executeSandbox({ code, language, testScript });
    
    await Submission.findByIdAndUpdate(submissionId, {
      status: result.passed ? 'COMPLETED' : 'FAILED',
      executionTimeMs: result.executionTime,
      outputLogs: result.logs,
      memoryUsedMb: result.memory
    });

    return result;
  } catch (error) {
    await Submission.findByIdAndUpdate(submissionId, {
      status: 'SYSTEM_ERROR',
      outputLogs: error.message
    });
    throw error;
  }
}, { 
  connection,
  concurrency: 5 // Prevents CPU exhaustion on a single worker node
});

submissionWorker.on('failed', (job, err) => {
  console.error(`[Job ${job.id}] Failed: ${err.message}`);
});

module.exports = { submissionQueue };