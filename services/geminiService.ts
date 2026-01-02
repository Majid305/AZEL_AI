
import { GoogleGenAI, Type } from "@google/genai";

export const geminiService = {
  analyzeNote: async (content: string, mimeType: string = 'text/plain') => {
    const ai = new GoogleGenAI({ apiKey: (process.env as any).API_KEY });
    const model = 'gemini-3-flash-preview';
    const now = new Date();
    
    // On passe l'heure locale formatée pour que l'IA comprenne le contexte temporel de l'utilisateur
    const localTimeStr = now.toLocaleString('fr-FR', { timeZoneName: 'short' });

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
              metadata: { type: Type.STRING, description: "Date ISO 8601 complète (ex: 2023-10-27T10:00:00). N'ajoute pas de décalage UTC si l'utilisateur parle en heure locale." }
            },
            required: ["id", "label", "actionType"]
          }
        }
      },
      required: ["nature", "title", "summary", "suggestions", "transcription"]
    };

    let prompt = `Tu es Azel_ai. Analyse ce contenu. 
    CONTEXTE TEMPOREL : Nous sommes le ${localTimeStr}. 
    INSTRUCTIONS :
    - Si l'utilisateur mentionne une heure (ex: "demain à 10h", "dans 2h"), calcule la date exacte par rapport au contexte fourni.
    - Retourne les dates au format ISO 8601 local sans suffixe 'Z' pour éviter les décalages de fuseau horaire.
    - Identifie la nature de la note parmi les catégories proposées.
    - Crée des suggestions d'actions concrètes.`;

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
        systemInstruction: "Tu es Azel_ai, une intelligence intuitive marocaine moderne. Précision, élégance et efficacité sont tes maîtres mots. Transforme les pensées en actions.",
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
