import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db, users } from "@workspace/db";
import { eq } from "drizzle-orm";

export interface AuthRequest extends Request {
  user?: typeof users.$inferSelect;
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid authorization header" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Missing token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "super_secret_dev_jwt_key") as { sub: string };
    const [user] = await db.select().from(users).where(eq(users.id, decoded.sub));

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
};
