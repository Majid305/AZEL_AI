
import { Note, StorageKey } from '../types';

export const storageService = {
  getNotes: (): Note[] => {
    const data = localStorage.getItem(StorageKey.NOTES);
    return data ? JSON.parse(data) : [];
  },

  saveNote: (note: Note): void => {
    const notes = storageService.getNotes();
    const index = notes.findIndex(n => n.id === note.id);
    if (index >= 0) {
      notes[index] = note;
    } else {
      notes.unshift(note);
    }
    localStorage.setItem(StorageKey.NOTES, JSON.stringify(notes));
  },

  deleteNote: (id: string): void => {
    const notes = storageService.getNotes().filter(n => n.id !== id);
    localStorage.setItem(StorageKey.NOTES, JSON.stringify(notes));
  }
};
