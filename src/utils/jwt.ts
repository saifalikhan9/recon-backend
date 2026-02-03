import jwt from "jsonwebtoken";
import type { JwtPayload, JwtSignOptions, JwtVerifyResult } from "../types/jwt.js";

const JWT_SECRET = process.env.JWT_SECRET as string;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in environment variables");
}

/**
 * Generate JWT token
 */
export function generateToken(
  payload: JwtPayload,
  options?: JwtSignOptions
): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: options?.expiresIn ?? "7d",
  });
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): JwtVerifyResult {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    return {
      valid: true,
      payload: decoded,
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Invalid token",
    };
  }
}
