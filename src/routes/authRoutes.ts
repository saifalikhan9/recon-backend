import express from "express";
import { register, login } from "../controllers/authController";
import { authorize, protect } from "../middlewares/auth";


const router = express.Router();

router.post("/register", register);
router.post("/login", login);

// Example of a Protected Route (Just for testing)
router.get("/me", protect, (req: any, res) => {
  res.json(req.user);
});

// Example of an Admin-Only Route
router.get("/admin-only", protect, authorize("ADMIN"), (req, res) => {
  res.json({ message: "Welcome Admin" });
});

export default router;