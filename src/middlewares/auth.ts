import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { prisma } from "../config/prisma";



// ✅ 1. Define the Custom Interface locally (Bypasses the global error)
export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET as string);

      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, username: true, email: true, role: true },
      });

      if (!user) {
        res.status(401).json({ message: "Not authorized, user not found" });
        return;
      }

      // ✅ Now TypeScript knows 'user' exists on 'req'
      console.log(user)
      req.user = user as any; 
      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: "Not authorized, token failed" });
      return;
    }
  } else {
    res.status(401).json({ message: "Not authorized, no token" });
    return;
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    // ✅ TypeScript is happy here too
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ 
        message: `User role '${req.user?.role}' is not authorized to access this route` 
      });
      return; 
    }
    next();
  };
};