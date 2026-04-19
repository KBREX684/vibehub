import type { AgentBindingSummary } from "@/lib/types";
import { createPersistedArray } from "@/lib/data/mock-persist";

export interface MockAgentBinding extends AgentBindingSummary {
  userId: string;
}

export const mockAgentBindings: MockAgentBinding[] = createPersistedArray<MockAgentBinding>(
  "agentBindings"
);
