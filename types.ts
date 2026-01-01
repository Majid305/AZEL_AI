
export type NoteType = 'text' | 'voice' | 'image';
export type NoteNature = 'reminder' | 'contact' | 'bill' | 'meeting' | 'task' | 'message' | 'general';

export interface AISuggestion {
  id: string;
  label: string;
  actionType: 'schedule' | 'save_contact' | 'draft_message' | 'pay_bill' | 'create_task';
  metadata?: any;
}

export interface Note {
  id: string;
  type: NoteType;
  nature: NoteNature;
  title: string;
  content: string;
  mediaUrl?: string;
  createdAt: number;
  reminderAt?: number;
  isCompleted?: boolean;
  aiProcessed?: {
    summary?: string;
    suggestions: AISuggestion[];
    lastProcessed: number;
  };
}

export enum StorageKey {
  NOTES = 'azel_ai_notes',
  THEME = 'azel_ai_theme'
}
