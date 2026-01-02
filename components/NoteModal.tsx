
import React, { useState, useEffect } from 'react';
import { Note } from '../types';
import { storageService } from '../services/storageService';
import { geminiService } from '../services/geminiService';

interface NoteModalProps {
  note: Note | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedNote?: Note) => void;
}

const NoteModal: React.FC<NoteModalProps> = ({ note, isOpen, onClose, onSave }) => {
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [reminderAt, setReminderAt] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (note && isOpen) {
      setContent(note.content);
      setTitle(note.title);
      if (note.reminderAt) {
        // Convertir le timestamp en format compatible avec datetime-local (YYYY-MM-DDThh:mm)
        const date = new Date(note.reminderAt);
        const offset = date.getTimezoneOffset() * 60000;
        const localISOTime = new Date(date.getTime() - offset).toISOString().slice(0, 16);
        setReminderAt(localISOTime);
      } else {
        setReminderAt('');
      }
      setHasChanges(false);
    }
  }, [note, isOpen]);

  useEffect(() => {
    if (note) {
      const currentReminderTs = reminderAt ? new Date(reminderAt).getTime() : undefined;
      const changed = content !== note.content || title !== note.title || currentReminderTs !== note.reminderAt;
      setHasChanges(changed);
    }
  }, [content, title, reminderAt, note]);

  if (!isOpen || !note) return null;

  const handleUpdate = () => {
    if (!note) return;
    const updatedNote: Note = { 
      ...note, 
      title, 
      content, 
      reminderAt: reminderAt ? new Date(reminderAt).getTime() : undefined 
    };
    storageService.saveNote(updatedNote);
    onSave(updatedNote);
    onClose();
  };

  const handleReAnalyze = async () => {
    setIsProcessing(true);
    try {
      const analysis = await geminiService.analyzeNote(content);
      if (analysis) {
        const schedule = analysis.suggestions?.find((s: any) => s.actionType === 'schedule');
        const newReminderAt = schedule?.metadata ? new Date(schedule.metadata).getTime() : note.reminderAt;
        
        const updatedNote: Note = {
          ...note,
          nature: analysis.nature,
          title: analysis.title,
          content,
          isCompleted: false,
          reminderAt: newReminderAt,
          aiProcessed: { summary: analysis.summary, suggestions: analysis.suggestions, lastProcessed: Date.now() }
        };
        storageService.saveNote(updatedNote);
        onSave(updatedNote);
        onClose();
      }
    } finally { setIsProcessing(false); }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-950/90 backdrop-blur-2xl flex flex-col animate-in fade-in slide-in-from-bottom-10 duration-500 overflow-hidden">
      {/* Header */}
      <div className="p-8 flex items-center justify-between border-b border-white/5 sticky top-0 z-[210]">
        <button onClick={onClose} className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white active:scale-90 transition-all border border-white/10">
          <i className="fas fa-chevron-left"></i>
        </button>
        <span className="text-[11px] font-black uppercase tracking-[0.5em] text-white/40">Édition Azel_ai</span>
        <button 
          onClick={handleUpdate} 
          className="px-8 py-3 rounded-2xl bg-blue-600 text-white font-black text-[11px] uppercase tracking-widest shadow-2xl active:scale-95 transition-all"
        >
          Sauver
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-10 pb-32 hide-scrollbar">
        {/* Rappel Manuel */}
        <div className="space-y-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-blue-500/60 ml-4 flex items-center gap-2">
            <i className="fas fa-bell"></i> Rappel
          </span>
          <div className="premium-card rounded-[25px] p-4 flex items-center gap-4">
            <input 
              type="datetime-local" 
              className="flex-1 bg-transparent text-white font-bold focus:outline-none [color-scheme:dark]"
              value={reminderAt}
              onChange={(e) => setReminderAt(e.target.value)}
            />
            {reminderAt && (
              <button onClick={() => setReminderAt('')} className="text-red-400 p-2"><i className="fas fa-times"></i></button>
            )}
          </div>
        </div>

        {/* Champs de texte */}
        <div className="space-y-8">
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/20 ml-4">Titre</span>
            <input 
              className="w-full bg-transparent text-4xl font-extrabold text-white focus:outline-none placeholder-white/5 tracking-tighter" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="Titre..."
            />
          </div>
          
          <div className="space-y-2">
             <span className="text-[10px] font-black uppercase tracking-widest text-white/20 ml-4">Pensée</span>
             <textarea 
               className="w-full h-64 premium-card rounded-[40px] p-8 focus:outline-none text-lg font-medium leading-relaxed placeholder-white/5 text-white/90 shadow-inner"
               value={content}
               onChange={(e) => setContent(e.target.value)}
               placeholder="Détails..."
             />
          </div>
        </div>

        {/* Assistant IA */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 px-4">
            <div className="h-[1px] flex-1 bg-white/5"></div>
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20">Assistant de pensée</span>
            <div className="h-[1px] flex-1 bg-white/5"></div>
          </div>
          
          <button 
            onClick={handleReAnalyze} 
            disabled={isProcessing}
            className="w-full py-6 rounded-[30px] border border-white/10 bg-white/5 flex items-center justify-center gap-4 group active:bg-white/10 transition-all disabled:opacity-30"
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${isProcessing ? 'animate-spin' : 'group-hover:scale-110 transition-transform text-blue-500'}`}>
              <i className={`fas ${isProcessing ? 'fa-spinner' : 'fa-wand-magic-sparkles'}`}></i>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">Recalculer l'agenda par IA</span>
          </button>
        </div>

        {note.aiProcessed && (
          <div className="premium-card p-8 rounded-[40px] border-l-4 border-blue-600/50">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Dernière analyse Azel_ai</h4>
            <p className="text-base font-medium leading-relaxed italic opacity-60">"{note.aiProcessed.summary}"</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NoteModal;
