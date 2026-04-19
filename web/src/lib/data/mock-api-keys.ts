import { createPersistedArray } from "@/lib/data/mock-persist";

export interface MockApiKey {
  id: string;
  userId: string;
  agentBindingId?: string;
  label: string;
  keyHash: string;
  prefix: string;
  scopes: string[];
  lastUsedAt?: string;
  revokedAt?: string;
  expiresAt?: string;
  createdAt: string;
}

export const mockApiKeys: MockApiKey[] = createPersistedArray<MockApiKey>("apiKeys");
