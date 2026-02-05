import express from "express";
import cors from "cors"
import authRoutes from "./routes/authRoutes";   
import uploadRoutes from "./routes/uploadRoute";
import reconiliationRoute from "./routes/reconciliationRoute"
import { prisma } from "./config/prisma"; 

const app = express();


app.use(cors());
app.use(express.json()); 


app.get("/", async (req, res) => {
    res.json({ message: "Server is running" }).status(200);
});

app.use("/api/auth", authRoutes);           
app.use("/api/upload", uploadRoutes);       
app.use("/api/reconciliation", reconiliationRoute);


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