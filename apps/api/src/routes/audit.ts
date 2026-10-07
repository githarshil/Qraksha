import { Router, Request, Response, NextFunction } from "express";
import { AuditRunSchema } from "@qraksha/shared";

import { validateBody } from "../middleware/validate.middleware.js";
import { scanRateLimiter } from "../middleware/rate-limit.middleware.js";
import { runAgentPipeline } from "../agents/orchestrator.js";
import { supabaseAdmin } from "../db/client.js";

export const auditRouter = Router();

/**
 * POST /api/v1/audit/run
 * Merchant endpoint to submit a live scan (QR payload + photo + GPS) for self-audit.
 * Rate-limited to 1 request per 5 seconds per client per ARCHITECTURE.md Section 6.
 * Per ARCHITECTURE.md Section 6 and TASKS.md Task 9 & 10.
 */
auditRouter.post(
  "/run",
  scanRateLimiter,
  validateBody(AuditRunSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { qrPayload, latitude, longitude, photoBase64 } = req.body;

      const verdictResult = await runAgentPipeline(qrPayload, latitude, longitude, photoBase64, {
        initiatedBy: "merchant",
        correlationId: req.correlationId,
      });

      res.status(200).json({
        data: verdictResult,
      });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET /api/v1/audit/history
 * Paginated past audit runs for self-audits.
 * Per ARCHITECTURE.md Section 6 and TASKS.md Task 10.
 */
auditRouter.get(
  "/history",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = Math.max(1, parseInt((req.query.page as string) || "1", 10));
      const limit = Math.min(50, Math.max(1, parseInt((req.query.limit as string) || "10", 10)));
      const offset = (page - 1) * limit;

      const credentialId = req.query.credentialId as string | undefined;

      let query = supabaseAdmin
        .schema("comparison")
        .from("audit_run")
        .select(
          `
          id,
          credential_id,
          registered_qr_id,
          initiated_by,
          verdict,
          verdict_reason,
          agent_outputs,
          degraded_check,
          created_at
        `,
          { count: "exact" },
        )
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (credentialId) {
        query = query.eq("credential_id", credentialId);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let data: any[] = [];
      let count = 0;

      try {
        const queryRes = await query;
        if (!queryRes.error && queryRes.data) {
          data = queryRes.data;
          count = queryRes.count || data.length;
        }
      } catch (_queryError) {
        data = [];
        count = 0;
      }

      res.status(200).json({
        data: {
          items: data,
          pagination: {
            page,
            limit,
            total: count,
            hasMore: count > offset + limit,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  },
);
