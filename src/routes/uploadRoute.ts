import express from "express";
import multer from "multer";
import { uploadFile } from "../controllers/uploadController";
import { protect, authorize } from "../middlewares/auth";

const router = express.Router();


// This saves the file to 'uploads/' folder locally before processing
const upload = multer({ dest: "uploads/" });

// 2. The Endpoint
// POST /api/upload
// Protected: Only Logged in users (Analysts/Admins) can upload
router.post(
  "/", 
  protect, 
  authorize("ADMIN", "ANALYST"), 
  upload.single("file"), 
  uploadFile
);

export default router;