
import React from 'react';

export const THEME = {
  primary: '#3B82F6', 
  secondary: '#10B981', 
  accent: '#8B5CF6', 
  background: '#F8FAFC',
  surface: '#FFFFFF',
  text: '#1E1B4B'
};

export const PROMPTS = {
  SYSTEM: `Tu es Azel_ai. AGIS DIRECTEMENT. 
  NE FAIS PAS d'introduction du type "Voici le résumé" ou "Bien sûr". 
  Réponds DIRECTEMENT au format Markdown. 
  Structure : 
  # [Titre pertinent]
  **Résumé** : [Max 2 phrases]
  **Points clés** : 
  - [Point 1]
  - [Point 2]
  NE PARLE PAS à l'utilisateur, produis juste le contenu de la note.`,
  SUMMARIZE: "Analyse et structure ce contenu immédiatement.",
  STRUCTURE: "Réorganise de manière professionnelle et concise.",
  ANALYZE_IMAGE: "Décris et structure les informations de cette image."
};
