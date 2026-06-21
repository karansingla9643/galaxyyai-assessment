/**
 * Gemini node-specific utilities
 * - analyzeImage: Vision analysis of a cropped image (Crop Image node)
 * - transcribeAudio: Audio transcription (Extract Audio node)
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  return new GoogleGenerativeAI(apiKey);
}

/**
 * Analyze a base64 image using Gemini Vision.
 * Returns a detailed textual description.
 */
export async function analyzeImage(base64ImageData: string, mimeType = "image/jpeg"): Promise<string> {
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const imagePart = {
    inlineData: {
      data: base64ImageData,
      mimeType,
    },
  };

  const result = await model.generateContent([
    imagePart,
    "Analyze this image in detail. Describe what you see, including: main subjects, colors, composition, mood, and any notable elements. Be concise but thorough.",
  ]);

  const response = await result.response;
  return response.text();
}

/**
 * Transcribe an audio file using Gemini's audio understanding.
 * Accepts base64 audio data.
 */
export async function transcribeAudio(base64AudioData: string, mimeType = "audio/mpeg"): Promise<string> {
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const audioPart = {
    inlineData: {
      data: base64AudioData,
      mimeType,
    },
  };

  const result = await model.generateContent([
    audioPart,
    "Please transcribe all speech in this audio accurately. If there is no speech, describe the audio content (music, sounds, etc.).",
  ]);

  const response = await result.response;
  return response.text();
}
