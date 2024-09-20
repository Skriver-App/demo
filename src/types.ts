import { Str, Uuid } from "chanfana";
import { z } from "zod";

export const TranscriptWebhook = z.object({
  event_type: Str(),
  id: Uuid(),
});

export interface Env {
  AI: Ai;
  SLACK_WEBHOOK_URL: string;
  SKRIVER_API_URL: string;
  SKRIVER_API_KEY: string;
  SKRIVER_WEBHOOK_SECRET: string;
}
