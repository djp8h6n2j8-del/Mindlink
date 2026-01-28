
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Memory, ChatMessage, Attachment } from "../types";

const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key is missing");
  return new GoogleGenAI({ apiKey });
};

const safeParseJSON = (text: string) => {
  try {
    const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
    const firstBrace = jsonStr.indexOf('{');
    const firstBracket = jsonStr.indexOf('[');
    const start = (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) ? firstBrace : firstBracket;
    if (start === -1) return JSON.parse(jsonStr);
    const lastBrace = jsonStr.lastIndexOf('}');
    const lastBracket = jsonStr.lastIndexOf(']');
    const end = Math.max(lastBrace, lastBracket);
    return JSON.parse(jsonStr.substring(start, end + 1));
  } catch (e) {
    console.error("Failed to parse AI response as JSON:", text);
    throw new Error("Invalid AI response format");
  }
};

export const analyzeMemory = async (content: string, existingMemories: Memory[], attachment?: Attachment): Promise<{
  concepts: string[];
  suggestedLinks: string[];
  summary: string;
  cognitiveType: string;
}> => {
  const ai = getAI();
  const memoryContext = existingMemories.slice(-5).map(m => `[ID:${m.id}] ${m.content}`).join("\n");
  
  const parts: any[] = [
    { text: `Analizuj tę nową myśl studenta. Wyodrębnij koncepty i powiązania. 
    ZWRÓĆ WYŁĄCZNIE CZYSTY JSON.
    Struktura: { concepts: string[], suggestedLinks: string[], summary: string, cognitiveType: string }` }
  ];

  if (attachment) {
    parts.push({
      inlineData: {
        data: attachment.data,
        mimeType: attachment.mimeType
      }
    });
  }
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [{ parts: [...parts, { text: `Myśl: ${content}\nKontekst: ${memoryContext}` }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          concepts: { type: Type.ARRAY, items: { type: Type.STRING } },
          suggestedLinks: { type: Type.ARRAY, items: { type: Type.STRING } },
          summary: { type: Type.STRING },
          cognitiveType: { type: Type.STRING }
        },
        required: ["concepts", "suggestedLinks", "summary", "cognitiveType"]
      }
    }
  });

  return safeParseJSON(response.text || "{}");
};

export const generateStudyPlan = async (memories: Memory[]) => {
  const ai = getAI();
  const context = memories.map(m => `- ${m.content}`).join("\n");
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: [{ parts: [{ text: `Na podstawie moich notatek: \n${context}\n\nStwórz plan nauki. Używaj metod: Active Recall, Spaced Repetition, Interleaving. Wyjaśnij krótko, dlaczego to działa (bazując na neurobiologii). Rozmawiaj ze mną jak kumpel student, ale taki, który przeczytał wszystkie podręczniki do kognitywistyki.` }] }],
    config: {
      systemInstruction: "Jesteś Mindlink - wyluzowany asystent-kumpel studenta. Twoje rady opierają się na twardych dowodach naukowych (Dunlosky et al., 2013). Nie używaj gwiazdek (*). Pisz czystym tekstem, dziel na akapity.",
      temperature: 0.8,
      thinkingConfig: { thinkingBudget: 5000 }
    }
  });

  return response.text || "Sorki, coś mi się zwiesiło w zwojach. Spróbuj jeszcze raz!";
};

export const getDigitalTwinResponse = async (query: string, memories: Memory[], chatHistory: ChatMessage[]) => {
  const ai = getAI();
  const context = memories.map(m => `- ${m.content}`).join("\n");
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: [{ parts: [{ text: query }] }],
    config: {
      systemInstruction: `Jesteś Mindlink - Twój cyfrowy bliźniak pamięci. Rozmawiasz na luzie, jak student ze studentem. Używasz zwrotów: 'Słuchaj', 'Ogarniemy to', 'Bez spiny'. Jednocześnie Twoje sugestie dotyczące nauki ZAWSZE opierają się na badaniach nad efektywnością kognitywną (Active Recall, Spaced Repetition). Nie używaj gwiazdek. Baza wiedzy użytkownika: \n${context}`,
      temperature: 0.9
    }
  });

  return response.text || "Nie mam pojęcia co powiedzieć, stary. Spróbuj inaczej.";
};

export const generateInsights = async (memories: Memory[]) => {
  const ai = getAI();
  if (memories.length < 2) return "Dorzuć więcej notatek, to znajdę jakieś ukryte połączenia w Twoim stylu myślenia.";
  const context = memories.map(m => m.content).join("\n---\n");
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [{ parts: [{ text: `Przeanalizuj moje notatki i znajdź logiczne luki lub ciekawe powiązania: \n${context}` }] }],
    config: {
      systemInstruction: "Jesteś analitykiem kognitywnym o luźnym stylu bycia. Nie używaj gwiazdek. Szukaj wzorców i dawaj proaktywne rady oparte na psychologii poznawczej."
    }
  });
  return response.text || "";
};
