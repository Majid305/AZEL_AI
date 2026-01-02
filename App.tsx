
import React, { useState, useEffect, useCallback } from 'react';
import { Note, NoteType } from './types';
import { storageService } from './services/storageService';
import { geminiService } from './services/geminiService';

// Components
import NoteCard from './components/NoteCard';
import NoteModal from './components/NoteModal';

const LuminousIcon = () => (
  <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
    <div className="absolute inset-0 bg-blue-500/10 rounded-full blur-[40px] animate-pulse"></div>
    <div className="relative z-10 w-24 h-24 flex items-center justify-center">
      <svg width="100%" height="100%" viewBox="0 0 100 100" fill="none">
        <circle cx="50" cy="50" r="45" stroke="white" strokeWidth="0.5" strokeDasharray="6 4" className="animate-[spin_40s_linear_infinite] opacity-20" />
        <circle cx="50" cy="50" r="18" fill="white" className="drop-shadow-[0_0_15px_rgba(255,255,255,0.7)]" />
        <path d="M50 12V25M50 75V88M12 50H25M75 50H88" stroke="white" strokeWidth="4" strokeLinecap="round" className="opacity-50" />
      </svg>
    </div>
  </div>
);

const App: React.FC = () => {
  const [view, setView] = useState<'home' | 'history' | 'stats' | 'settings'>('home');
  const [notes, setNotes] = useState<Note[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureType, setCaptureType] = useState<NoteType | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<any>(null);
  const [tempContent, setTempContent] = useState('');
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('azel_theme') !== 'light');
  const [remindersEnabled, setRemindersEnabled] = useState(() => localStorage.getItem('azel_reminders') !== 'false');
  const [activeReminder, setActiveReminder] = useState<Note | null>(null);

  const loadNotes = useCallback(() => {
    const fetchedNotes = storageService.getNotes();
    setNotes(fetchedNotes.sort((a, b) => b.createdAt - a.createdAt));
  }, []);

  useEffect(() => {
    loadNotes();
    const interval = setInterval(() => {
      if (!remindersEnabled) return;
      const allNotes = storageService.getNotes();
      const now = Date.now();
      allNotes.forEach(note => {
        if (note.reminderAt && note.reminderAt <= now && !note.isCompleted) {
          if (!activeReminder || activeReminder.id !== note.id) {
            setActiveReminder(note);
          }
        }
      });
    }, 10000);
    return () => clearInterval(interval);
  }, [loadNotes, activeReminder, remindersEnabled]);

  useEffect(() => {
    localStorage.setItem('azel_theme', darkMode ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const startCapture = (type: NoteType) => {
    setCaptureType(type);
    setIsCapturing(true);
    setCurrentAnalysis(null);
    setTempContent('');
  };

  const handleAnalysis = async (content: string) => {
    if (!content.trim()) return;
    setIsProcessing(true);
    try {
      const analysis = await geminiService.analyzeNote(content);
      setCurrentAnalysis(analysis);
    } catch (e) { console.error(e); }
    setIsProcessing(false);
  };

  const finalizeNote = (selectedSuggestions: any[]) => {
    if (!currentAnalysis) return;
    let reminderTimestamp: number | undefined = undefined;
    selectedSuggestions.forEach(s => {
      if (s.actionType === 'schedule' && s.metadata) {
        reminderTimestamp = new Date(s.metadata).getTime();
      }
    });

    const newNote: Note = {
      id: Date.now().toString(),
      type: captureType || 'text',
      nature: currentAnalysis.nature,
      title: currentAnalysis.title,
      content: tempContent,
      createdAt: Date.now(),
      reminderAt: reminderTimestamp,
      aiProcessed: { summary: currentAnalysis.summary, suggestions: selectedSuggestions, lastProcessed: Date.now() }
    };
    storageService.saveNote(newNote);
    loadNotes();
    setIsCapturing(false);
    setView('history');
  };

  const renderHome = () => (
    <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-16 animate-in fade-in duration-700">
      <div className="flex flex-col items-center text-center">
        <LuminousIcon />
        <div className="mt-6 space-y-2">
          <h1 className="text-5xl font-black tracking-tighter text-white">Azel_ai</h1>
          <p className="text-white/30 font-bold tracking-[0.4em] uppercase text-[10px]">Intelligence Intuitive</p>
        </div>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-4">
        {[
          { type: 'text', icon: 'fa-feather-pointed', label: 'Note Écrite', color: 'text-blue-400' },
          { type: 'voice', icon: 'fa-waveform-lines', label: 'Note Vocale', color: 'text-indigo-400' },
          { type: 'image', icon: 'fa-camera-retro', label: 'Note Visuelle', color: 'text-purple-400' }
        ].map((btn) => (
          <button 
            key={btn.type}
            onClick={() => startCapture(btn.type as NoteType)}
            className="w-full premium-card p-6 rounded-[28px] flex items-center gap-6 transition-all active:bg-white/10"
          >
            <div className={`w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-xl ${btn.color}`}>
              <i className={`fas ${btn.icon}`}></i>
            </div>
            <span className="text-[11px] font-black tracking-widest text-white uppercase">{btn.label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className={`h-full w-full flex flex-col relative overflow-hidden transition-colors duration-500 ${darkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
      
      {/* Subtle Ambient Background */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[80%] h-[80%] bg-blue-500/[0.03] rounded-full blur-[100px]"></div>
      </div>

      {/* Main Container */}
      <div className="flex-1 relative z-10 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto hide-scrollbar">
          {!isCapturing ? (
            <div className="min-h-full flex flex-col">
              {view === 'home' && renderHome()}
              
              {view === 'history' && (
                <div className="p-8 pb-32 space-y-8 animate-in slide-in-from-bottom-5 duration-500">
                  <div className="flex items-center justify-between mt-4">
                    <h2 className={`text-4xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>Archives</h2>
                    <span className="premium-card px-4 py-1.5 rounded-xl text-[10px] font-black opacity-60 uppercase tracking-widest">{notes.length} Notes</span>
                  </div>
                  <div className="flex flex-col gap-6">
                    {notes.length === 0 ? (
                      <div className="py-40 text-center opacity-10 flex flex-col items-center gap-4">
                        <i className="fas fa-box-open text-7xl"></i>
                        <p className="font-black uppercase tracking-widest text-xs">Mémoire vide</p>
                      </div>
                    ) : (
                      notes.map(n => <NoteCard key={n.id} note={n} onClick={(note) => { setSelectedNote(note); setIsModalOpen(true); }} onDelete={(id, e) => { if(confirm("Supprimer ?")) { storageService.deleteNote(id); loadNotes(); } }} />)
                    )}
                  </div>
                </div>
              )}

              {view === 'stats' && (
                <div className="p-8 h-full flex flex-col items-center justify-center pb-32 animate-in fade-in duration-500">
                   <h2 className={`text-3xl font-black mb-8 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Activité</h2>
                   <div className="w-full premium-card p-12 rounded-[40px] text-center space-y-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Items sauvegardés</p>
                      <p className={`text-8xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>{notes.length}</p>
                   </div>
                </div>
              )}

              {view === 'settings' && (
                <div className="p-8 space-y-6 animate-in fade-in duration-500">
                   <h2 className={`text-3xl font-black mt-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Réglages</h2>
                   <div className="premium-card p-6 rounded-[30px] flex items-center justify-between">
                      <span className={`font-black uppercase tracking-widest text-[10px] ${darkMode ? 'text-white' : 'text-slate-900'}`}>Mode Sombre</span>
                      <button onClick={() => setDarkMode(!darkMode)} className={`w-14 h-8 rounded-full transition-all relative p-1 ${darkMode ? 'bg-blue-600' : 'bg-slate-200'}`}>
                         <div className={`w-6 h-6 rounded-full transition-all shadow-md bg-white ${darkMode ? 'translate-x-6' : 'translate-x-0'}`} />
                      </button>
                   </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col p-8 space-y-8 animate-in slide-in-from-bottom-10 duration-500">
              <div className="flex items-center justify-between shrink-0">
                 <button onClick={() => setIsCapturing(false)} className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white"><i className="fas fa-chevron-left"></i></button>
                 <span className="font-black uppercase tracking-widest text-[10px] text-slate-500">Nouvelle Saisie</span>
                 <div className="w-12" />
              </div>
              
              <textarea 
                autoFocus
                className={`w-full flex-1 min-h-[300px] premium-card bg-transparent rounded-[40px] p-10 focus:outline-none text-2xl font-medium placeholder-slate-700 ${darkMode ? 'text-white' : 'text-slate-900'}`}
                placeholder="Exprimez-vous..."
                value={tempContent}
                onChange={(e) => setTempContent(e.target.value)}
              />
              
              {!currentAnalysis ? (
                 <button 
                   onClick={() => handleAnalysis(tempContent)}
                   disabled={isProcessing || !tempContent.trim()}
                   className="w-full py-7 rounded-[30px] bg-blue-600 text-white font-black uppercase tracking-widest text-[11px] shadow-2xl disabled:opacity-50 active:scale-95 transition-all"
                 >
                   {isProcessing ? <i className="fas fa-spinner fa-spin mr-3"></i> : 'Mémoriser'}
                 </button>
              ) : (
                 <div className="space-y-6 animate-in fade-in duration-500 pb-10">
                    <div className="premium-card p-8 rounded-[40px]">
                      <h3 className={`text-2xl font-black mb-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{currentAnalysis.title}</h3>
                      <p className="text-sm italic text-slate-400 leading-relaxed border-l-2 border-blue-500 pl-4">"{currentAnalysis.summary}"</p>
                    </div>
                    <button onClick={() => finalizeNote(currentAnalysis.suggestions)} className="w-full py-7 rounded-[30px] bg-white text-slate-950 font-black uppercase tracking-widest text-[11px] shadow-xl">Confirmer</button>
                 </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Navigation Bar Fixed Bottom */}
      {!isCapturing && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-6 flex justify-center pb-[calc(1.5rem + env(safe-area-inset-bottom))] pointer-events-none">
          <nav className={`w-full max-w-[340px] premium-card p-2 rounded-[35px] flex justify-between items-center shadow-[0_25px_60px_rgba(0,0,0,0.4)] pointer-events-auto ${darkMode ? 'bg-slate-900/80' : 'bg-white/80'}`}>
            {[
              { id: 'home', icon: 'fa-house' },
              { id: 'history', icon: 'fa-box-archive' },
              { id: 'stats', icon: 'fa-chart-pie' },
              { id: 'settings', icon: 'fa-sliders' }
            ].map((item) => (
              <button 
                key={item.id}
                onClick={() => setView(item.id as any)}
                className={`w-14 h-14 rounded-[20px] flex items-center justify-center transition-all duration-400 ${view === item.id ? (darkMode ? 'bg-white text-slate-950 shadow-lg' : 'bg-slate-950 text-white shadow-lg') : 'text-slate-500 hover:text-blue-400'}`}
              >
                <i className={`fas ${item.icon} text-lg`}></i>
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* Reminder Alert Overlay */}
      {activeReminder && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-8 animate-in fade-in duration-500">
           <div className="bg-white rounded-[50px] p-12 w-full max-w-sm text-center space-y-8 shadow-2xl border-b-8 border-slate-100">
              <div className="w-20 h-20 rounded-full bg-blue-600 mx-auto flex items-center justify-center text-white text-3xl animate-bounce shadow-xl">
                <i className="fas fa-bell"></i>
              </div>
              <div className="space-y-2">
                 <h3 className="text-2xl font-black text-slate-900 tracking-tight">{activeReminder.title}</h3>
                 <p className="text-slate-500 font-medium text-sm">{activeReminder.content}</p>
              </div>
              <button 
                onClick={() => {
                   const updated = { ...activeReminder, isCompleted: true };
                   storageService.saveNote(updated);
                   loadNotes();
                   setActiveReminder(null);
                }}
                className="w-full py-5 rounded-[25px] bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] shadow-lg active:scale-95 transition-all"
              >
                Terminé
              </button>
           </div>
        </div>
      )}

      <NoteModal 
        isOpen={isModalOpen}
        note={selectedNote}
        onClose={() => setIsModalOpen(false)}
        onSave={loadNotes}
      />
    </div>
  );
};

export default App;
