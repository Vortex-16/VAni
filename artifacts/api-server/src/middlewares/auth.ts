import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db, users } from "@workspace/db";
import { eq } from "drizzle-orm";

export interface AuthRequest extends Request {
  user?: typeof users.$inferSelect;
}

export const optionalAuth = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return next(); // Guest — no token, continue anyway
  }

  const token = authHeader.split(" ")[1];
  if (!token) return next();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { sub: string };
    const [user] = await db.select().from(users).where(eq(users.id, decoded.sub));
    if (user) req.user = user;
  } catch {
    // Invalid token — treat as guest, don't block
  }

  return next();
};

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid authorization header" });
    return;
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    res.status(401).json({ error: "Missing token" });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { sub: string };
    const [user] = await db.select().from(users).where(eq(users.id, decoded.sub));

    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    if (!user.isEmailVerified) {
      res.status(403).json({ error: "EMAIL_NOT_VERIFIED", message: "Please verify your email address to access this resource." });
      return;
    }

    req.user = user;
    return next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};
