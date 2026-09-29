# MicroBounty — Sandboxed Code Evaluation & PR Verifier Engine

[![Node.js](https://img.shields.io/badge/Node.js-20_LTS-green.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Multi--stage-blue.svg)](https://www.docker.com/)
[![Redis](https://img.shields.io/badge/Redis-BullMQ-red.svg)](https://redis.io/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-brightgreen.svg)](https://www.mongodb.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

An asynchronous, distributed code evaluation backend designed to ingest code submissions and GitHub pull requests, enqueue execution requests, and run untrusted code within secure, disposable, resource-capped Docker sandboxes.

---

## Architecture Overview

```text
[ Incoming Webhooks / Submissions ]
                 │
                 ▼
     [ Express.js API Gateway ]
                 │  (Sliding-Window Rate Limiting & Webhook Idempotency)
                 ▼
      [ BullMQ & Redis Cluster ]  <-- Job Queue (Decouples ingestion from compute)
                 │
                 ▼
       [ Asynchronous Worker ]
                 │
                 ▼
    [ Ephemeral Docker Sandbox ]   <-- Isolated container (`--network=none`, `--memory=128m`)
                 │
                 ▼
        [ MongoDB Atlas ]          <-- Stores execution logs, test outputs & status
```

---

## Key Engineering Features

- **Asynchronous Backpressure (BullMQ & Redis):** High-frequency code submissions and GitHub webhooks are buffered into an asynchronous task queue with exponential backoff and Dead-Letter Queues (DLQ), ensuring the API server remains non-blocking and responsive.
- **Sandboxed Execution Security:** Untrusted user code runs in isolated, disposable Docker containers configured with strict operational boundaries:
  - Network access disabled (`NetworkDisabled: true`) to prevent container breakouts, remote calls, and unauthorized outbound traffic.
  - Memory capped at `128MB` and CPU limited to `0.5 cores` to defend against memory leaks and fork bombs.
  - Hard timeouts (5s) to eliminate execution starvation caused by infinite loops.
- **Webhook Idempotency:** Implemented Redis key-locking on `x-github-delivery` tokens with a 10-minute TTL to eliminate duplicate test runs from redundant webhook events.
- **Edge Protection:** Sliding-window rate limiting via Redis atomic commands (`ZADD`, `ZREMRANGEBYSCORE`) preventing endpoint abuse.
- **Optimized Multi-Stage Dockerfile:** Produces a minimal production footprint (<120MB) running as a non-root system user (`appuser`).

---

## Tech Stack

- **Runtime & Framework:** Node.js 20 LTS, Express.js
- **Containerization:** Docker, Dockerode (Docker Engine API)
- **Queue & Caching:** Redis, BullMQ, IORedis
- **Database:** MongoDB Atlas (Mongoose ODM)
- **Process & Security:** Helmet.js, CORS, Non-root Alpine execution

---

## Getting Started

### Prerequisites

- [Node.js 20+](https://nodejs.org/)
- [Docker Engine](https://docs.docker.com/engine/install/) running locally
- A free [MongoDB Atlas](https://www.mongodb.com/atlas) URI
- A free [Upstash Redis](https://upstash.com/) or local Redis instance

### Installation & Local Setup

1. **Clone the repository:**

   ```bash
   git clone [https://github.com/](https://github.com/)<your-username>/microbounty-backend.git
   cd microbounty-backend
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory:

   ```env
   PORT=5000
   NODE_ENV=development
   MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/microbounty
   REDIS_URL=redis://127.0.0.1:6379
   JWT_SECRET=your_super_secret_key
   ```

4. **Run locally:**

   ```bash
   # Start the Express API server
   npm run dev

   # Start the background BullMQ worker (in a separate terminal)
   npm run worker
   ```

---

## Docker Deployment

Build and run the production-grade multi-stage container:

```bash
# Build minimal production image
docker build -t microbounty-api .

# Run container
docker run -d \
  -p 5000:5000 \
  --name microbounty \
  --env-file .env \
  -v /var/run/docker.sock:/var/run/docker.sock \
  microbounty-api
```
