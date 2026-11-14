// Signed cookie session (replaces react-router's createCookieSessionStorage).
import 'server-only';
import {createHmac, timingSafeEqual} from 'node:crypto';

const COOKIE = 'session';
const MAX_AGE = 60 * 60 * 24 * 30;

function sign(value: string, secret: string) {
  return createHmac('sha256', secret).update(value).digest('base64url');
}

function readCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(/;\s*/)) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i) === name) return decodeURIComponent(part.slice(i + 1));
  }
  return undefined;
}

export class AppSession {
  isPending = false;
  #data: Record<string, unknown>;
  #flash = new Set<string>();

  private constructor(
    data: Record<string, unknown>,
    private secret: string,
  ) {
    this.#data = data;
  }

  static init(cookieHeader: string | null, secret: string): AppSession {
    const raw = readCookie(cookieHeader, COOKIE);
    let data: Record<string, unknown> = {};
    if (raw) {
      const dot = raw.lastIndexOf('.');
      const value = raw.slice(0, dot);
      const sig = raw.slice(dot + 1);
      const expected = sign(value, secret);
      if (sig.length === expected.length && timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
        try {
          data = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as Record<string, unknown>;
        } catch {
          data = {};
        }
      }
    }
    return new AppSession(data, secret);
  }

  has(key: string) {
    return key in this.#data;
  }
  get(key: string): unknown {
    const value = this.#data[key];
    if (this.#flash.has(key) || key.startsWith('__flash_')) {
      delete this.#data[key];
      this.isPending = true;
    }
    return value;
  }
  set(key: string, value: unknown) {
    this.#data[key] = value;
    this.isPending = true;
  }
  flash(key: string, value: unknown) {
    this.set(key, value);
    this.#flash.add(key);
  }
  unset(key: string) {
    delete this.#data[key];
    this.isPending = true;
  }
  async destroy(): Promise<string> {
    this.#data = {};
    this.isPending = false;
    return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
  }
  async commit(): Promise<string> {
    this.isPending = false;
    const value = Buffer.from(JSON.stringify(this.#data)).toString('base64url');
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    return `${COOKIE}=${value}.${sign(value, this.secret)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}${secure}`;
  }
}

export {readCookie};
