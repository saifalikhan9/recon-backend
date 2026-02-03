# Smart Reconciliation System (Backend)

A high-performance Node.js backend designed to process and reconcile large financial datasets (50,000+ records) efficiently. This system uses **Stream Processing** and **Batch Inserts** to handle large CSV uploads without crashing memory, ensuring scalability and speed.

## 🚀 Key Features

* **⚡ Asynchronous Processing:** Uses Node.js Streams to read large CSVs line-by-line (0% memory bloat).
* **📦 Batch Processing:** Optimized Database writes using Prisma `createMany` (processing 500 records/batch).
* **🔒 Role-Based Access Control (RBAC):** Secure JWT authentication with Admin/Analyst roles.
* **🐳 Fully Dockerized:** Spin up the Database and API with a single command.
* **✅ Precision Math:** Handles financial calculations with configurable tolerance logic (Matched vs. Partial Match).

## 🛠️ Tech Stack

* **Runtime:** Node.js & Express
* **Language:** TypeScript
* **Database:** PostgreSQL
* **ORM:** Prisma
* **Containerization:** Docker & Docker Compose

---

## 🏁 Quick Start (Docker)

The easiest way to run the application is using Docker. This spins up both the **Postgres Database** and the **Backend API** automatically.

### Prerequisites
* Docker & Docker Compose installed.

### Steps
1.  Clone the repository:
    ```bash
    git clone <your-repo-url>
    cd backend
    ```

2.  Run the application:
    ```bash
    docker-compose up --build
    ```

3.  **That's it!** The server is running at:
    * **API:** `http://localhost:3000`
    * **Health Check:** `http://localhost:3000/`

---

## 🧪 Testing the API

You can import the provided Postman Collection or test manually:

### 1. Authentication
* **Register (Admin):**
    * `POST /api/auth/register`
    * Body: `{ "username": "admin", "email": "admin@test.com", "password": "123", "role": "ADMIN" }`
* **Login:**
    * `POST /api/auth/login`
    * Returns: `token` (Use this as a Bearer Token for other requests).

### 2. File Upload (Streaming Test)
* **Endpoint:** `POST /api/upload`
* **Headers:** `Authorization: Bearer <YOUR_TOKEN>`
* **Body:** `form-data` -> Key: `file` (Select a CSV).
* **Response:** Returns a `jobId` immediately while processing happens in the background.

### 3. View Results
* **Get Stats:** `GET /api/reconciliation/stats`
* **Get Rows:** `GET /api/reconciliation/results?page=1&limit=50`

---

## ⚙️ Local Setup (Without Docker)

If you prefer running it manually:

1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Setup Database:**
    * Ensure you have a PostgreSQL instance running.
    * Create a `.env` file and add your connection string:
        ```env
        DATABASE_URL="postgresql://user:pass@localhost:5432/mydb?schema=public"
        JWT_SECRET="your_secret"
        ```

3.  **Run Migrations:**
    ```bash
    npx prisma migrate dev
    ```

4.  **Start Server:**
    ```bash
    npm run dev
    ```