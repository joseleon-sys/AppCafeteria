const BLOCKED_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

function isPlainObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function sanitizeValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }

  if (!isPlainObject(value)) {
    return value;
  }

  const sanitized = {};

  for (const [key, nestedValue] of Object.entries(value)) {
    if (BLOCKED_KEYS.has(key) || key.startsWith('$')) continue;
    sanitized[key] = sanitizeValue(nestedValue);
  }

  return sanitized;
}

function sanitizeSection(req, section) {
  if (!req[section] || typeof req[section] !== 'object') return;
  req[section] = sanitizeValue(req[section]);
}

export function sanitizeRequestInputs(req, _res, next) {
  sanitizeSection(req, 'body');
  sanitizeSection(req, 'query');
  sanitizeSection(req, 'params');
  next();
}
