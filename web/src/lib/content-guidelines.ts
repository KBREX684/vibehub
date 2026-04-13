/**
 * P1 content guidelines — project submission templates, quality standards,
 * and review rules encoded as structured configuration.
 *
 * These are consumed by:
 * - Backend validation (createProject, createPost)
 * - Admin moderation queue (review checklists)
 * - Future: exposed via API for client-side form hints
 */

export const PROJECT_SUBMISSION_TEMPLATE = {
  required: {
    title: { min: 3, max: 120, hint: "Clear, descriptive project name" },
    oneLiner: { min: 5, max: 200, hint: "One-sentence value proposition" },
    description: {
      min: 20,
      hint: "Describe the problem, your solution, current state, and what makes it unique",
      sections: [
        "Problem definition",
        "Solution approach",
        "Current progress and status",
        "Key technical decisions",
      ],
    },
  },
  recommended: {
    techStack: { hint: "List frameworks, languages, and key libraries (e.g. Next.js, PostgreSQL)" },
    tags: { hint: "2-5 lowercase tags for discoverability (e.g. community, agent, showcase)" },
    demoUrl: { hint: "Link to a live demo, video walkthrough, or screenshot gallery" },
    status: {
      options: ["idea", "building", "launched", "paused"] as const,
      hint: "Honest assessment of project maturity",
    },
  },
} as const;

export const POST_SUBMISSION_GUIDELINES = {
  required: {
    title: { min: 3, max: 120, hint: "Descriptive title that tells readers what to expect" },
    body: {
      min: 10,
      hint: "Share practical insights, specific examples, or concrete questions",
      goodExamples: [
        "How I built an Agent-ready project page (with schema examples)",
        "Comparing Supabase vs Prisma for solo-dev MVPs — benchmarks",
        "Weekly VibeCoding stack review: what shipped this week",
      ],
      avoidExamples: [
        "Check out my project (link only, no context)",
        "AI is amazing (low-effort opinion without substance)",
      ],
    },
  },
  recommended: {
    tags: { hint: "1-5 tags to help others find your post (e.g. agent, tech-stack, prompt)" },
  },
  types: [
    { slug: "question", label: "Question / help request" },
    { slug: "retrospective", label: "Project retrospective / post-mortem" },
    { slug: "project-log", label: "Project build log / devlog" },
    { slug: "tool-review", label: "Tool or framework evaluation" },
    { slug: "architecture", label: "Architecture discussion" },
    { slug: "showcase", label: "Project showcase or demo" },
  ],
} as const;

export const QUALITY_STANDARDS = {
  project: {
    fieldCompleteness: {
      minimum: ["title", "oneLiner", "description", "status"],
      recommended: ["techStack", "tags", "demoUrl"],
      targetCompletionRate: 0.8,
    },
    contentQuality: [
      "Description should explain both the problem and the solution",
      "Tech stack should list actual technologies used, not aspirational",
      "Status should accurately reflect current state",
      "Demo URL should be accessible and functional when provided",
    ],
  },
  post: {
    contentQuality: [
      "Posts should contain original insights or specific questions",
      "Link-only posts without context will be held for review",
      "Commercial promotion without substantive content will be rejected",
      "Code examples should be formatted and contextualized",
    ],
  },
} as const;

export const REVIEW_RULES = {
  autoApprove: false,
  moderationFlow: "new_post_submission",
  reviewCriteria: [
    { rule: "no_spam", description: "No unsolicited commercial promotion or link farming" },
    { rule: "no_harmful_content", description: "No illegal, harassing, or discriminatory content" },
    { rule: "minimum_effort", description: "Post must contain substantive content beyond a single link" },
    { rule: "on_topic", description: "Content should relate to development, VibeCoding, or builder community" },
    { rule: "no_duplicate", description: "Near-duplicate posts should be consolidated or rejected" },
  ],
  escalationPolicy: {
    reportThreshold: 3,
    autoHideOnReports: 5,
    appealWindow: "7d",
  },
} as const;

export const CONTENT_GUIDELINES_API_PAYLOAD = {
  projectTemplate: PROJECT_SUBMISSION_TEMPLATE,
  postGuidelines: POST_SUBMISSION_GUIDELINES,
  qualityStandards: QUALITY_STANDARDS,
  reviewRules: {
    moderationFlow: REVIEW_RULES.moderationFlow,
    criteria: REVIEW_RULES.reviewCriteria.map((r) => r.description),
  },
} as const;
