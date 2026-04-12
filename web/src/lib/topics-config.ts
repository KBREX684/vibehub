export interface CollectionTopicConfig {
  slug: string;
  title: string;
  description: string;
  /** Matches `Post.tags` / `Project.tags` (case-sensitive array membership). */
  tag: string;
}

export const COLLECTION_TOPICS: CollectionTopicConfig[] = [
  {
    slug: "agent-native",
    title: "Agent 原生实践",
    description: "AI Agent、工具链与可消费元数据：让讨论与项目对人与机器都好用。",
    tag: "agent",
  },
  {
    slug: "prompt-workflow",
    title: "Prompt 与工作流",
    description: "提示词模板、评测与工程化落地，偏 builder 向的沉淀。",
    tag: "prompt",
  },
  {
    slug: "community-showcase",
    title: "社区与橱窗",
    description: "社区运营、项目展示与早期增长相关主题。",
    tag: "community",
  },
];

export function getTopicConfigBySlug(slug: string): CollectionTopicConfig | undefined {
  return COLLECTION_TOPICS.find((t) => t.slug === slug);
}
