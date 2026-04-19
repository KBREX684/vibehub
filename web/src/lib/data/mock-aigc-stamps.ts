/**
 * Mock AigcStamp data for v11 frontend development.
 *
 * Data contract matches backend P2 (GPT) — do not modify types.
 * 20+ entries covering all 4 modes and 3 provider APIs.
 */

export type AigcStampMode = "text" | "image" | "audio" | "video";
export type AigcProviderApi = "tencent" | "aliyun" | "local";

export interface AigcStamp {
  id: string;
  artifactId: string;
  mode: AigcStampMode;
  explicitMark: string;
  implicitMetadata: Record<string, unknown>;
  providerCode: string;
  contentSerial: string;
  providerApi: AigcProviderApi;
  stampedAt: string;
  retainedUntil: string;
}

const MODES: AigcStampMode[] = ["text", "image", "audio", "video"];
const PROVIDERS: AigcProviderApi[] = ["local", "tencent", "aliyun"];

const EXPLICIT_MARKS: Record<AigcStampMode, string> = {
  text: "本内容由 AI 辅助生成",
  image: "AI Generated",
  audio: "AI 语音合成",
  video: "AI 视频生成",
};

function randomHex(len: number): string {
  const chars = "0123456789abcdef";
  let result = "";
  for (let i = 0; i < len; i++) {
    result += chars[Math.floor(Math.random() * 16)];
  }
  return result;
}

function cuid(): string {
  return `cl${randomHex(6)}${randomHex(8)}`;
}

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(Math.floor(Math.random() * 14) + 8);
  return d.toISOString();
}

function sixMonthsFrom(date: string): string {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 6);
  return d.toISOString();
}

function generateStamps(count: number): AigcStamp[] {
  const stamps: AigcStamp[] = [];

  for (let i = 0; i < count; i++) {
    const mode = MODES[i % MODES.length];
    const provider = PROVIDERS[i % PROVIDERS.length];
    const stampedAt = daysAgo(Math.floor((i / count) * 25));

    stamps.push({
      id: cuid(),
      artifactId: `artifact_${randomHex(4)}`,
      mode,
      explicitMark: EXPLICIT_MARKS[mode],
      implicitMetadata: {
        provider: provider === "local" ? "VibeHub Local" : provider === "tencent" ? "Tencent Cloud" : "Alibaba Cloud",
        contentSerial: `CS-${randomHex(8).toUpperCase()}`,
        generatedAt: stampedAt,
        model: provider === "local" ? "vibehub-stamp-v1" : "cloud-aigc-v2",
      },
      providerCode: provider === "local" ? "VH-LOCAL" : provider === "tencent" ? "TENCENT-AIGC" : "ALIYUN-AIGC",
      contentSerial: `CS-${randomHex(8).toUpperCase()}`,
      providerApi: provider,
      stampedAt,
      retainedUntil: sixMonthsFrom(stampedAt),
    });
  }

  stamps.sort((a, b) => new Date(b.stampedAt).getTime() - new Date(a.stampedAt).getTime());
  return stamps;
}

export const mockAigcStamps: AigcStamp[] = generateStamps(24);
