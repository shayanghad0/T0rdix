import { Router } from "express";
import { ApiError } from "../utils/api-error";
import { asyncHandler } from "../utils/async-handler";
import { requireAuth } from "../middleware/auth";
import { getAiProvider, GeneratedApiSpec } from "../ai";
import { validate } from "../utils/validate";
import { aiExplainSchema, aiGenerateSchema, aiSchemaSchema } from "../validation/schemas";
import { db, newId, nowIso } from "../database/db";
import type { HttpMethod } from "../types";
import { writeLog } from "../services/log.service";

/**
 * AI-ready endpoints. Backed by the offline heuristic provider today; a
 * model-backed provider can be swapped in `backend/src/ai/index.ts` without
 * touching this file. No paid APIs are called.
 */
const router = Router();
router.use(requireAuth);

const provider = getAiProvider();

/** GET /api/ai — describe current provider capabilities. */
router.get("/", (req, res) => {
  res.json({
    success: true,
    data: {
      provider: provider.id,
      label: provider.label,
      capabilities: ["generate-api-from-text", "generate-schema", "explain-error"],
      note: "Reserved surface for future model integration. Runs fully offline today.",
    },
  });
});

/** POST /api/ai/generate-api — scaffold an API definition from a text prompt. */
router.post(
  "/generate-api",
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const { prompt } = validate(aiGenerateSchema, req.body);
    const spec: GeneratedApiSpec = await provider.generateApiFromText(prompt);

    // Optionally materialize the spec directly into a new API.
    let createdApiId: string | null = null;
    if (req.query.apply === "1" && req.query.projectId) {
      const projectId = String(req.query.projectId);
      const { requireProjectAccess } = await import("../services/project.service");
      await requireProjectAccess(projectId, req.user);
      const api = await db.apis.insert({
        id: newId(),
        projectId,
        name: spec.name,
        description: spec.description,
        endpoints: spec.endpoints.map((endpoint) => ({
          id: newId(),
          method: endpoint.method as HttpMethod,
          path: endpoint.path,
          statusCode: endpoint.statusCode ?? 200,
          delayMs: endpoint.delayMs ?? 0,
          description: endpoint.description ?? "",
          headers: endpoint.headers ?? {},
          responseBody: endpoint.responseBody ?? "",
          errorMode: "none" as const,
          errorStatus: 500,
          enabled: true,
          createdAt: nowIso(),
          updatedAt: nowIso(),
        })),
        createdAt: nowIso(),
        updatedAt: nowIso(),
      });
      createdApiId = api.id;
      await writeLog({
        type: "user",
        actor: req.user.email,
        userId: req.user.id,
        projectId,
        action: "ai.api_generated",
        meta: { name: spec.name, endpoints: spec.endpoints.length },
      });
    }

    res.status(createdApiId ? 201 : 200).json({ success: true, data: { spec, createdApiId } });
  }),
);

/** POST /api/ai/generate-schema */
router.post(
  "/generate-schema",
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const { resource } = validate(aiSchemaSchema, req.body);
    const schema = await provider.generateSchema(resource);
    res.json({ success: true, data: schema });
  }),
);

/** POST /api/ai/explain-error */
router.post(
  "/explain-error",
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const input = validate(aiExplainSchema, req.body);
    const explanation = await provider.explainError(input);
    res.json({ success: true, data: { explanation } });
  }),
);

export default router;
