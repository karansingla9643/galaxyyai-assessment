// Trigger.dev v3 SDK — no TriggerClient constructor needed
// Tasks are registered via task() in the trigger/ directory
// This file just re-exports the tasks for use in API routes

export { cropImageTask } from "./cropImageTask";
export { geminiTask } from "./geminiTask";
