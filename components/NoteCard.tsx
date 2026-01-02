
import React from 'react';
import { Note } from '../types';

interface NoteCardProps {
  note: Note;
  onClick: (note: Note) => void;
  onDelete: (id: string) => void;
}

const NoteCard: React.FC<NoteCardProps> = ({ note, onClick, onDelete }) => {
  const isCompleted = note.isCompleted;

  const getNiche = () => {
    switch (note.nature) {
      case 'reminder': return { icon: 'fa-bell', label: 'Rappel', color: 'bg-orange-500' };
      case 'meeting': return { icon: 'fa-calendar-check', label: 'RDV', color: 'bg-emerald-500' };
      case 'bill': return { icon: 'fa-receipt', label: 'Facture', color: 'bg-amber-500' };
      case 'task': return { icon: 'fa-list-check', label: 'Tâche', color: 'bg-indigo-500' };
      case 'contact': return { icon: 'fa-user-plus', label: 'Contact', color: 'bg-blue-500' };
      default: return { icon: 'fa-note-sticky', label: 'Note', color: 'bg-slate-500' };
    }
  };

  const niche = getNiche();

  return (
    <div 
      onClick={() => onClick(note)}
      className={`premium-card p-6 rounded-[35px] transition-all duration-400 cursor-pointer active:scale-[0.97] ${isCompleted ? 'opacity-30 grayscale saturate-0' : 'hover:bg-white/10'}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl ${niche.color} flex items-center justify-center text-white shadow-lg`}>
            <i className={`fas ${niche.icon} text-lg`}></i>
          </div>
          <div>
            <span className="text-[9px] font-black uppercase tracking-widest opacity-40 block">{niche.label}</span>
            <h3 className="font-extrabold text-lg leading-tight line-clamp-1">{note.title || 'Sans titre'}</h3>
          </div>
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(note.id); }} 
          className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-500 hover:text-red-500 hover:bg-red-500/10 transition-all"
        >
          <i className="fas fa-trash-can text-sm"></i>
        </button>
      </div>

      <p className="text-sm font-medium opacity-70 line-clamp-2 leading-relaxed mb-4 italic">
        {note.content}
      </p>

      <div className="flex items-center justify-between pt-4 border-t border-white/5">
         <span className="text-[9px] font-bold opacity-30 uppercase tracking-widest">
           {new Date(note.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
         </span>
         {note.reminderAt && !isCompleted && (
           <div className="flex items-center gap-2 bg-blue-500/10 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest text-blue-500 border border-blue-500/20 animate-pulse">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
              {new Date(note.reminderAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
           </div>
         )}
      </div>
    </div>
  );
};

export default NoteCard;
