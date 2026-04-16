import { Prisma } from "@prisma/client";
import { randomBytes } from "crypto";
import { DEFAULT_API_KEY_SCOPES, normalizeApiKeyScopes } from "@/lib/api-key-scopes";
import { enterpriseProfileSelect, sessionEnterpriseFromProfile } from "@/lib/enterprise-profile-db";
import { isMockDataEnabled } from "@/lib/runtime-mode";
import { getUserTier as getUserTierFromDomain } from "@/lib/repositories/billing.repository";
import { getPrisma } from "@/lib/repository";
import { hashApiKeyToken } from "@/lib/api-key-crypto";
import {
  generateOAuthAccessToken,
  generateOAuthAuthorizationCode,
  generateOAuthClientCredentials,
  hashOAuthOpaqueToken,
  isOAuthAccessTokenFormat,
} from "@/lib/oauth-crypto";
import {
  mockOAuthAccessTokens,
  mockOAuthApps,
  mockOAuthAuthorizationCodes,
  mockUsers,
} from "@/lib/data/mock-data";
import type { OAuthAppCreated, OAuthAppSummary, SessionUser } from "@/lib/types";

function slugifyOAuthApp(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || `app-${randomBytes(3).toString("hex")}`;
}

function cleanRedirectUris(input: string[]): string[] {
  const set = new Set<string>();
  for (const item of input) {
    const trimmed = item.trim();
    if (!trimmed) continue;
    const url = new URL(trimmed);
    if (!(url.protocol === "https:" || url.hostname === "localhost")) {
      throw new Error("INVALID_OAUTH_REDIRECT_URI");
    }
    set.add(url.toString());
  }
  if (set.size === 0) {
    throw new Error("OAUTH_REDIRECT_URI_REQUIRED");
  }
  return [...set];
}

function toOAuthAppSummary(row: {
  id: string;
  name: string;
  slug: string;
  description?: string | null | undefined;
  clientId: string;
  redirectUris: string[];
  scopes: string[];
  active: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}): OAuthAppSummary {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? undefined,
    clientId: row.clientId,
    redirectUris: [...row.redirectUris],
    scopes: [...row.scopes],
    active: row.active,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
  };
}

export async function listUserOAuthApps(userId: string): Promise<OAuthAppSummary[]> {
  if (isMockDataEnabled()) {
    return mockOAuthApps
      .filter((item) => item.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(toOAuthAppSummary);
  }

  const prisma = await getPrisma();
  const rows = await prisma.oAuthApp.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toOAuthAppSummary);
}

export async function createUserOAuthApp(params: {
  userId: string;
  name: string;
  description?: string;
  redirectUris: string[];
  scopes?: string[];
}): Promise<OAuthAppCreated> {
  const name = params.name.trim().slice(0, 80);
  if (!name) throw new Error("INVALID_OAUTH_APP_NAME");
  const description = params.description?.trim().slice(0, 500) || undefined;
  const redirectUris = cleanRedirectUris(params.redirectUris);
  const scopes = normalizeApiKeyScopes(params.scopes);
  const slugBase = slugifyOAuthApp(name);
  const { clientId, clientSecret, clientSecretHash } = generateOAuthClientCredentials();
  const now = new Date().toISOString();

  if (isMockDataEnabled()) {
    const slug = mockOAuthApps.some((item) => item.userId === params.userId && item.slug === slugBase)
      ? `${slugBase}-${randomBytes(2).toString("hex")}`
      : slugBase;
    const row = {
      id: `oauth_app_${Date.now()}_${randomBytes(3).toString("hex")}`,
      userId: params.userId,
      name,
      slug,
      description,
      clientId,
      clientSecretHash,
      redirectUris,
      scopes,
      active: true,
      createdAt: now,
      updatedAt: now,
    };
    mockOAuthApps.unshift(row);
    return {
      ...toOAuthAppSummary(row),
      clientSecret,
    };
  }

  const prisma = await getPrisma();
  const existing = await prisma.oAuthApp.findMany({
    where: { userId: params.userId, slug: { startsWith: slugBase } },
    select: { slug: true },
  });
  const slug =
    existing.some((item) => item.slug === slugBase)
      ? `${slugBase}-${existing.length + 1}`
      : slugBase;
  const row = await prisma.oAuthApp.create({
    data: {
      userId: params.userId,
      name,
      slug,
      description: description ?? null,
      clientId,
      clientSecretHash,
      redirectUris,
      scopes,
      active: true,
    },
  });
  return {
    ...toOAuthAppSummary(row),
    clientSecret,
  };
}

export async function updateUserOAuthApp(params: {
  userId: string;
  appId: string;
  name?: string;
  description?: string | null;
  redirectUris?: string[];
  scopes?: string[];
  active?: boolean;
}): Promise<OAuthAppSummary> {
  const redirectUris = params.redirectUris ? cleanRedirectUris(params.redirectUris) : undefined;
  const scopes = params.scopes ? normalizeApiKeyScopes(params.scopes) : undefined;
  if (isMockDataEnabled()) {
    const row = mockOAuthApps.find((item) => item.id === params.appId && item.userId === params.userId);
    if (!row) throw new Error("OAUTH_APP_NOT_FOUND");
    if (params.name !== undefined) {
      const name = params.name.trim().slice(0, 80);
      if (!name) throw new Error("INVALID_OAUTH_APP_NAME");
      row.name = name;
      row.slug = slugifyOAuthApp(name);
    }
    if (params.description !== undefined) row.description = params.description?.trim().slice(0, 500);
    if (redirectUris) row.redirectUris = redirectUris;
    if (scopes) row.scopes = scopes;
    if (params.active !== undefined) row.active = params.active;
    row.updatedAt = new Date().toISOString();
    return toOAuthAppSummary(row);
  }

  const prisma = await getPrisma();
  const existing = await prisma.oAuthApp.findFirst({
    where: { id: params.appId, userId: params.userId },
  });
  if (!existing) throw new Error("OAUTH_APP_NOT_FOUND");
  const data: Prisma.OAuthAppUpdateInput = {};
  if (params.name !== undefined) {
    const name = params.name.trim().slice(0, 80);
    if (!name) throw new Error("INVALID_OAUTH_APP_NAME");
    data.name = name;
    data.slug = slugifyOAuthApp(name);
  }
  if (params.description !== undefined) data.description = params.description?.trim().slice(0, 500) ?? null;
  if (redirectUris) data.redirectUris = redirectUris;
  if (scopes) data.scopes = scopes;
  if (params.active !== undefined) data.active = params.active;
  const row = await prisma.oAuthApp.update({
    where: { id: existing.id },
    data,
  });
  return toOAuthAppSummary(row);
}

export async function deleteUserOAuthApp(params: { userId: string; appId: string }): Promise<void> {
  if (isMockDataEnabled()) {
    const index = mockOAuthApps.findIndex((item) => item.id === params.appId && item.userId === params.userId);
    if (index < 0) throw new Error("OAUTH_APP_NOT_FOUND");
    mockOAuthApps.splice(index, 1);
    return;
  }

  const prisma = await getPrisma();
  const existing = await prisma.oAuthApp.findFirst({
    where: { id: params.appId, userId: params.userId },
    select: { id: true },
  });
  if (!existing) throw new Error("OAUTH_APP_NOT_FOUND");
  await prisma.oAuthApp.delete({ where: { id: existing.id } });
}

export async function getOAuthAppAuthorizationCandidate(params: {
  clientId: string;
  redirectUri: string;
  requestedScopes: string[];
}): Promise<OAuthAppSummary | null> {
  const requestedScopes = params.requestedScopes.length
    ? normalizeApiKeyScopes(params.requestedScopes)
    : [...DEFAULT_API_KEY_SCOPES];
  if (isMockDataEnabled()) {
    const row = mockOAuthApps.find((item) => item.clientId === params.clientId && item.active);
    if (!row) return null;
    if (!row.redirectUris.includes(params.redirectUri)) throw new Error("OAUTH_REDIRECT_URI_MISMATCH");
    for (const scope of requestedScopes) {
      if (!row.scopes.includes(scope)) throw new Error("OAUTH_SCOPE_NOT_ALLOWED");
    }
    return toOAuthAppSummary(row);
  }

  const prisma = await getPrisma();
  const row = await prisma.oAuthApp.findUnique({
    where: { clientId: params.clientId },
  });
  if (!row || !row.active) return null;
  if (!row.redirectUris.includes(params.redirectUri)) throw new Error("OAUTH_REDIRECT_URI_MISMATCH");
  for (const scope of requestedScopes) {
    if (!row.scopes.includes(scope)) throw new Error("OAUTH_SCOPE_NOT_ALLOWED");
  }
  return toOAuthAppSummary(row);
}

export async function issueOAuthAuthorizationCode(params: {
  clientId: string;
  userId: string;
  redirectUri: string;
  scopes: string[];
}): Promise<string> {
  const scopes = params.scopes.length ? normalizeApiKeyScopes(params.scopes) : [...DEFAULT_API_KEY_SCOPES];
  const { code, codeHash } = generateOAuthAuthorizationCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  if (isMockDataEnabled()) {
    const app = mockOAuthApps.find((item) => item.clientId === params.clientId && item.active);
    if (!app) throw new Error("OAUTH_APP_NOT_FOUND");
    if (!app.redirectUris.includes(params.redirectUri)) throw new Error("OAUTH_REDIRECT_URI_MISMATCH");
    mockOAuthAuthorizationCodes.unshift({
      id: `oauth_code_${Date.now()}_${randomBytes(3).toString("hex")}`,
      appId: app.id,
      userId: params.userId,
      codeHash,
      redirectUri: params.redirectUri,
      scopes,
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString(),
    });
    return code;
  }

  const prisma = await getPrisma();
  const app = await prisma.oAuthApp.findUnique({
    where: { clientId: params.clientId },
    select: { id: true, redirectUris: true, active: true, scopes: true },
  });
  if (!app || !app.active) throw new Error("OAUTH_APP_NOT_FOUND");
  if (!app.redirectUris.includes(params.redirectUri)) throw new Error("OAUTH_REDIRECT_URI_MISMATCH");
  for (const scope of scopes) {
    if (!app.scopes.includes(scope)) throw new Error("OAUTH_SCOPE_NOT_ALLOWED");
  }
  await prisma.oAuthAuthorizationCode.create({
    data: {
      appId: app.id,
      userId: params.userId,
      codeHash,
      redirectUri: params.redirectUri,
      scopes,
      expiresAt,
    },
  });
  return code;
}

export async function exchangeOAuthAuthorizationCode(params: {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
}): Promise<{ accessToken: string; expiresIn: number; scopes: string[] }> {
  const secretHash = hashApiKeyToken(params.clientSecret);
  const codeHash = hashOAuthOpaqueToken(params.code);
  const expiresIn = 60 * 60 * 2;
  const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);
  const { token, prefix, tokenHash } = generateOAuthAccessToken();

  if (isMockDataEnabled()) {
    const app = mockOAuthApps.find(
      (item) => item.clientId === params.clientId && item.clientSecretHash === secretHash && item.active
    );
    if (!app) throw new Error("OAUTH_INVALID_CLIENT");
    const authCode = mockOAuthAuthorizationCodes.find(
      (item) => item.codeHash === codeHash && item.appId === app.id && !item.usedAt
    );
    if (!authCode) throw new Error("OAUTH_INVALID_CODE");
    if (authCode.redirectUri !== params.redirectUri) throw new Error("OAUTH_REDIRECT_URI_MISMATCH");
    if (new Date(authCode.expiresAt) < new Date()) throw new Error("OAUTH_CODE_EXPIRED");
    authCode.usedAt = new Date().toISOString();
    mockOAuthAccessTokens.unshift({
      id: `oauth_token_${Date.now()}_${randomBytes(3).toString("hex")}`,
      appId: app.id,
      userId: authCode.userId,
      tokenHash,
      prefix,
      scopes: [...authCode.scopes],
      expiresAt: tokenExpiresAt.toISOString(),
      createdAt: new Date().toISOString(),
    });
    return { accessToken: token, expiresIn, scopes: [...authCode.scopes] };
  }

  const prisma = await getPrisma();
  const app = await prisma.oAuthApp.findUnique({
    where: { clientId: params.clientId },
    select: { id: true, clientSecretHash: true, active: true },
  });
  if (!app || !app.active || app.clientSecretHash !== secretHash) {
    throw new Error("OAUTH_INVALID_CLIENT");
  }

  const authCode = await prisma.oAuthAuthorizationCode.findFirst({
    where: { codeHash, appId: app.id, usedAt: null },
  });
  if (!authCode) throw new Error("OAUTH_INVALID_CODE");
  if (authCode.redirectUri !== params.redirectUri) throw new Error("OAUTH_REDIRECT_URI_MISMATCH");
  if (authCode.expiresAt < new Date()) throw new Error("OAUTH_CODE_EXPIRED");

  await prisma.$transaction(async (tx) => {
    await tx.oAuthAuthorizationCode.update({
      where: { id: authCode.id },
      data: { usedAt: new Date() },
    });
    await tx.oAuthAccessToken.create({
      data: {
        appId: app.id,
        userId: authCode.userId,
        tokenHash,
        prefix,
        scopes: authCode.scopes,
        expiresAt: tokenExpiresAt,
      },
    });
  });
  return { accessToken: token, expiresIn, scopes: [...authCode.scopes] };
}

export async function getSessionUserFromOAuthAccessToken(plaintextToken: string): Promise<SessionUser | null> {
  if (!plaintextToken || !isOAuthAccessTokenFormat(plaintextToken)) return null;
  const tokenHash = hashOAuthOpaqueToken(plaintextToken);

  if (isMockDataEnabled()) {
    const row = mockOAuthAccessTokens.find((item) => item.tokenHash === tokenHash && !item.revokedAt);
    if (!row) return null;
    if (new Date(row.expiresAt) < new Date()) return null;
    row.lastUsedAt = new Date().toISOString();
    const user = mockUsers.find((item) => item.id === row.userId);
    const app = mockOAuthApps.find((item) => item.id === row.appId && item.active);
    if (!user || !app) return null;
    return {
      userId: user.id,
      role: user.role,
      name: user.name,
      apiKeyScopes: row.scopes,
      oauthAppId: app.id,
      oauthAppClientId: app.clientId,
      enterpriseStatus: user.enterpriseStatus ?? "none",
      enterpriseOrganization: user.enterpriseOrganization ?? undefined,
      enterpriseWebsite: user.enterpriseWebsite ?? undefined,
    };
  }

  const prisma = await getPrisma();
  const row = await prisma.oAuthAccessToken.findFirst({
    where: { tokenHash, revokedAt: null },
    include: {
      app: { select: { id: true, clientId: true, active: true } },
    },
  });
  if (!row || !row.app.active || row.expiresAt < new Date()) return null;
  await prisma.oAuthAccessToken.update({
    where: { id: row.id },
    data: { lastUsedAt: new Date() },
  });
  const user = await prisma.user.findUnique({
    where: { id: row.userId },
    select: {
      id: true,
      name: true,
      role: true,
      enterpriseProfile: { select: enterpriseProfileSelect },
    },
  });
  if (!user) return null;
  const subscriptionTier = await getUserTierFromDomain(user.id);
  const enterprise = sessionEnterpriseFromProfile(user.enterpriseProfile ?? undefined);
  return {
    userId: user.id,
    role: user.role,
    name: user.name,
    subscriptionTier,
    apiKeyScopes: row.scopes,
    oauthAppId: row.app.id,
    oauthAppClientId: row.app.clientId,
    enterpriseStatus: enterprise.enterpriseStatus,
    enterpriseOrganization: enterprise.enterpriseOrganization,
    enterpriseWebsite: enterprise.enterpriseWebsite,
  };
}
