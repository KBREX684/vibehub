import type { AigcStampProvider } from "@/lib/aigc/provider";
import { guessAigcStampMode } from "@/lib/aigc/provider";

function requireTencentConfig() {
  const endpoint = process.env.TENCENT_AIGC_STAMP_ENDPOINT?.trim();
  const secretId = process.env.TENCENT_AIGC_SECRET_ID?.trim();
  const secretKey = process.env.TENCENT_AIGC_SECRET_KEY?.trim();
  if (!endpoint || !secretId || !secretKey) {
    throw new Error("Tencent AIGC stamp provider is not configured");
  }
  return { endpoint, secretId, secretKey };
}

export const tencentAigcStampProvider: AigcStampProvider = {
  provider: "tencent",
  async applyStamp(request) {
    const { endpoint, secretId, secretKey } = requireTencentConfig();
    const mode = guessAigcStampMode(request.contentType);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-tencent-secret-id": secretId,
        "x-tencent-secret-key": secretKey,
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
      throw new Error(`Tencent AIGC stamp request failed: ${response.status}`);
    }
    return {
      provider: "tencent",
      mode,
      visibleLabel: "AI 生成标识",
      hiddenWatermarkId:
        typeof payload.hiddenWatermarkId === "string" ? payload.hiddenWatermarkId : undefined,
      rawResponse: payload,
    };
  },
};
