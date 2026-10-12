import { Worker } from "bullmq";
import { processFileInBackground } from "../controllers/uploadController";

console.log("🚀 Starting CSV worker...");

const worker = new Worker(
  "CSV",
  async (job) => {
    console.log("🔥 Worker received job:", job.id);

    const { jobId, filePath } = job.data;

    console.log("📄 Processing:", filePath);

    await processFileInBackground(filePath, jobId);

    console.log("✅ Job completed:", job.id);
  },
  {
    connection: {
      host: "localhost",
      port: 6379,
    },
  },
);

worker.on("ready", () => {
  console.log("🟢 Worker connected to Redis");
});

worker.on("error", (error) => {
  console.error("🔴 Worker error:", error);
});