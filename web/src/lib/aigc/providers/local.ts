import { createHash } from "crypto";
import type { AigcStampProvider } from "@/lib/aigc/provider";
import { guessAigcStampMode } from "@/lib/aigc/provider";

export const localAigcStampProvider: AigcStampProvider = {
  provider: "local",
  async applyStamp(request) {
    const mode = guessAigcStampMode(request.contentType);
    const hiddenWatermarkId = createHash("sha256")
      .update(`${request.artifactId}:${request.filename}:${request.contentType}`)
      .digest("hex")
      .slice(0, 24);

    return {
      provider: "local",
      mode,
      visibleLabel: "AI 生成标识",
      hiddenWatermarkId,
      rawResponse: {
        provider: "local",
        mode,
        artifactId: request.artifactId,
        filename: request.filename,
      },
    };
  },
};
