import { Router, type Request, type Response } from "express";
import { asyncHandler } from "../../core/http/async-handler.js";

export function createHealthRouter(checkDatabase?: () => Promise<boolean>): Router {
  const router = Router();

  router.get("/", (_req: Request, res: Response) => {
    res.status(200).json({ success: true, data: { status: "ok", uptime: process.uptime() } });
  });

  router.get(
    "/ready",
    asyncHandler(async (_req: Request, res: Response) => {
      const databaseReady = checkDatabase ? await checkDatabase().catch(() => false) : true;
      res
        .status(databaseReady ? 200 : 503)
        .json({ success: databaseReady, data: { database: databaseReady } });
    }),
  );

  return router;
}