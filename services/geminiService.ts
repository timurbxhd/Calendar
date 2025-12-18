// Теперь AI запросы идут через наш backend сервер
export const parseNaturalLanguageEvent = async (text: string, referenceDate: Date): Promise<{ title: string; date: string; time: string; description: string } | null> => {
  try {
    const res = await fetch('/api/ai/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        prompt: text, 
        referenceDate: referenceDate 
      })
    });

    if (!res.ok) throw new Error("AI request failed");
    return await res.json();

  } catch (error) {
    console.error("Gemini AI Error:", error);
    return null;
  }
};
