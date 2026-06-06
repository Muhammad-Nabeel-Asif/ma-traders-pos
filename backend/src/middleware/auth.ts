import type { NextFunction, Request, Response } from 'express';
import { verifyToken, type TokenPayload } from '../lib/auth.js';
import { unauthorized } from '../lib/http.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(unauthorized());
  }
  try {
    req.user = verifyToken(header.slice(7));
    next();
  } catch {
    next(unauthorized('Invalid or expired session'));
  }
}
