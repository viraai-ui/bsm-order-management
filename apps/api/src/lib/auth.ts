import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

export const sessionCookieName = 'bsm_session';
const sessionTtlSeconds = 60 * 60 * 12;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export type AppRole = 'ADMIN' | 'MANAGER' | 'OPERATOR';

export type SeedUser = {
  id: string;
  email: string;
  name: string;
  role: AppRole;
  passwordHash: string;
};

export type AuthConfig = {
  jwtSecret: string;
  seedUser: SeedUser;
};

type SessionPayload = {
  sub: string;
  email: string;
  name: string;
  role: AppRole;
};

export type AuthenticatedUser = Omit<SeedUser, 'passwordHash'>;

export class AuthService {
  constructor(private readonly config: AuthConfig) {}

  async validateCredentials(email: string, password: string): Promise<AuthenticatedUser | null> {
    const user = this.config.seedUser;

    if (user.email.toLowerCase() !== email.toLowerCase()) {
      return null;
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    };
  }

  signSession(user: AuthenticatedUser): string {
    return jwt.sign(
      {
        email: user.email,
        name: user.name,
        role: user.role
      },
      this.config.jwtSecret,
      {
        subject: user.id,
        expiresIn: sessionTtlSeconds
      }
    );
  }

  verifySession(token: string): AuthenticatedUser {
    const payload = jwt.verify(token, this.config.jwtSecret) as SessionPayload;

    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role
    };
  }
}

export function setSessionCookie(response: Response, token: string) {
  response.cookie(sessionCookieName, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    maxAge: sessionTtlSeconds * 1000,
    path: '/'
  });
}

export function clearSessionCookie(response: Response) {
  response.clearCookie(sessionCookieName, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    path: '/'
  });
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export function requireAuth(authService: AuthService) {
  return (request: Request, response: Response, next: NextFunction) => {
    const token = request.cookies?.[sessionCookieName];

    if (!token) {
      response.status(401).json({ error: 'Unauthorized' });
      return;
    }

    try {
      request.user = authService.verifySession(token);
      next();
    } catch {
      response.status(401).json({ error: 'Unauthorized' });
    }
  };
}
