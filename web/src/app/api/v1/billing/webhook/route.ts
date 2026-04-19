import type { NextRequest } from "next/server";
import { detectPaymentProviderFromWebhook, getPaymentProvider } from "@/lib/billing/payment-provider";
import { apiError } from "@/lib/response";
import { getRequestLogger, serializeError } from "@/lib/logger";
import { emitSystemAlert } from "@/lib/system-alerts";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const providerId = detectPaymentProviderFromWebhook(request.headers, rawBody);
  if (!providerId) {
    return apiError({ code: "UNKNOWN_PAYMENT_PROVIDER", message: "无法识别支付回调来源" }, 400);
  }

  const provider = getPaymentProvider(providerId);
  try {
    const result = await provider.handleWebhook({
      rawBody,
      headers: request.headers,
      requestUrl: request.url,
    });
    return new Response(result.body, {
      status: result.status,
      headers: result.contentType ? { "content-type": result.contentType } : undefined,
    });
  } catch (err) {
    const log = getRequestLogger(request, { route: "POST /api/v1/billing/webhook", paymentProvider: providerId });
    log.error({ err: serializeError(err) }, "payment webhook failed");
    await emitSystemAlert({
      kind: "billing.webhook_failed",
      severity: "critical",
      message: `Billing webhook failed for provider ${providerId}.`,
      dedupeKey: `billing-webhook-failed:${providerId}`,
      metadata: {
        providerId,
        error: err instanceof Error ? err.message : String(err),
      },
    });
    if (providerId === "alipay") {
      return new Response("failure", { status: 500, headers: { "content-type": "text/plain" } });
    }
    return apiError({ code: "WEBHOOK_HANDLER_FAILED", message: "支付回调处理失败" }, 500);
  }
}
