require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/db');
const Submission = require('./models/Submission');
const {submissionQueue} = require('./queues/submissionQueue');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

connectDB();

//Health check
app.get('/health', (req, res) => {
    res.status(200).json({status: 'OK', timestamp :new Date() });
});

//Enqueue code Submission
app.post('/api/submissions', async (req, res) =>{
    try{
        const {language, code, testScript} = req.body;

        if(!code || !testScript){
            return res.status(400).json({error: 'Code andtestScript are required.'});
        }

        const submission = await Submission.create({
            language: language || 'javascript',
            code,
            testScript,
            status: 'PENDING'
        });

        const job = await submissionQueue.add('execute-submission', {
      submissionId: submission._id.toString(),
      language: submission.language,
      code: submission.code,
      testScript: submission.testScript
    });

    return res.status(202).json({
      message: 'Submission enqueued successfully.',
      submissionId: submission._id,
      jobId: job.id
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Check Submission Result
app.get('/api/submissions/:id', async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);
    if (!submission) return res.status(404).json({ error: 'Submission not found' });
    return res.status(200).json(submission);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`[Server] API Gateway running on port ${PORT}`);
});