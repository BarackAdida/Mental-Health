const rawBase = import.meta.env.VITE_API_BASE_URL;
const rawDoctorsBase = import.meta.env.VITE_DOCTORS_API_BASE_URL || rawBase;

if (!rawBase) {
  throw new Error(
    'Missing VITE_API_BASE_URL. Copy .env.example to .env and set it ' +
      '(e.g. VITE_API_BASE_URL=http://localhost:3000/api).'
  );
}

const stripTrailingSlashes = (value) => String(value).replace(/\/+$/, '');

const joinUrl = (base, path) => {
  const clean = String(path ?? '').replace(/^\/+/, '');
  return clean ? `${base}/${clean}` : base;
};

export const API_BASE = stripTrailingSlashes(rawBase);
export const DOCTORS_API_BASE = stripTrailingSlashes(rawDoctorsBase);

/** Build a full URL for the main API. Paths are relative to the base. */
export const apiUrl = (path = '') => joinUrl(API_BASE, path);

/** Build a full URL for the doctors API. */
export const doctorsApiUrl = (path = '') => joinUrl(DOCTORS_API_BASE, path);

/**
 * fetch() wrapper for the main API.
 * Sends cookies by default; anything in `options` overrides the defaults.
 */
export const apiFetch = (path, options = {}) =>
  fetch(apiUrl(path), { credentials: 'include', ...options });

/** fetch() wrapper for the doctors API. */
export const doctorsFetch = (path, options = {}) =>
  fetch(doctorsApiUrl(path), { credentials: 'include', ...options });