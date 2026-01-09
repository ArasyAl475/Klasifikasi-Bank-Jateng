import { ReferenceRow } from "../types";

const levenshteinDistance = (a: string, b: string): number => {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
};

const calculateSimilarity = (input: string, reference: string): number => {
  const distance = levenshteinDistance(
    input.toLowerCase(),
    reference.toLowerCase()
  );
  const maxLength = Math.max(input.length, reference.length);
  return maxLength === 0 ? 1 : 1 - distance / maxLength;
};

export const findLocalMatch = (
  inputText: string,
  references: ReferenceRow[]
): { code: string; confidence: string } | null => {
  if (!inputText.trim() || references.length === 0) return null;

  const matches = references.map(ref => ({
    code: ref.code,
    description: ref.description,
    similarity: calculateSimilarity(inputText, ref.description),
  }));

  const bestMatch = matches.reduce((prev, current) =>
    current.similarity > prev.similarity ? current : prev
  );

  if (bestMatch.similarity >= 0.7) {
    const confidence =
      bestMatch.similarity >= 0.85
        ? "High"
        : bestMatch.similarity >= 0.65
        ? "Medium"
        : "Low";

    return {
      code: bestMatch.code,
      confidence,
    };
  }

  return null;
};

export const findLocalMatches = (
  inputs: { id: number; text: string }[],
  references: ReferenceRow[]
): { id: number; code: string; confidence: string; isLocal: boolean }[] => {
  return inputs
    .map(input => {
      const match = findLocalMatch(input.text, references);
      if (match) {
        return {
          id: input.id,
          ...match,
          isLocal: true,
        };
      }
      return null;
    })
    .filter((match): match is { id: number; code: string; confidence: string; isLocal: boolean } => match !== null);
};
