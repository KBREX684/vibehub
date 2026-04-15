export type WebhookDeliverJob = {
  userId: string;
  event: string;
  body: string;
  targetUrl: string;
  secret?: string;
  idempotencyKey: string;
  webhookEndpointId?: string | null;
};
