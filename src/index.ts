import express from "express";
import cors from "cors"
import authRoutes from "./routes/authRoutes";     // Rename 'router' to 'authRoutes'
import uploadRoutes from "./routes/uploadRoute"; // Import the new route
import reconiliationRoute from "./routes/reconciliationRoute"
import { prisma } from "./config/prisma"; // Import your DB connection

const app = express();

// 1. Middlewares
app.use(cors()); // Required for React
app.use(express.json()); 

// 2. Routes
app.get("/", async (req, res) => {
    res.json({ message: "Server is running" }).status(200);
});

// Mount the routes
app.use("/api/auth", authRoutes);            // Login & Register
app.use("/api/upload", uploadRoutes);        // File Uploads
app.use("/api/reconciliation", reconiliationRoute); // Dashboard Data

// 3. Start Server with DB Connection
const startServer = async () => {
  try {
    await prisma.$connect();
    console.log("✅ Database connected");
    
    app.listen(3001, () => {
        console.log("🚀 Server running on port 3001");
    });
  } catch (error) {
    console.log("❌ Database failed to connect", error);
  }
};

startServer();