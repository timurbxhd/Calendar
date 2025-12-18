import { GoogleGenAI, Type } from "@google/genai";

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key required");
  return new GoogleGenAI({ apiKey });
};

export const parseNaturalLanguageEvent = async (text: string, referenceDate: Date): Promise<{ title: string; date: string; time: string; description: string } | null> => {
  try {
    const ai = getAiClient();
    
    const todayStr = referenceDate.toISOString().split('T')[0];

    const prompt = `
      User Input: "${text}"
      Reference Date (Today): ${todayStr}

      Extract the event details into JSON. 
      - If the year is missing, assume current year.
      - If date is missing, assume today.
      - date must be YYYY-MM-DD.
      - time must be HH:mm (24 hour). If no time specified, use "09:00".
      - description should be a short summary or empty string.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            date: { type: Type.STRING },
            time: { type: Type.STRING },
            description: { type: Type.STRING }
          },
          required: ["title", "date", "time"]
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) return null;
    return JSON.parse(jsonText);

  } catch (error) {
    console.error("Gemini AI Error:", error);
    return null;
  }
};