
import { GoogleGenAI, Type } from "@google/genai";

export const geminiService = {
  analyzeNote: async (content: string, mimeType: string = 'text/plain') => {
    const ai = new GoogleGenAI({ apiKey: (process.env as any).API_KEY });
    const model = 'gemini-3-flash-preview';
    const now = new Date();
    
    const schema = {
      type: Type.OBJECT,
      properties: {
        nature: { 
          type: Type.STRING, 
          description: "Nature: 'reminder', 'contact', 'bill', 'meeting', 'task', 'message', 'general'" 
        },
        title: { type: Type.STRING, description: "Titre court et percutant" },
        summary: { type: Type.STRING, description: "Résumé très court (1 phrase)" },
        transcription: { type: Type.STRING, description: "Transcription si audio/image, sinon texte original" },
        suggestions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              label: { type: Type.STRING, description: "Libellé de l'action" },
              actionType: { type: Type.STRING, description: "'schedule', 'save_contact', 'create_task'" },
              metadata: { type: Type.STRING, description: "Date ISO 8601 pour les rappels. IMPORTANT: Utilise l'heure locale actuelle comme référence." }
            },
            required: ["id", "label", "actionType"]
          }
        }
      },
      required: ["nature", "title", "summary", "suggestions", "transcription"]
    };

    let prompt = `Analyse cette note. Heure locale actuelle (ISO): ${now.toLocaleString('fr-FR')}. Date ISO de référence: ${now.toISOString()}.
    IMPORTANT: Si le contenu suggère un événement (ex: "demain à 10h"), calcule la date ISO exacte. 
    Ajuste l'heure pour qu'elle corresponde à l'heure locale de l'utilisateur.
    Si l'utilisateur dit "dans une heure", ajoute exactement 60 minutes à l'heure actuelle.`;

    let parts: any[] = [{ text: prompt }];

    if (mimeType.startsWith('audio/') || mimeType.startsWith('image/')) {
      parts.push({
        inlineData: {
          mimeType: mimeType,
          data: content // base64 string
        }
      });
    } else {
      parts.push({ text: content });
    }

    const response = await ai.models.generateContent({
      model,
      contents: { parts },
      config: {
        systemInstruction: "Tu es Azel_ai, une intelligence intuitive. Tu transformes le chaos des pensées en structures organisées. Sois précis sur les dates et les heures locales.",
        responseMimeType: "application/json",
        responseSchema: schema
      },
    });

    try {
      return JSON.parse(response.text || '{}');
    } catch (e) {
      console.error("Erreur parsing AI", e);
      return null;
    }
  }
};
