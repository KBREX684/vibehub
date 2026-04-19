import type { AigcProviderApi, AigcStampMode } from "@/lib/types";

export interface AigcStampRequest {
  artifactId: string;
  workspaceId: string;
  filename: string;
  contentType: string;
  publicUrl?: string;
}

export interface AigcStampResult {
  provider: AigcProviderApi;
  mode: AigcStampMode;
  visibleLabel: string;
  hiddenWatermarkId?: string;
  rawResponse?: Record<string, unknown>;
}

export interface AigcStampProvider {
  provider: AigcProviderApi;
  applyStamp(request: AigcStampRequest): Promise<AigcStampResult>;
}

export function guessAigcStampMode(contentType: string): AigcStampMode {
  const normalized = contentType.trim().toLowerCase();
  if (normalized.startsWith("image/")) return "image";
  if (normalized.startsWith("audio/")) return "audio";
  if (normalized.startsWith("video/")) return "video";
  return "text";
}

export async function getAigcStampProvider(provider: AigcProviderApi): Promise<AigcStampProvider> {
  switch (provider) {
    case "local":
      return (await import("@/lib/aigc/providers/local")).localAigcStampProvider;
    case "tencent":
      return (await import("@/lib/aigc/providers/tencent")).tencentAigcStampProvider;
    case "aliyun":
      return (await import("@/lib/aigc/providers/aliyun")).aliyunAigcStampProvider;
    default: {
      const exhaustive: never = provider;
      throw new Error(`Unsupported AIGC provider: ${exhaustive}`);
    }
  }
}
