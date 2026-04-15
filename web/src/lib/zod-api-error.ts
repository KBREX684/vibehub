import { ZodError } from "zod";
import { apiError } from "@/lib/response";

/** First issue message for API 400 responses (P1-BE-1). */
export function apiErrorFromZod(err: ZodError) {
  const first = err.issues[0];
  return apiError(
    {
      code: "VALIDATION_ERROR",
      message: first?.message ?? "Invalid input",
      details: err.flatten(),
    },
    400
  );
}
