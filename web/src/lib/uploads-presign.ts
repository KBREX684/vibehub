import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

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
}): Promise<{ uploadUrl: string; publicUrl: string; key: string } | null> {
  const c = client();
  const bucket = process.env.S3_BUCKET?.trim();
  if (!c || !bucket) return null;
  if (!ALLOWED_TYPES.has(params.contentType)) {
    throw new Error("UNSUPPORTED_CONTENT_TYPE");
  }
  const safe = params.filename.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80);
  const key = `uploads/${params.userId}/${Date.now()}-${safe || "file"}`;
  const cmd = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: params.contentType,
  });
  const uploadUrl = await getSignedUrl(c, cmd, { expiresIn: 60 * 10 });
  const base = process.env.S3_PUBLIC_BASE_URL?.trim()?.replace(/\/$/, "");
  const publicUrl = base ? `${base}/${key}` : `s3://${bucket}/${key}`;
  return { uploadUrl, publicUrl, key };
}
