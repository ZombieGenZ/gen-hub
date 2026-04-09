import { Request } from 'express';

const SENSITIVE_FIELD_NAMES = new Set([
  'password',
  'currentpassword',
  'newpassword',
  'confirmpassword',
  'token',
  'secret',
  'otp',
  'code',
  'accesstoken',
  'refreshtoken',
  'authorization',
  'cookie',
  'x-api-key',
  'x-auth-token',
  'set-cookie',
]);

const MAX_SANITIZE_DEPTH = 5;

export function extractIpAddress(request: Request): string {
  const forwarded = request.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }

  return request.socket?.remoteAddress || request.ip || 'unknown';
}

export function sanitizeHeaders(
  headers: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!headers || typeof headers !== 'object') {
    return {};
  }

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(headers)) {
    if (SENSITIVE_FIELD_NAMES.has(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
      continue;
    }

    sanitized[key] = sanitizeHttpValue(value);
  }

  return sanitized;
}

export function sanitizeHttpValue(value: unknown, depth = 0): unknown {
  if (value === undefined || value === null) {
    return value ?? null;
  }

  if (depth >= MAX_SANITIZE_DEPTH) {
    return '[MAX_DEPTH_REACHED]';
  }

  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Buffer.isBuffer(value)) {
    return `[Buffer(${value.length})]`;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeHttpValue(item, depth + 1));
  }

  if (typeof value === 'function') {
    return `[Function ${value.name || 'anonymous'}]`;
  }

  if (typeof value !== 'object') {
    return value;
  }

  const sanitized: Record<string, unknown> = {};

  for (const [key, nestedValue] of Object.entries(
    value as Record<string, unknown>,
  )) {
    if (SENSITIVE_FIELD_NAMES.has(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
      continue;
    }

    sanitized[key] = sanitizeHttpValue(nestedValue, depth + 1);
  }

  return sanitized;
}
