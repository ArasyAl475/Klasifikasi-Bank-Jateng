import { GoogleGenAI, Type } from "@google/genai";
import { ReferenceRow } from "../types";
import { findLocalMatches } from "../utils/similarityMatcher";
import { supabase } from "../services/supabaseClient";

let apiKeyIndex = 0;

const parseApiKeys = (): string[] => {
  const windowKeys = (window as any).geminiApiKeys;
  if (windowKeys && Array.isArray(windowKeys) && windowKeys.length > 0) {
    return windowKeys;
  }

  const keysEnv = import.meta.env.VITE_GEMINI_API_KEYS;
  if (!keysEnv) return [];
  return keysEnv.split(',').map(key => key.trim()).filter(key => key.length > 0);
};

const getNextApiClient = (): GoogleGenAI | null => {
  const keys = parseApiKeys();
  if (keys.length === 0) return null;

  const client = new GoogleGenAI({ apiKey: keys[apiKeyIndex] });
  apiKeyIndex = (apiKeyIndex + 1) % keys.length;
  return client;
};

const getCachedResult = async (inputText: string) => {
  const { data } = await supabase
    .from('classification_cache')
    .select('matched_code, confidence')
    .eq('input_text', inputText)
    .maybeSingle();

  return data;
};

const cacheResult = async (inputText: string, code: string, confidence: string) => {
  await supabase
    .from('classification_cache')
    .insert({ input_text: inputText, matched_code: code, confidence })
    .throwOnError();
};

export const findBestMatches = async (
  inputs: { id: number; text: string }[],
  references: ReferenceRow[]
): Promise<{ id: number; code: string; confidence: string }[]> => {
  const results: { id: number; code: string; confidence: string }[] = [];
  const needsApiCall: { id: number; text: string }[] = [];

  for (const input of inputs) {
    const cached = await getCachedResult(input.text);
    if (cached) {
      results.push({
        id: input.id,
        code: cached.matched_code,
        confidence: cached.confidence,
      });
    } else {
      needsApiCall.push(input);
    }
  }

  if (needsApiCall.length === 0) {
    return results;
  }

  const localMatches = findLocalMatches(needsApiCall, references);
  results.push(...localMatches);

  const stillNeeds = needsApiCall.filter(
    item => !localMatches.find(m => m.id === item.id)
  );

  if (stillNeeds.length > 0) {
    const apiResults = await callGeminiWithFallback(stillNeeds, references);

    for (const result of apiResults) {
      results.push(result);
      const input = stillNeeds.find(i => i.id === result.id);
      if (input) {
        await cacheResult(input.text, result.code, result.confidence);
      }
    }
  }

  return results;
};

const callGeminiWithFallback = async (
  inputs: { id: number; text: string }[],
  references: ReferenceRow[]
): Promise<{ id: number; code: string; confidence: string }[]> => {
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

  const keys = parseApiKeys();
  let lastError: Error | null = null;

  for (let i = 0; i < keys.length; i++) {
    try {
      const ai = new GoogleGenAI({ apiKey: keys[i] });

      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
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
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`API Key ${i + 1} failed, trying next...`, lastError.message);
    }
  }

  console.error("All API keys exhausted. Error:", lastError?.message);
  return [];
};