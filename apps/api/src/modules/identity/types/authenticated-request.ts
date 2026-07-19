import { Request } from 'express';

export interface JwtPayload {
  sub: string;
  membershipId: string;
  tenantId: string;
  role: string;
  tokenVersion: number;
  email: string;
  jti: string;
  iat: number;
  exp: number;
}

export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}
