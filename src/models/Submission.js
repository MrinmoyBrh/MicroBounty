const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
    language: {
        type: String,
        required: true,
        enum: ['javascript'],
        default: 'javascript'
    },
    code: {
        type: String,
        required: true
    },
    testScript: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'SYSTEM_ERROR'],
        default: 'PENDING'
    },
    outputLogs: {
        typr: String
    },
    executionTimeMs: {
        type: Number
    }
}, { timestamps: true});

module.exports = mongoose.model('submission', submissionSchema);