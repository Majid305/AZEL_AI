
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (note) {
      setContent(note.content);
      setTitle(note.title);
      setHasChanges(false);
    }
  }, [note, isOpen]);

  useEffect(() => {
    if (note && (content !== note.content || title !== note.title)) setHasChanges(true);
    else setHasChanges(false);
  }, [content, title, note]);

  if (!isOpen || !note) return null;

  const handleUpdate = () => {
    if (!note) return;
    const updatedNote: Note = { ...note, title, content };
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
        const updatedNote: Note = {
          ...note,
          nature: analysis.nature,
          title: analysis.title,
          content,
          isCompleted: false,
          reminderAt: schedule?.metadata ? new Date(schedule.metadata).getTime() : note.reminderAt,
          aiProcessed: { summary: analysis.summary, suggestions: analysis.suggestions, lastProcessed: Date.now() }
        };
        storageService.saveNote(updatedNote);
        onSave(updatedNote);
        setHasChanges(false);
      }
    } finally { setIsProcessing(false); }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-[#C5636C] flex flex-col animate-in fade-in slide-in-from-bottom-20 duration-600 overflow-hidden">
      <div className="p-8 flex items-center justify-between border-b border-white/10 backdrop-blur-3xl sticky top-0 z-[210]">
        <button onClick={onClose} className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white active:scale-90 transition-all shadow-inner"><i className="fas fa-chevron-left"></i></button>
        <span className="text-[11px] font-black uppercase tracking-[0.5em] text-white">Édition</span>
        <button onClick={handleUpdate} className="px-7 py-3 rounded-2xl bg-white text-[#C5636C] font-black text-[11px] uppercase tracking-widest shadow-2xl active:scale-90 transition-all">Sauver</button>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-12 pb-24">
        {hasChanges && (
          <div className="premium-card p-7 rounded-[35px] border-white/40 flex flex-col gap-5 animate-in zoom-in-95 shadow-2xl">
             <div className="text-center">
               <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-1">Intelligence Azel_ai</p>
               <p className="text-base font-bold text-white">Vos changements modifient peut-être le rappel.</p>
             </div>
             <button onClick={handleReAnalyze} className="w-full py-4 rounded-2xl bg-indigo-950 text-white font-black text-[11px] uppercase tracking-[0.2em] shadow-lg hover:bg-indigo-900 transition-colors">
               <i className="fas fa-wand-magic-sparkles mr-3"></i> Recalculer l'agenda
             </button>
          </div>
        )}

        {isProcessing && (
          <div className="flex flex-col items-center justify-center py-10 gap-4">
             <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
             <p className="text-[11px] font-black uppercase tracking-[0.3em] text-white/50 animate-pulse">Analyse en cours</p>
          </div>
        )}

        <div className="space-y-6">
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-4">Titre</span>
            <input 
              className="w-full bg-transparent text-5xl font-extrabold text-white focus:outline-none placeholder-white/10 tracking-tighter" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="Titre..."
            />
          </div>
          
          <div className="space-y-2">
             <span className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-4">Contenu</span>
             <textarea 
               className="w-full h-72 bg-white/10 rounded-[45px] p-10 focus:outline-none border border-white/10 text-xl font-medium leading-relaxed placeholder-white/10 text-white shadow-inner"
               value={content}
               onChange={(e) => setContent(e.target.value)}
               placeholder="Détails..."
             />
          </div>
        </div>

        {note.aiProcessed && (
          <div className="space-y-8 animate-in fade-in duration-700">
             <div className="premium-card p-10 rounded-[50px] space-y-6 border-white/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
                <h4 className="text-[11px] font-black uppercase tracking-widest text-white/40">Synthèse Azel_ai</h4>
                <p className="text-lg font-medium leading-relaxed italic text-white/90 border-l-2 border-white/20 pl-8 relative z-10">"{note.aiProcessed.summary}"</p>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NoteModal;
