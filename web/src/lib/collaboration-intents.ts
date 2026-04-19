import type { CollaborationIntentStatus } from "@/lib/types";

export const INTENT_WHO_MARKER = "WHO:";
export const INTENT_WHY_MARKER = "WHY:";
export const INTENT_HOW_MARKER = "HOW:";

const CONTACT_PATTERNS = [
  /https?:\/\//i,
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /\b(?:\+?86[-\s]?)?(?:1[3-9]\d{9})\b/,
  /\b(?:wechat|weixin|wx|vx|微信)\b/i,
  /\b(?:qq|企鹅)\b/i,
];

export function composeStructuredIntentMessage(input: {
  pitch: string;
  whyYou: string;
  howCollab: string;
}) {
  return [
    `${INTENT_WHO_MARKER}\n${input.pitch.trim()}`,
    `${INTENT_WHY_MARKER}\n${input.whyYou.trim()}`,
    `${INTENT_HOW_MARKER}\n${input.howCollab.trim()}`,
  ].join("\n\n");
}

export function parseStructuredIntentMessage(message?: string | null) {
  const baseMessage = message?.trim() ?? "";
  if (
    baseMessage.includes(INTENT_WHO_MARKER) &&
    baseMessage.includes(INTENT_WHY_MARKER) &&
    baseMessage.includes(INTENT_HOW_MARKER)
  ) {
    const [, whoPart = ""] = baseMessage.split(INTENT_WHO_MARKER);
    const [pitchRaw = "", whyAndHow = ""] = whoPart.split(INTENT_WHY_MARKER);
    const [whyRaw = "", howRaw = ""] = whyAndHow.split(INTENT_HOW_MARKER);
    return {
      pitch: pitchRaw.trim(),
      whyYou: whyRaw.trim(),
      howCollab: howRaw.trim(),
    };
  }

  return {
    pitch: baseMessage,
    whyYou: "",
    howCollab: "",
  };
}

export function normalizeStructuredIntentFields(input: {
  pitch?: string | null;
  whyYou?: string | null;
  howCollab?: string | null;
  message?: string | null;
}) {
  const parsed = parseStructuredIntentMessage(input.message);
  return {
    pitch: input.pitch?.trim() || parsed.pitch,
    whyYou: input.whyYou?.trim() || parsed.whyYou,
    howCollab: input.howCollab?.trim() || parsed.howCollab,
  };
}

export function deriveIntentExpiresAt(createdAt: string | Date) {
  const value = new Date(createdAt);
  value.setDate(value.getDate() + 30);
  return value.toISOString();
}

export function isIntentExpired(expiresAt?: string | null) {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() < Date.now();
}

export function normalizeCollaborationIntentStatus(
  status: string,
  expiresAt?: string | null
): CollaborationIntentStatus {
  if (status === "approved" || status === "rejected" || status === "ignored" || status === "blocked") {
    return status;
  }
  if (status === "expired") {
    return "expired";
  }
  if (isIntentExpired(expiresAt)) {
    return "expired";
  }
  return "pending";
}

export function containsDirectContactInfo(text: string) {
  const value = text.trim();
  return CONTACT_PATTERNS.some((pattern) => pattern.test(value));
}

export function findIntentContactViolation(input: {
  pitch: string;
  whyYou: string;
  howCollab: string;
}) {
  if (containsDirectContactInfo(input.pitch)) return "pitch";
  if (containsDirectContactInfo(input.whyYou)) return "whyYou";
  if (containsDirectContactInfo(input.howCollab)) return "howCollab";
  return null;
}
