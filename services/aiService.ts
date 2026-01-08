import { GoogleGenAI, Type } from "@google/genai";
import { ReferenceRow } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// We will send a batch of descriptions to match against the reference list
export const findBestMatches = async (
  inputs: { id: number; text: string }[],
  references: ReferenceRow[]
): Promise<{ id: number; code: string; confidence: string }[]> => {
  
  // Optimize reference list to minimize tokens (format: "CODE: Description")
  // If reference list is massive, we might need a more complex RAG approach, 
  // but for a typical Archive Schedule (hundreds of rows), this fits in Gemini 1.5/2.0 context window easily.
  const refString = references.map(r => `${r.code}: ${r.description}`).join('\n');

  const inputString = inputs.map(i => `ID ${i.id}: ${i.text}`).join('\n');

  const prompt = `
    You are an expert archivist helping to classify documents.
    
    Reference Classification List (Code: Description):
    ---
    ${refString}
    ---

    Task:
    For each Input Item below, find the Best Matching Classification Code from the Reference List above based on semantic similarity.
    If the description is vague, use your best judgement.
    
    Input Items:
    ${inputString}

    Output Requirement:
    Return a JSON array where each object has:
    - "id": The ID provided in the input.
    - "code": The matched Classification Code (e.g., SY.01.01).
    - "confidence": "High", "Medium", or "Low".
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.NUMBER },
              code: { type: Type.STRING },
              confidence: { type: Type.STRING },
            },
            required: ["id", "code", "confidence"]
          }
        }
      },
    });

    const resultText = response.text;
    if (!resultText) return [];
    
    return JSON.parse(resultText);
  } catch (error) {
    console.error("AI Matching Error:", error);
    return [];
  }
};