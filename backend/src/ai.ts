import { GoogleGenAI } from "@google/genai";
import config from "./config";

export const gemini = new GoogleGenAI({
  apiKey: config.GEMINI_API_KEY as string,
});
