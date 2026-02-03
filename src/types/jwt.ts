export interface JwtPayload {
    userId: string;
    email: string;
    role?: "USER" | "ADMIN";
  }
  
  export interface JwtSignOptions {
    expiresIn?: string | number;
  }
  
  export interface JwtVerifyResult {
    valid: boolean;
    payload?: JwtPayload;
    error?: string;
  }
  