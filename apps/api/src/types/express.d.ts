import type { AuthContext } from "../core/security/tokens.js";

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      auth?: AuthContext;
      validated: {
        body?: unknown;
        query?: unknown;
        params?: unknown;
      };
    }
  }
}

export {};