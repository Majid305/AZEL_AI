
import React, { useState, useEffect, useCallback } from 'react';
import { Note, NoteType } from './types';
import { storageService } from './services/storageService';
import { geminiService } from './services/geminiService';

// Components
import NoteCard from './components/NoteCard';
import NoteModal from './components/NoteModal';

const LuminousIcon = () => (
  <div className="relative w-24 h-24 flex items-center justify-center luminous-glow">
    <div className="absolute inset-0 bg-white/20 rounded-full blur-3xl opacity-40"></div>
    <svg width="80" height="80" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="iconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.4" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="42" stroke="url(#iconGradient)" strokeWidth="1.5" strokeDasharray="8 4" className="animate-[spin_12s_linear_infinite]" />
      <circle cx="50" cy="50" r="12" fill="white" className="animate-pulse" />
      <path d="M50 22V32M50 68V78M22 50H32M68 50H78" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
    </svg>
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
  
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('azel_theme') === 'dark');
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
    <div className="flex-1 flex flex-col items-center justify-center space-y-12 p-10 animate-in fade-in zoom-in-95 duration-700 h-full">
      <div className="flex flex-col items-center space-y-6">
        <LuminousIcon />
        <div className="text-center space-y-1">
          <h1 className="text-5xl font-black tracking-tight text-white">Azel_ai</h1>
          <p className="text-white/40 font-bold tracking-[0.4em] uppercase text-[9px]">Intelligence Intuitive</p>
        </div>
      </div>

      <div className="grid grid-cols-1 w-full gap-5 max-w-sm">
        {[
          { type: 'text', icon: 'fa-feather-pointed', label: 'Note Écrite' },
          { type: 'voice', icon: 'fa-waveform-lines', label: 'Note Vocale' },
          { type: 'image', icon: 'fa-camera-retro', label: 'Note Visuelle' }
        ].map((btn) => (
          <button 
            key={btn.type}
            onClick={() => startCapture(btn.type as NoteType)}
            className="group premium-card p-6 rounded-[32px] flex items-center gap-6 active:scale-95 transition-all"
          >
            <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-xl group-hover:bg-white group-hover:text-[#C5636C] transition-colors">
              <i className={`fas ${btn.icon}`}></i>
            </div>
            <span className="text-xs font-black tracking-widest text-white uppercase">{btn.label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  const renderStats = () => {
    const totalCount = notes.length;
    const completedCount = notes.filter(n => !!n.isCompleted).length;
    const byNature = notes.reduce<Record<string, number>>((acc, n) => {
      const nature = String(n.nature);
      acc[nature] = (acc[nature] || 0) + 1;
      return acc;
    }, {});

    return (
      <div className="flex-1 p-8 space-y-10 overflow-y-auto hide-scrollbar pb-40 h-full animate-in fade-in duration-500">
        <h2 className="text-4xl font-black tracking-tight text-white">Performances</h2>
        <div className="grid grid-cols-2 gap-5">
          <div className="premium-card p-7 rounded-[35px]">
            <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-2">Total</p>
            <p className="text-4xl font-black text-white">{totalCount}</p>
          </div>
          <div className="premium-card p-7 rounded-[35px]">
            <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-2">Traitées</p>
            <p className="text-4xl font-black text-white">{completedCount}</p>
          </div>
        </div>
        <div className="premium-card p-8 rounded-[40px] space-y-8">
          <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/50">Répartition</h4>
          <div className="space-y-6">
            {Object.entries(byNature).map(([nature, count]) => {
              const percentage = totalCount > 0 ? (Number(count) / totalCount) * 100 : 0;
              return (
                <div key={nature} className="space-y-2">
                  <div className="flex justify-between items-center text-[11px] font-black text-white/70 uppercase tracking-widest">
                    <span>{nature}</span>
                    <span>{Number(count)}</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-white transition-all duration-1000" style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderSettings = () => (
    <div className="flex-1 p-8 space-y-10 overflow-y-auto hide-scrollbar pb-40 h-full animate-in fade-in duration-500">
      <h2 className="text-4xl font-black tracking-tight text-white">Réglages</h2>
      <div className="space-y-5">
        <div className="premium-card p-7 rounded-[35px] flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 text-white flex items-center justify-center"><i className="fas fa-moon"></i></div>
            <p className="font-black text-[11px] uppercase tracking-widest text-white">Mode Sombre</p>
          </div>
          <button onClick={() => setDarkMode(!darkMode)} className={`w-14 h-8 rounded-full transition-all relative p-1 ${darkMode ? 'bg-white' : 'bg-white/20'}`}>
            <div className={`w-6 h-6 rounded-full transition-all shadow-md ${darkMode ? 'translate-x-6 bg-[#C5636C]' : 'translate-x-0 bg-white'}`} />
          </button>
        </div>
        <div className="premium-card p-7 rounded-[35px] flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 text-white flex items-center justify-center"><i className="fas fa-bell"></i></div>
            <p className="font-black text-[11px] uppercase tracking-widest text-white">Notifications</p>
          </div>
          <button onClick={() => setRemindersEnabled(!remindersEnabled)} className={`w-14 h-8 rounded-full transition-all relative p-1 ${remindersEnabled ? 'bg-white' : 'bg-white/20'}`}>
            <div className={`w-6 h-6 rounded-full transition-all shadow-md ${remindersEnabled ? 'translate-x-6 bg-[#C5636C]' : 'translate-x-0 bg-white'}`} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`h-full w-full flex flex-col relative transition-colors duration-1000 overflow-hidden ${darkMode ? 'bg-slate-900' : 'bg-[#C5636C]'}`}>
      
      {/* Glow décoratif */}
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-white/10 rounded-full blur-[100px] pointer-events-none"></div>
      
      {/* Contenu principal défilable */}
      <div className="flex-1 overflow-hidden relative">
        {view === 'home' && !isCapturing && renderHome()}
        {view === 'history' && !isCapturing && (
          <div className="h-full p-8 space-y-10 overflow-y-auto hide-scrollbar pb-40 animate-in fade-in duration-500">
             <div className="flex items-center justify-between">
               <h2 className="text-4xl font-black tracking-tight text-white">Archives</h2>
               <div className="premium-card px-4 py-2 rounded-2xl text-[9px] font-black text-white tracking-widest uppercase">{notes.length} notes</div>
             </div>
             <div className="grid grid-cols-1 gap-6">
               {notes.length === 0 ? (
                 <div className="py-24 text-center opacity-30 flex flex-col items-center gap-4">
                   <i className="fas fa-inbox text-7xl"></i>
                   <p className="uppercase tracking-[0.4em] text-[10px] font-bold">Esprit serein</p>
                 </div>
               ) : (
                 notes.map(n => <NoteCard key={n.id} note={n} onClick={(note) => { setSelectedNote(note); setIsModalOpen(true); }} onDelete={(id) => { if(confirm("Supprimer ?")) { storageService.deleteNote(id); loadNotes(); } }} />)
               )}
             </div>
          </div>
        )}
        {view === 'stats' && renderStats()}
        {view === 'settings' && renderSettings()}

        {isCapturing && (
          <div className="h-full p-8 space-y-10 overflow-y-auto hide-scrollbar animate-in slide-in-from-bottom-20 duration-500 pb-40">
            <div className="flex items-center justify-between">
              <button onClick={() => setIsCapturing(false)} className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white"><i className="fas fa-chevron-left"></i></button>
              <h2 className="text-xs font-black text-white uppercase tracking-[0.4em]">Nouvelle Saisie</h2>
              <div className="w-12" />
            </div>
            
            <textarea 
              autoFocus
              className="w-full h-64 bg-white/10 rounded-[40px] p-8 focus:outline-none border border-white/20 text-2xl font-medium placeholder-white/30 text-white shadow-inner"
              placeholder="Que retenir ?"
              value={tempContent}
              onChange={(e) => setTempContent(e.target.value)}
            />

            {!currentAnalysis && (
              <button 
                onClick={() => handleAnalysis(tempContent)}
                disabled={isProcessing || !tempContent.trim()}
                className="w-full py-6 rounded-[32px] bg-white text-[#C5636C] font-black uppercase tracking-[0.3em] text-[11px] shadow-2xl active:scale-95 transition-all disabled:opacity-50"
              >
                {isProcessing ? <i className="fas fa-spinner fa-spin mr-3"></i> : 'Confier à Azel_ai'}
              </button>
            )}

            {currentAnalysis && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-500">
                 <div className="premium-card p-10 rounded-[50px] border-white/10">
                   <h3 className="text-3xl font-black text-white mb-5 leading-tight">{currentAnalysis.title}</h3>
                   <p className="text-white/80 leading-relaxed font-medium text-lg italic border-l-2 border-white/20 pl-8">{currentAnalysis.summary}</p>
                 </div>
                 <button 
                   onClick={() => finalizeNote(currentAnalysis.suggestions)}
                   className="w-full py-6 rounded-[35px] bg-white text-[#C5636C] font-black uppercase tracking-widest text-xs shadow-2xl active:scale-95 transition-all"
                 >
                   Enregistrer
                 </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation Flottante Fixe */}
      <div className="nav-fixed-bottom">
        <nav className="max-w-md mx-auto premium-card p-2 rounded-[35px] flex justify-between items-center pointer-events-auto border-white/20 shadow-[0_30px_60px_rgba(0,0,0,0.4)]">
          {[
            { id: 'home', icon: 'fa-house-user' },
            { id: 'history', icon: 'fa-layer-group' },
            { id: 'stats', icon: 'fa-chart-simple' },
            { id: 'settings', icon: 'fa-ellipsis' }
          ].map((item) => (
            <button 
              key={item.id}
              onClick={() => { setView(item.id as any); setIsCapturing(false); }}
              className={`w-14 h-14 rounded-[26px] flex items-center justify-center transition-all duration-500 ${view === item.id ? 'bg-white text-[#C5636C] scale-110 shadow-xl' : 'text-white/30'}`}
            >
              <i className={`fas ${item.icon} text-lg`}></i>
            </button>
          ))}
        </nav>
      </div>

      {activeReminder && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-8 bg-slate-900/90 backdrop-blur-xl animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-[55px] p-12 text-center space-y-8 shadow-[0_50px_120px_rgba(0,0,0,0.5)]">
             <div className="w-20 h-20 rounded-full bg-[#C5636C] mx-auto flex items-center justify-center text-white text-3xl animate-bounce shadow-xl">
                <i className="fas fa-bell"></i>
             </div>
             <div className="space-y-4">
               <h3 className="text-2xl font-black text-slate-900">{activeReminder.title}</h3>
               <p className="text-slate-500 font-medium">{activeReminder.content}</p>
             </div>
             <button 
               onClick={() => {
                 const updatedNote = { ...activeReminder, isCompleted: true };
                 storageService.saveNote(updatedNote);
                 loadNotes();
                 setActiveReminder(null);
               }} 
               className="w-full py-5 rounded-[35px] bg-[#C5636C] text-white font-black uppercase tracking-[0.2em] text-[10px]"
             >
               C'est fait
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
