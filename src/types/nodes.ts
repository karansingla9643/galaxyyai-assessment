import { z } from "zod";

// ── Field types for Request-Inputs node ──────────────────────────────────────
export const FieldTypeSchema = z.enum(["text_field", "image_field"]);
export type FieldType = z.infer<typeof FieldTypeSchema>;

export const InputFieldSchema = z.object({
  id: z.string(),
  type: FieldTypeSchema,
  label: z.string(),
  value: z.string().optional(),
});
export type InputField = z.infer<typeof InputFieldSchema>;

// ── Node data shapes ─────────────────────────────────────────────────────────
export const RequestInputsDataSchema = z.object({
  nodeType: z.literal("request-inputs"),
  fields: z.array(InputFieldSchema),
});

export const CropImageDataSchema = z.object({
  nodeType: z.literal("crop-image"),
  label: z.string().optional(),
  inputImage: z.string().optional(),      // URL or connected handle value
  xPosition: z.number().min(0).max(100).default(0),
  yPosition: z.number().min(0).max(100).default(0),
  width: z.number().min(0).max(100).default(100),
  height: z.number().min(0).max(100).default(100),
  outputImage: z.string().optional(),     // result URL after execution
  status: z.enum(["idle", "running", "success", "error"]).default("idle"),
  error: z.string().optional(),
});

export const GeminiDataSchema = z.object({
  nodeType: z.literal("gemini"),
  label: z.string().optional(),
  model: z.string().default("gemini-2.5-flash"),
  prompt: z.string().optional(),
  systemPrompt: z.string().optional(),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().min(1).max(8192).default(2048),
  // Connected handle inputs (resolved at runtime)
  imageUrls: z.array(z.string()).optional(),
  videoUrl: z.string().optional(),
  audioUrl: z.string().optional(),
  fileUrl: z.string().optional(),
  // Output
  response: z.string().optional(),
  status: z.enum(["idle", "running", "success", "error"]).default("idle"),
  error: z.string().optional(),
});

export const ResponseDataSchema = z.object({
  nodeType: z.literal("response"),
  value: z.string().optional(),
  imageUrl: z.string().optional(),
});

export const ExtractAudioDataSchema = z.object({
  nodeType: z.literal("extract-audio"),
  format: z.enum(["mp3", "wav", "aac"]).default("mp3"),
  outputAudio: z.string().optional(),
  transcription: z.string().optional(),
  status: z.enum(["idle", "running", "success", "error"]).default("idle"),
  error: z.string().optional(),
});

export const NodeDataSchema = z.discriminatedUnion("nodeType", [
  RequestInputsDataSchema,
  CropImageDataSchema,
  GeminiDataSchema,
  ExtractAudioDataSchema,
  ResponseDataSchema,
]);

export type RequestInputsData = z.infer<typeof RequestInputsDataSchema>;
export type CropImageData = z.infer<typeof CropImageDataSchema>;
export type GeminiData = z.infer<typeof GeminiDataSchema>;
export type ExtractAudioData = z.infer<typeof ExtractAudioDataSchema>;
export type ResponseData = z.infer<typeof ResponseDataSchema>;
export type NodeData = z.infer<typeof NodeDataSchema>;

// ── Handle port types (for type-safe connections) ────────────────────────────
export type PortType = "text" | "image" | "video" | "audio" | "file" | "any";

export interface HandleMeta {
  id: string;
  label: string;
  portType: PortType;
  required?: boolean;
}

export const NODE_HANDLE_TYPES: Record<string, { inputs: HandleMeta[]; outputs: HandleMeta[] }> = {
  "request-inputs": {
    inputs: [],
    outputs: [], // dynamic — generated per field
  },
  "crop-image": {
    inputs: [
      { id: "inputImage", label: "Input Image", portType: "image", required: true },
      { id: "xPosition", label: "X Position (%)", portType: "any" },
      { id: "yPosition", label: "Y Position (%)", portType: "any" },
      { id: "width", label: "Width (%)", portType: "any" },
      { id: "height", label: "Height (%)", portType: "any" },
    ],
    outputs: [{ id: "outputImage", label: "Output Image", portType: "image" }],
  },
  "gemini": {
    inputs: [
      { id: "prompt", label: "Prompt", portType: "text", required: true },
      { id: "systemPrompt", label: "System Prompt", portType: "text" },
      { id: "image", label: "Image (Vision)", portType: "image" },
      { id: "video", label: "Video", portType: "video" },
      { id: "audio", label: "Audio", portType: "audio" },
      { id: "file", label: "File", portType: "file" },
    ],
    outputs: [{ id: "response", label: "Response", portType: "text" }],
  },
  "extract-audio": {
    inputs: [
      { id: "video", label: "Video Input", portType: "video" },
    ],
    outputs: [
      { id: "audio", label: "Audio Output", portType: "audio" },
    ],
  },
  "response": {
    inputs: [{ id: "input", label: "Result", portType: "any" }],
    outputs: [],
  },
};

// ── Compatible port type pairs ───────────────────────────────────────────────
export function arePortTypesCompatible(source: PortType, target: PortType): boolean {
  if (source === "any" || target === "any") return true;
  return source === target;
}
