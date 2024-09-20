import { OpenAPIRoute } from "chanfana";
import { Context } from "hono";
import { Webhook } from "svix";
import { Env, TranscriptWebhook } from "../types";
import { z } from "zod";

export class Transcripts extends OpenAPIRoute {
  schema = {
    tags: ["Tasks"],
    summary: "Process transcript webhooks",
    request: {
      body: {
        content: {
          "application/json": {
            schema: TranscriptWebhook,
          },
        },
      },
      headers: z.object({
        "svix-id": z.string(),
        "svix-signature": z.string(),
        "svix-timestamp": z.string(),
        "user-agent": z.string(),
      }),
    },
    responses: {
      "201": {
        description: "The transcript webhook was processed successfully",
      },
    },
  };

  async handle(c: Context<{ Bindings: Env }>) {
    // Get validated data
    const data = await this.getValidatedData<typeof this.schema>();

    // Verify the webhook signature
    const wh = new Webhook(c.env.SKRIVER_WEBHOOK_SECRET);
    try {
      wh.verify(JSON.stringify(data.body), data.headers);
    } catch (e) {
      console.error(e);
      return new Response("Bad Request", { status: 400 });
    }

    // Ignore non-completed transcripts
    if (data.body.event_type !== "transcript.created") {
      return new Response("Ignored event type", { status: 200 });
    }

    // Get transcript from the Skriver API
    const transcript = await fetch(
      `${c.env.SKRIVER_API_URL}/v1/transcripts/${data.body.id}`,
      { headers: { "X-Api-Key": c.env.SKRIVER_API_KEY } },
    ).then((res) => res.json());

    // Run the transcript through the AI model
    const response = await c.env.AI.run(
      "@hf/thebloke/neural-chat-7b-v3-1-awq",
      {
        messages: [
          {
            role: "system",
            content:
              "You summarize conversations. You mention the participants, metadata and date.",
          },
          {
            role: "user",
            content: JSON.stringify(transcript),
          },
        ],
      },
    );

    // Send the summary to Slack
    await fetch(c.env.SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: (response as any).response }),
    });

    return new Response(null, { status: 201 });
  }
}
