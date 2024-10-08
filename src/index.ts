import { fromHono } from "chanfana";
import { Hono } from "hono";
import { Transcripts } from "./endpoints/transcripts";

// Start a Hono app
const app = new Hono();

// Setup OpenAPI registry
const openapi = fromHono(app, {
  docs_url: "/",
});

// Register OpenAPI endpoints
openapi.post("/transcripts", Transcripts);

// Export the Hono app
export default app;
