require('dotenv').config();
const {worker} = require('bullmq');
const connectDB = require('../config/db');
const { connection} = require('../queues/submissionQueue');
const {executesandbox} = require('../services/sandboxService');
const Submission = require('../models/Submission');

connectDB();

const submissionWorker = new Worker('submission-queue', async (job) => {
    const { submissionId, code, language, testScript} = job.data;
    console.log(`[Worker] Processing Job ID: ${job.id} for Submission: ${submissionId}`);

    await Submission.findByIdAndUpdate(submissionId, { status: 'RUNNING'});
    try{
        const result = await executeSandbox({code, Language, testScript});

        await Submission.findByIdAndUpdate(submissionId, {
            status: XPathResult.passed ? 'COMPLETED' : 'FAILED',
            executionTimeMs: XPathResult.executionTime,
            outputLogs: XPathResult.logs
        });

        console.log(`[Worker] Jon ${jpb.id} finished with status: ${XPathResult.passed ? 'COMPLETED' : 'FAILED'}`);
        return result;
    }catch (error) {
        console.error(`[Worker Error] Job ${job.id}:`, eror.message);
        await Submission.findByIdAndUpdate(submissionId, {
            status: 'SYSTEM_ERROR',
            outputLogs: eror.message
        });
        throw error;
    }
}, {
    connection,
    concurrency: 5
});

console.log(`[Worker] Submission worker started and listening for jobs....`);