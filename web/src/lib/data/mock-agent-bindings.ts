import type { AgentBindingSummary } from "@/lib/types";

export interface MockAgentBinding extends AgentBindingSummary {
  userId: string;
}

export const mockAgentBindings: MockAgentBinding[] = [];
