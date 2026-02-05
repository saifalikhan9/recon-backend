import { Request } from "express";
import { JwtPayload } from "jsonwebtoken";

export interface User extends JwtPayload {
    userId: string;
    email: string;
    role?: "USER" | "ADMIN";
  }

  export interface AuthRequest extends Request {
    user?: JwtPayload;
  }
  
  export interface JwtSignOptions {
    expiresIn?: string | number;
  }
  
  export interface JwtVerifyResult {
    valid: boolean;
    payload?: JwtPayload;
    error?: string;
  }
  