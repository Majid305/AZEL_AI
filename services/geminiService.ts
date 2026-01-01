
import { GoogleGenAI, Type } from "@google/genai";

// Always use new GoogleGenAI({ apiKey: process.env.API_KEY });
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const geminiService = {
  analyzeNote: async (content: string, isAudio: boolean = false) => {
    const model = 'gemini-3-flash-preview';
    const now = new Date();
    
    const schema = {
      type: Type.OBJECT,
      properties: {
        nature: { 
          type: Type.STRING, 
          description: "Nature: 'reminder', 'contact', 'bill', 'meeting', 'task', 'message', 'general'" 
        },
        title: { type: Type.STRING, description: "Titre court" },
        summary: { type: Type.STRING, description: "Résumé court" },
        transcription: { type: Type.STRING, description: "Transcription intégrale si c'est de l'audio, sinon identique au contenu" },
        suggestions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              label: { type: Type.STRING, description: "Texte de l'action" },
              actionType: { type: Type.STRING, description: "'schedule', 'save_contact', 'create_task'" },
              metadata: { type: Type.STRING, description: "Date ISO pour les rappels" }
            },
            required: ["id", "label", "actionType"]
          }
        }
      },
      required: ["nature", "title", "summary", "suggestions", "transcription"]
    };

    const prompt = isAudio 
      ? `Analyse cet enregistrement audio. Transcris-le d'abord. Date actuelle: ${now.toISOString()}. IMPORTANT: Si un rappel est évoqué, calcule la date ISO exacte.` 
      : `Analyse cette note : "${content}". Date actuelle: ${now.toISOString()}. IMPORTANT: Si le contenu suggère un rappel (ex: "demain", "dans 2h", "lundi prochain"), calcule IMPÉRATIVEMENT la date ISO précise correspondante dans le champ 'metadata'.`;

    const contents = isAudio ? [
      {
        inlineData: {
          mimeType: "audio/webm",
          data: content // base64 data
        }
      },
      { text: prompt }
    ] : prompt;

    const response = await ai.models.generateContent({
      model,
      contents: isAudio ? { parts: contents as any } : contents,
      config: {
        systemInstruction: "Tu es Azel_ai, un assistant proactif contre l'oubli. Tu dois extraire des rappels précis. Si une heure ou un jour est mentionné, calcule la date ISO par rapport à la date actuelle fournie.",
        responseMimeType: "application/json",
        responseSchema: schema
      },
    });

    try {
      const text = response.text || '{}';
      return JSON.parse(text);
    } catch (e) {
      console.error("Erreur parsing AI", e);
      return null;
    }
  }
};
