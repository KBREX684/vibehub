import { z } from "zod";
import { getSessionUserFromCookie } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { createPresignedPutUrl, MAX_IMAGE_UPLOAD_BYTES } from "@/lib/uploads-presign";

const bodySchema = z.object({
  filename: z.string().min(1).max(200),
  contentType: z.enum(["image/png", "image/jpeg", "image/webp", "image/gif"]),
  sizeBytes: z.number().int().positive().max(MAX_IMAGE_UPLOAD_BYTES),
});

export async function POST(request: Request) {
  const session = await getSessionUserFromCookie();
  if (!session) return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  try {
    const json = await request.json();
    const parsed = bodySchema.parse(json);
    const result = await createPresignedPutUrl({
      userId: session.userId,
      filename: parsed.filename,
      contentType: parsed.contentType,
      sizeBytes: parsed.sizeBytes,
    });
    if (!result) {
      return apiError(
        {
          code: "UPLOADS_NOT_CONFIGURED",
          message: "Object storage is not configured (set S3_* env vars)",
        },
        503
      );
    }
    return apiSuccess(result);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return apiError({ code: "INVALID_BODY", message: "Invalid payload", details: e.flatten() }, 400);
    }
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "UNSUPPORTED_CONTENT_TYPE") {
      return apiError({ code: "UNSUPPORTED_CONTENT_TYPE", message: msg }, 400);
    }
    if (msg === "UPLOAD_TOO_LARGE") {
      return apiError(
        {
          code: "UPLOAD_TOO_LARGE",
          message: `Uploads are limited to ${MAX_IMAGE_UPLOAD_BYTES} bytes`,
        },
        400
      );
    }
    return apiError({ code: "PRESIGN_FAILED", message: msg }, 500);
  }
}
