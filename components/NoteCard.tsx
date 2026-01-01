
import React from 'react';
import { Note } from '../types';

interface NoteCardProps {
  note: Note;
  onClick: (note: Note) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
}

const NoteCard: React.FC<NoteCardProps> = ({ note, onClick, onDelete }) => {
  const isCompleted = note.isCompleted;

  const getNiche = () => {
    switch (note.nature) {
      case 'reminder': return { icon: 'fa-bell', label: 'Rappel', color: 'bg-orange-400' };
      case 'meeting': return { icon: 'fa-calendar-check', label: 'RDV', color: 'bg-emerald-400' };
      case 'bill': return { icon: 'fa-receipt', label: 'Facture', color: 'bg-amber-400' };
      case 'task': return { icon: 'fa-list-check', label: 'Tâche', color: 'bg-indigo-400' };
      default: return { icon: 'fa-note-sticky', label: 'Note', color: 'bg-white/20' };
    }
  };

  const niche = getNiche();

  return (
    <div 
      onClick={() => onClick(note)}
      className={`premium-card p-7 rounded-[40px] transition-all duration-500 cursor-pointer active:scale-[0.98] ${isCompleted ? 'opacity-30 grayscale saturate-0' : 'hover:bg-white/20'}`}
    >
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-5">
          <div className={`w-14 h-14 rounded-2xl ${niche.color} flex items-center justify-center text-white shadow-lg`}>
            <i className={`fas ${niche.icon} text-xl`}></i>
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40 block mb-1">{niche.label}</span>
            <h3 className="font-extrabold text-xl leading-none text-white line-clamp-1">{note.title || 'Sans titre'}</h3>
          </div>
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(note.id, e); }} 
          className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/20 hover:text-white hover:bg-white/10 transition-all"
        >
          <i className="fas fa-trash-can text-sm"></i>
        </button>
      </div>

      <p className="text-sm font-medium text-white/70 line-clamp-2 leading-relaxed mb-6 italic">
        {note.content}
      </p>

      <div className="flex items-center justify-between pt-4 border-t border-white/5">
         <span className="text-[9px] font-bold text-white/40 uppercase tracking-[0.2em]">
           {new Date(note.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
         </span>
         {note.reminderAt && !isCompleted && (
           <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest text-white border border-white/10 shadow-sm animate-pulse">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400"></div>
              {new Date(note.reminderAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
           </div>
         )}
      </div>
    </div>
  );
};

export default NoteCard;
