import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  project: process.env.TRIGGER_PROJECT_ID ?? "proj_REPLACE_ME",
  runtime: "node",
  logLevel: "log",
  maxDuration: 300,
  dirs: ["./src/trigger"],
});
