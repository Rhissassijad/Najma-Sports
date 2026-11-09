// Accept either an API origin or a base URL ending in /api.
const configured = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080")
  .trim()
  .replace(/\/+$/, "");
export const API_URL = configured.replace(/\/api$/i, "");
