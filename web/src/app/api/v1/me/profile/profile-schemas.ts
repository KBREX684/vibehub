import { z } from "zod";

const collaborationPreferenceSchema = z.enum(["open", "invite_only", "closed"]);

/** Accepts empty string / __CLEAR__ / http(s) URL for optional profile links (canonicalized via URL). */
const optionalLinkField = z.union([
  z.literal(""),
  z.literal("__CLEAR__"),
  z
    .string()
    .trim()
    .refine((s) => {
      try {
        const url = new URL(s);
        return ["http:", "https:"].includes(url.protocol);
      } catch {
        return false;
      }
    }, "Must be a valid http(s) URL")
    .transform((s) => new URL(s).href),
]);

/** PATCH: same link rules; optional fields. Invalid URL strings should be stripped by preprocess before parse. */
export const patchCreatorProfileSchema = z
  .object({
    headline: z.string().trim().min(1).max(200).optional(),
    bio: z.string().trim().min(1).max(2000).optional(),
    skills: z.array(z.string()).max(20).optional(),
    avatarUrl: optionalLinkField.optional(),
    websiteUrl: optionalLinkField.optional(),
    githubUrl: optionalLinkField.optional(),
    twitterUrl: optionalLinkField.optional(),
    linkedinUrl: optionalLinkField.optional(),
    collaborationPreference: collaborationPreferenceSchema.optional(),
  })
  .strict()
  .refine((o) => Object.keys(o).length > 0, { message: "Provide at least one field to update" });

export const createCreatorProfileSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "slug must be 3-48 characters")
    .max(48)
    .regex(/^[a-z0-9-]+$/, "slug may only contain lowercase letters, numbers, and hyphens"),
  headline: z.string().trim().min(1, "headline is required").max(200),
  bio: z.string().trim().min(1, "bio is required").max(2000),
  skills: z.array(z.string()).max(20).optional().default([]),
  avatarUrl: optionalLinkField.optional(),
  websiteUrl: optionalLinkField.optional(),
  githubUrl: optionalLinkField.optional(),
  twitterUrl: optionalLinkField.optional(),
  linkedinUrl: optionalLinkField.optional(),
  collaborationPreference: collaborationPreferenceSchema.optional().default("open"),
});

