require('dotenv').config();
const { Worker } = require('bullmq');
const connectDB = require('../config/db');
const { connection } = require('../queues/submissionQueue');
const { executeSandbox } = require('../services/sandboxService');
const Submission = require('../models/Submission');

connectDB();

const submissionWorker = new Worker('submission-queue', async (job) => {
  const { submissionId, code, language, testScript } = job.data;
  console.log(`[Worker] Processing Job ID: ${job.id} for Submission: ${submissionId}`);

  await Submission.findByIdAndUpdate(submissionId, { status: 'RUNNING' });

  try {
    const result = await executeSandbox({ code, language, testScript });
    
    await Submission.findByIdAndUpdate(submissionId, {
      status: result.passed ? 'COMPLETED' : 'FAILED',
      executionTimeMs: result.executionTime,
      outputLogs: result.logs
    });

    console.log(`[Worker] Job ${job.id} finished with status: ${result.passed ? 'COMPLETED' : 'FAILED'}`);
    return result;
  } catch (error) {
    console.error(`[Worker Error] Job ${job.id}:`, error.message);
    await Submission.findByIdAndUpdate(submissionId, {
      status: 'SYSTEM_ERROR',
      outputLogs: error.message
    });
    throw error;
  }
}, { 
  connection,
  concurrency: 5 
});

console.log('[Worker] Submission worker started and listening for jobs...');