// Empty in production (built and served from the same origin as the PHP
// API, so relative fetches like `/api/login.php` just work). Set
// VITE_API_BASE=https://basketgo.free.je in a local .env to test `npm run
// dev` against the live API — matches the CORS allowlist in server/cors.php.
export const API_BASE = import.meta.env.VITE_API_BASE ?? ''
