import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AIGC Policy — VibeHub",
  description: "How VibeHub handles AI-generated content, recommendation, agent writes, and review tooling.",
};

const sections = [
  {
    title: "平台 AI 的角色边界",
    body:
      "VibeHub 当前把 AI 用于治理、摘要、审核建议和协作辅助，不把平台定位为代写作品或无限生成内容的产品。平台侧推荐流采用标签与互动统计模型，不使用 LLM 生成排序结果。",
  },
  {
    title: "用户自带模型",
    body:
      "用户可以绑定自己的模型密钥，通过 Agent、MCP 或外部工具访问 VibeHub。平台不为用户侧推理买单，也不会替用户默认调用跨境模型。涉及跨境模型的场景需要用户自行确认并承担相应合规责任。",
  },
  {
    title: "Agent 写入与人工确认",
    body:
      "Agent 在团队内执行写操作时必须受角色、scope、审计和人工确认约束。高风险动作不会因为是 Agent 发起就自动放行，平台会保留独立审计记录和确认链路。",
  },
  {
    title: "AIGC 标记与审核",
    body:
      "平台保留对明显 AI 生成、批量自动化或误导性内容进行标记、限流、下架或要求补充说明的权利。管理员可以参考 AI 审核建议，但最终治理决定仍由人工作出。",
  },
  {
    title: "推荐与可解释性",
    body:
      "当前推荐流主要依据兴趣标签、关注关系、点赞、收藏和近期互动，不使用黑箱式 LLM 生成推荐结果。产品会持续保留可说明的推荐信号，并在需要时补充备案和合规说明。",
  },
  {
    title: "合规与备案",
    body:
      "AIGC、推荐算法、数据跨境和模型供应商使用情况会纳入上线前合规清单，并在法务和运营核验后再进入正式生产发布。未完成外部备案或审校的能力不会被视为正式合规上线。",
  },
];

export default function AigcPage() {
  return (
    <main className="container py-16 max-w-3xl">
      <h1 className="text-3xl font-semibold text-[var(--color-text-primary)] mb-2">AIGC 与 Agent 使用说明</h1>
      <p className="text-sm text-[var(--color-text-muted)] mb-10">Last updated: April 17, 2026</p>

      <div className="space-y-6">
        {sections.map((section) => (
          <section key={section.title} className="card p-6">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">{section.title}</h2>
            <p className="text-sm text-[var(--color-text-secondary)] m-0 leading-6">{section.body}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
