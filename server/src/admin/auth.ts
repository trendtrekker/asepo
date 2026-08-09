import { createHmac, timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

/**
 * Single-shared-password admin auth. No session store — the cookie itself is
 * the proof: `timestamp.hmac(timestamp)`, verified by recomputing the HMAC
 * and checking it hasn't expired. Survives a Render restart (nothing to lose)
 * and rotating ADMIN_SESSION_SECRET instantly invalidates every session.
 */

const COOKIE_NAME = 'admin_session';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function secret(): string {
  const s = process.env.ADMIN_SESSION_SECRET?.trim();
  if (!s) throw new Error('ADMIN_SESSION_SECRET is not set — add it to server/.env');
  return s;
}

function sign(timestamp: string): string {
  return createHmac('sha256', secret()).update(timestamp).digest('hex');
}

export function createSessionToken(): string {
  const timestamp = String(Date.now());
  return Buffer.from(`${timestamp}.${sign(timestamp)}`).toString('base64url');
}

function verifySessionToken(token: string): boolean {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const [timestamp, mac] = decoded.split('.');
    if (!timestamp || !mac) return false;
    if (Date.now() - Number(timestamp) > MAX_AGE_MS) return false;

    const expected = sign(timestamp);
    const a = Buffer.from(mac);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function readCookie(req: Request, name: string): string | null {
  const header = req.header('cookie');
  if (!header) return null;
  const match = header.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function checkPassword(candidate: string): boolean {
  const real = process.env.ADMIN_PASSWORD?.trim();
  if (!real) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(real);
  // Length check first — timingSafeEqual throws on mismatched lengths rather
  // than just returning false, and the length check itself leaks only that
  // a guess was the wrong length, not which characters were right.
  return a.length === b.length && timingSafeEqual(a, b);
}

export function setSessionCookie(res: Response) {
  const token = createSessionToken();
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; Path=/admin; Max-Age=${MAX_AGE_MS / 1000}; SameSite=Lax`
  );
}

export function clearSessionCookie(res: Response) {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; HttpOnly; Path=/admin; Max-Age=0; SameSite=Lax`);
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = readCookie(req, COOKIE_NAME);
  if (token && verifySessionToken(token)) return next();
  res.redirect('/admin/login');
}
