export interface MockApiKey {
  id: string;
  userId: string;
  label: string;
  keyHash: string;
  prefix: string;
  lastUsedAt?: string;
  revokedAt?: string;
  createdAt: string;
}

export const mockApiKeys: MockApiKey[] = [];
