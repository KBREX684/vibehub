/** P3-BE-4: event names for user webhooks + optional legacy notification URL. */
export const WEBHOOK_EVENT_NAMES = [
  "in_app_notification",
  "post.created",
  "project.created",
  "project.updated",
  "team.join_requested",
  "team.join_approved",
  "team.member_joined",
  "team.task_ready_for_review",
  "team.task_reviewed",
  "agent.confirmation_required",
  "subscription.past_due",
] as const;

export type WebhookEventName = (typeof WEBHOOK_EVENT_NAMES)[number];

export function isWebhookEventName(s: string): s is WebhookEventName {
  return (WEBHOOK_EVENT_NAMES as readonly string[]).includes(s);
}
