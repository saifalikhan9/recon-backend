# Smart Reconciliation System (Backend)

A high-performance Node.js backend built to process and reconcile large financial datasets (50,000+ records) efficiently. The system uses **Node.js Streams, batch database inserts, and BullMQ background jobs** to process large CSV uploads without blocking the API or loading entire files into memory.

## 🚀 Key Features

- **⚡ Asynchronous CSV Processing:** Upload requests return a job ID immediately while CSV processing runs in a dedicated background worker.
- **📦 Background Job Queue:** BullMQ and Redis manage CSV processing jobs, separating request handling from resource-intensive operations.
- **🌊 Stream Processing:** Reads CSV files incrementally to keep memory usage controlled.
- **🗃️ Batch Database Inserts:** Uses Prisma `createMany` with batches of 500 records to improve database write efficiency.
- **🔄 Reconciliation Engine:** Compares uploaded financial records against system records using configurable matching and tolerance logic.
- **📊 Job Tracking:** Tracks upload job status so clients can monitor processing progress.
- **🔒 Role-Based Access Control (RBAC):** JWT authentication with Admin and Analyst roles.
- **📝 Audit Logging:** Records relevant audit events for traceability.
- **🐳 Dockerized Infrastructure:** Supports containerized application and database deployment.

## 🛠️ Tech Stack

| Category | Technologies |
|---|---|
| Runtime | Node.js |
| Language | TypeScript |
| API | Express.js |
| ORM | Prisma |
| Database | PostgreSQL |
| Job Queue | BullMQ |
| Queue Backend | Redis |
| CSV Processing | Node.js Streams, `csv-parser` |
| Authentication | JWT, bcryptjs |
| Infrastructure | Docker, Docker Compose |

## 🏗️ Architecture Overview

```text
                  Client
                    |
                    v
              Express API
                    |
             Upload CSV file
                    |
                    v
          Save file and create job
                    |
                    v
             BullMQ Queue
                    |
                    v
                  Redis
                    |
                    v
           Background Worker
                    |
                    v
         Stream and parse CSV
                    |
                    v
        Validate and reconcile
                    |
                    v
             PostgreSQL
                    |
                    v
         Results and job status
```

The API and worker run as separate processes. The API handles authentication, uploads, and result queries. The worker consumes queued jobs and performs CSV processing asynchronously.

Redis stores queue state and job metadata, while PostgreSQL stores application data and reconciliation results.

## 🏁 Quick Start (Docker)

### Prerequisites

- Node.js and pnpm (for local development)
- Docker and Docker Compose
- PostgreSQL and Redis, if running the services outside Docker

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd recon-backend
```

### 2. Configure environment variables

Create a `.env` file using the variables required by your application.

```env
DATABASE_URL="postgresql://user:pass@localhost:5432/mydb?schema=public"
JWT_SECRET="your_secret"
REDIS_HOST="localhost"
REDIS_PORT="6379"
```

Adjust the values to match your environment. Ensure the Redis variables match the names actually used in your application. If Redis authentication is enabled, configure its credentials as well.

### 3. Start the services

If your `docker-compose.yml` defines the PostgreSQL database, Redis, API, and worker services:

```bash
docker compose up --build
```

This starts the configured services. Make sure the worker service runs the compiled worker entry point and depends on Redis and PostgreSQL being available.

If your Compose file does not yet define Redis and the worker, update it before using this command.

## 💻 Local Development

### 1. Install dependencies

```bash
pnpm install
```

### 2. Start PostgreSQL and Redis

Ensure both services are running and accessible using your environment configuration.

### 3. Run database migrations

```bash
pnpm prisma migrate dev
```

### 4. Start the API server

```bash
pnpm dev
```

### 5. Start the background worker

Open a second terminal:

```bash
pnpm dev:worker
```

The API and worker should run simultaneously. The API enqueues jobs, and the worker consumes them from the same BullMQ queue.

## 🚀 Production

Build the TypeScript project:

```bash
pnpm build
```

Start the API server:

```bash
pnpm start
```

Start the background worker in a separate terminal or managed process:

```bash
pnpm start:worker
```

For production deployments, use a process manager such as PM2 or a container orchestrator to supervise the API and worker independently.

Ensure your TypeScript build outputs the worker to `dist/queues/worker.js`.

## 🧪 Testing the API

### 1. Authentication

**Register an admin**

`POST /api/auth/register`

Example request body:

```json
{
  "username": "admin",
  "email": "admin@test.com",
  "password": "123",
  "role": "ADMIN"
}
```

**Login**

`POST /api/auth/login`

Use the returned JWT as a Bearer token for protected endpoints.

### 2. Upload a CSV file

`POST /api/upload`

Headers:

```text
Authorization: Bearer <YOUR_TOKEN>
```

Body: `multipart/form-data`

| Key | Type |
|---|---|
| `file` | CSV file |

The API validates the upload, creates a processing job, and adds it to the BullMQ queue. It returns a job ID without waiting for the entire CSV to be processed.

### 3. Monitor processing and view results

Use the job ID and any job-status endpoint implemented in the application to track progress.

**Get reconciliation statistics**

`GET /api/reconciliation/stats`

**Get paginated reconciliation results**

`GET /api/reconciliation/results?page=1&limit=50`

Include the Bearer token when these endpoints require authentication.

## ⚙️ Processing Flow

1. The client uploads a CSV file.
2. The API saves the file and creates an upload-job record.
3. The API adds a job to BullMQ, backed by Redis.
4. The API responds with a job ID.
5. The background worker picks up the job.
6. The worker reads the CSV using streams and processes records in batches.
7. The reconciliation logic compares records and persists results in PostgreSQL.
8. The job status is updated so the client can check the outcome.

## 🔧 Important Operational Considerations

- **Retries:** Configure BullMQ retry and backoff policies for recoverable failures.
- **Idempotency:** Prevent retries from creating duplicate reconciliation results.
- **File lifecycle:** Remove temporary CSV files after successful processing or according to a defined cleanup policy.
- **Failure handling:** Record failed jobs and provide a way to inspect or retry them.
- **Graceful shutdown:** Stop accepting new work, allow active jobs to finish where practical, and close worker, Redis, and Prisma connections cleanly.
- **Monitoring:** Track queue depth, job failures, processing duration, API latency, database performance, and Redis health.
- **Concurrency:** Tune worker concurrency and batch size based on CPU, memory, and database capacity.

## 🎯 Project Objective

This project demonstrates practical backend engineering concepts, including asynchronous job processing, stream-based file handling, database batching, queue-based architecture, authentication, reconciliation logic, and containerized deployment.

The goal is to build a backend that can process large financial CSV datasets efficiently while keeping API request handling responsive. 