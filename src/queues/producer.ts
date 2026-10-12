import { Queue } from "bullmq";

export const csvQueue = new Queue("CSV", {
  connection: {
    host: "localhost",
    port: "6379",
  },
});
