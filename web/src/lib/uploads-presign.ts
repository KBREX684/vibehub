import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const MAX_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024;

function client(): S3Client | null {
  const bucket = process.env.S3_BUCKET?.trim();
  const region = process.env.S3_REGION?.trim() || "auto";
  const accessKeyId = process.env.S3_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY?.trim();
  const endpoint = process.env.S3_ENDPOINT?.trim();
  if (!bucket || !accessKeyId || !secretAccessKey) return null;
  return new S3Client({
    region,
    endpoint: endpoint || undefined,
    forcePathStyle: Boolean(endpoint),
    credentials: { accessKeyId, secretAccessKey },
  });
}

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

export async function createPresignedPutUrl(params: {
  userId: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
}): Promise<{
  uploadUrl: string;
  publicUrl: string;
  key: string;
  requiredHeaders: Record<string, string>;
  maxBytes: number;
  visibility: "private" | "public";
  validationState: "pending";
} | null> {
  if (!ALLOWED_TYPES.has(params.contentType)) {
    throw new Error("UNSUPPORTED_CONTENT_TYPE");
  }
  if (!Number.isInteger(params.sizeBytes) || params.sizeBytes <= 0 || params.sizeBytes > MAX_IMAGE_UPLOAD_BYTES) {
    throw new Error("UPLOAD_TOO_LARGE");
  }
  const c = client();
  const bucket = process.env.S3_BUCKET?.trim();
  if (!c || !bucket) return null;
  const safe = params.filename.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80);
  const key = `uploads/${params.userId}/${Date.now()}-${safe || "file"}`;
  const cmd = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: params.contentType,
    ContentLength: params.sizeBytes,
    Metadata: {
      vibehubValidation: "pending",
      vibehubUploader: params.userId,
    },
  });
  const uploadUrl = await getSignedUrl(c, cmd, { expiresIn: 60 * 10 });
  const uploadsArePublic = process.env.S3_UPLOADS_PUBLIC === "true";
  const base = uploadsArePublic ? process.env.S3_PUBLIC_BASE_URL?.trim()?.replace(/\/$/, "") : "";
  const publicUrl = base ? `${base}/${key}` : `s3://${bucket}/${key}`;
  return {
    uploadUrl,
    publicUrl,
    key,
    requiredHeaders: {
      "Content-Type": params.contentType,
      "Content-Length": String(params.sizeBytes),
    },
    maxBytes: MAX_IMAGE_UPLOAD_BYTES,
    visibility: base ? "public" : "private",
    validationState: "pending",
  };
}
