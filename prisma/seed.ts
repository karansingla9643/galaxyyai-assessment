import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding sample workflow...");

  // Check if sample workflow already exists
  const existing = await prisma.workflow.findFirst({
    where: { isSystem: true, name: "AI Image Analyzer" },
  });

  if (existing) {
    console.log("Sample workflow already exists. Skipping.");
    return;
  }

  const sampleFlow = {
    nodes: [
      {
        id: "request-inputs-1",
        type: "requestInputs",
        position: { x: 80, y: 220 },
        data: {
          nodeType: "request-inputs",
          fields: [
            { id: "f1", type: "text_field", label: "text_field", value: "Describe this image in detail." },
            { id: "f2", type: "image_field", label: "image_field" },
          ],
        },
        deletable: false,
      },
      {
        id: "crop-image-1",
        type: "cropImage",
        position: { x: 380, y: 120 },
        data: {
          nodeType: "crop-image",
          label: "Crop Image",
          xPosition: 0,
          yPosition: 0,
          width: 80,
          height: 80,
          status: "idle",
        },
      },
      {
        id: "gemini-1",
        type: "geminiNode",
        position: { x: 660, y: 200 },
        data: {
          nodeType: "gemini",
          label: "Analyze Image",
          model: "gemini-2.0-flash-exp",
          prompt: "",
          systemPrompt: "You are an expert image analyst. Provide detailed, structured analysis.",
          temperature: 0.7,
          maxTokens: 2048,
          status: "idle",
        },
      },
      {
        id: "response-1",
        type: "responseNode",
        position: { x: 960, y: 220 },
        data: { nodeType: "response" },
        deletable: false,
      },
    ],
    edges: [
      {
        id: "e-req-crop",
        source: "request-inputs-1",
        sourceHandle: "image_field",
        target: "crop-image-1",
        targetHandle: "inputImage",
        type: "smoothstep",
        animated: true,
        style: { stroke: "#8b5cf6", strokeWidth: 2 },
      },
      {
        id: "e-req-gemini-prompt",
        source: "request-inputs-1",
        sourceHandle: "text_field",
        target: "gemini-1",
        targetHandle: "prompt",
        type: "smoothstep",
        animated: true,
        style: { stroke: "#6366f1", strokeWidth: 2 },
      },
      {
        id: "e-crop-gemini",
        source: "crop-image-1",
        sourceHandle: "outputImage",
        target: "gemini-1",
        targetHandle: "image",
        type: "smoothstep",
        animated: true,
        style: { stroke: "#8b5cf6", strokeWidth: 2 },
      },
      {
        id: "e-gemini-response",
        source: "gemini-1",
        sourceHandle: "response",
        target: "response-1",
        targetHandle: "input",
        type: "smoothstep",
        animated: true,
        style: { stroke: "#6366f1", strokeWidth: 2 },
      },
    ],
  };

  await prisma.workflow.create({
    data: {
      userId: "system",
      name: "AI Image Analyzer",
      flowJson: sampleFlow,
      isSystem: true,
    },
  });

  console.log("✅ Sample workflow created: AI Image Analyzer");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
