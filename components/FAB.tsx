
import React, { useState } from 'react';
import { NoteType } from '../types';

interface FABProps {
  onSelect: (type: NoteType) => void;
}

const FAB: React.FC<FABProps> = ({ onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);

  const actions = [
    { type: 'text' as NoteType, icon: 'fa-feather', label: 'Écrire', color: 'bg-cyan-400' },
    { type: 'voice' as NoteType, icon: 'fa-microphone-lines', label: 'Parler', color: 'bg-indigo-500' },
    { type: 'image' as NoteType, icon: 'fa-bolt-lightning', label: 'Capturer', color: 'bg-violet-500' },
  ];

  return (
    <div className="fixed bottom-24 right-6 z-50 flex flex-col items-end gap-4">
      {isOpen && (
        <div className="flex flex-col gap-4 mb-2 animate-in slide-in-from-bottom-10 duration-300">
          {actions.map((action) => (
            <button
              key={action.type}
              onClick={() => {
                onSelect(action.type);
                setIsOpen(false);
              }}
              className="flex items-center gap-4 group"
            >
              <span className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl text-xs font-black text-indigo-900 shadow-xl border border-white opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest">
                {action.label}
              </span>
              <div className={`${action.color} w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-2xl active:scale-90 transition-all border-b-4 border-black/10`}>
                <i className={`fas ${action.icon} text-xl`}></i>
              </div>
            </button>
          ))}
        </div>
      )}
      
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-2xl transition-all duration-300 bounce-hover ${
          isOpen ? 'rotate-45 bg-red-400' : 'cool-gradient shadow-[0_0_20px_rgba(59,130,246,0.5)]'
        }`}
      >
        <i className={`fas ${isOpen ? 'fa-xmark' : 'fa-plus'} text-2xl`}></i>
      </button>
    </div>
  );
};

export default FAB;
