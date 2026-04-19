import type { AigcStampProvider } from "@/lib/aigc/provider";
import { guessAigcStampMode } from "@/lib/aigc/provider";

function requireAliyunConfig() {
  const endpoint = process.env.ALIYUN_AIGC_STAMP_ENDPOINT?.trim();
  const accessKeyId = process.env.ALIYUN_AIGC_ACCESS_KEY_ID?.trim();
  const accessKeySecret = process.env.ALIYUN_AIGC_ACCESS_KEY_SECRET?.trim();
  if (!endpoint || !accessKeyId || !accessKeySecret) {
    throw new Error("Aliyun AIGC stamp provider is not configured");
  }
  return { endpoint, accessKeyId, accessKeySecret };
}

export const aliyunAigcStampProvider: AigcStampProvider = {
  provider: "aliyun",
  async applyStamp(request) {
    const { endpoint, accessKeyId, accessKeySecret } = requireAliyunConfig();
    const mode = guessAigcStampMode(request.contentType);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-aliyun-access-key-id": accessKeyId,
        "x-aliyun-access-key-secret": accessKeySecret,
      },
      body: JSON.stringify({
        artifactId: request.artifactId,
        workspaceId: request.workspaceId,
        filename: request.filename,
        contentType: request.contentType,
        publicUrl: request.publicUrl,
        mode,
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      throw new Error(`Aliyun AIGC stamp request failed: ${response.status}`);
    }
    return {
      provider: "aliyun",
      mode,
      visibleLabel: "AI 生成标识",
      hiddenWatermarkId:
        typeof payload.hiddenWatermarkId === "string" ? payload.hiddenWatermarkId : undefined,
      rawResponse: payload,
    };
  },
};
