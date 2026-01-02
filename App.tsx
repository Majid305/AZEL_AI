
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Note, NoteType, AISuggestion } from './types';
import { storageService } from './services/storageService';
import { geminiService } from './services/geminiService';

// Components
import NoteCard from './components/NoteCard';
import NoteModal from './components/NoteModal';

const LuminousIcon = () => (
  <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
    <div className="absolute inset-0 bg-blue-500/10 rounded-full blur-[40px] animate-pulse"></div>
    <div className="relative z-10 w-20 h-20 flex items-center justify-center">
      <svg width="100%" height="100%" viewBox="0 0 100 100" fill="none" className="text-current">
        <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="0.5" strokeDasharray="6 4" className="animate-[spin_40s_linear_infinite] opacity-20" />
        <circle cx="50" cy="50" r="18" fill="currentColor" className="drop-shadow-[0_0_15px_rgba(255,255,255,0.7)]" />
        <path d="M50 12V25M50 75V88M12 50H25M75 50H88" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="opacity-50" />
      </svg>
    </div>
  </div>
);

const App: React.FC = () => {
  const [view, setView] = useState<'home' | 'history' | 'stats' | 'settings'>('home');
  const [notes, setNotes] = useState<Note[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureType, setCaptureType] = useState<NoteType | null>(null);
  
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<any>(null);
  const [selectedActionIds, setSelectedActionIds] = useState<string[]>([]);
  const [anticipateReminder, setAnticipateReminder] = useState(false);
  const [tempContent, setTempContent] = useState('');
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('azel_theme') !== 'light');
  const [remindersEnabled, setRemindersEnabled] = useState(() => localStorage.getItem('azel_reminders') !== 'false');
  const [activeReminder, setActiveReminder] = useState<Note | null>(null);

  const loadNotes = useCallback(() => {
    const fetchedNotes = storageService.getNotes();
    setNotes([...fetchedNotes].sort((a, b) => b.createdAt - a.createdAt));
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
    }, 5000);
    return () => clearInterval(interval);
  }, [loadNotes, activeReminder, remindersEnabled]);

  useEffect(() => {
    localStorage.setItem('azel_theme', darkMode ? 'dark' : 'light');
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const startCapture = (type: NoteType) => {
    if (type === 'image') {
      fileInputRef.current?.click();
    } else {
      setCaptureType(type);
      setIsCapturing(true);
      setCurrentAnalysis(null);
      setSelectedActionIds([]);
      setAnticipateReminder(false);
      setTempContent('');
      setImagePreview(null);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCaptureType('image');
      setIsCapturing(true);
      setCurrentAnalysis(null);
      setSelectedActionIds([]);
      setAnticipateReminder(false);
      setTempContent('');
      
      const reader = new FileReader();
      reader.onload = (event) => setImagePreview(event.target?.result as string);
      reader.readAsDataURL(file);
      
      const base64 = await blobToBase64(file);
      await handleAnalysis(base64, file.type);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(blob);
    });
  };

  const handleAnalysis = async (content: string, mimeType: string = 'text/plain') => {
    if (!content.trim() && mimeType === 'text/plain') return;
    setIsProcessing(true);
    try {
      const analysis = await geminiService.analyzeNote(content, mimeType);
      if (analysis) {
        setCurrentAnalysis(analysis);
        setSelectedActionIds(analysis.suggestions.map((s: AISuggestion) => s.id));
        setTempContent(analysis.transcription || (mimeType === 'text/plain' ? content : ''));
      }
    } catch (e) { 
      console.error(e);
      alert("Erreur d'analyse Azel_ai. Veuillez réessayer.");
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleAction = (id: string) => {
    setSelectedActionIds(prev => 
      prev.includes(id) ? prev.filter(aId => aId !== id) : [...prev, id]
    );
  };

  const finalizeNote = () => {
    if (!currentAnalysis) return;
    
    const finalizedSuggestions = currentAnalysis.suggestions.filter((s: AISuggestion) => 
      selectedActionIds.includes(s.id)
    );

    let reminderTimestamp: number | undefined = undefined;
    finalizedSuggestions.forEach((s: AISuggestion) => {
      if (s.actionType === 'schedule' && s.metadata) {
        let ts = new Date(s.metadata).getTime();
        if (anticipateReminder) {
          ts = ts - (30 * 60 * 1000);
        }
        reminderTimestamp = ts;
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
      aiProcessed: { 
        summary: currentAnalysis.summary, 
        suggestions: finalizedSuggestions, 
        lastProcessed: Date.now() 
      }
    };
    storageService.saveNote(newNote);
    loadNotes();
    setIsCapturing(false);
    setView('history');
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Supprimer cette note ?")) {
      storageService.deleteNote(id);
      setNotes(prev => prev.filter(n => n.id !== id));
    }
  };

  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("Votre navigateur ne supporte pas l'enregistrement audio.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Supporte webm sur Android/Chrome, mp4/aac sur iOS/Safari
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
        ? 'audio/webm' 
        : MediaRecorder.isTypeSupported('audio/mp4') 
          ? 'audio/mp4' 
          : 'audio/aac';
          
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const base64 = await blobToBase64(audioBlob);
        handleAnalysis(base64, mimeType);
        stream.getTracks().forEach(track => track.stop());
      };
      recorder.start();
      setIsRecording(true);
    } catch (err: any) { 
      console.error(err);
      if (err.name === 'NotAllowedError') {
        alert("L'accès au microphone a été refusé. Veuillez l'activer dans les paramètres de votre navigateur.");
      } else {
        alert("Microphone inaccessible : " + err.message);
      }
      setIsCapturing(false); 
    }
  };

  const stopRecording = () => { mediaRecorderRef.current?.stop(); setIsRecording(false); };

  const openEditModal = (note: Note) => {
    setSelectedNote(note);
    setIsModalOpen(true);
  };

  const renderHome = () => (
    <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-12 animate-in fade-in duration-700">
      <div className="flex flex-col items-center text-center">
        <LuminousIcon />
        <div className="mt-4 space-y-1">
          <h1 className="text-5xl font-black tracking-tighter">Azel_ai</h1>
          <p className="opacity-40 font-bold tracking-[0.4em] uppercase text-[9px]">Intelligence Intuitive</p>
        </div>
      </div>
      
      <div className="w-full flex flex-row justify-center gap-4 overflow-x-auto pb-6 hide-scrollbar">
        <button onClick={() => startCapture('text')} className="min-w-[110px] aspect-square premium-card rounded-[35px] flex flex-col items-center justify-center gap-3 active:scale-90 transition-all border border-white/5 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 text-xl"><i className="fas fa-feather-pointed"></i></div>
          <span className="text-[10px] font-black tracking-widest uppercase">Écrire</span>
        </button>
        
        <button onClick={() => startCapture('voice')} className="min-w-[110px] aspect-square premium-card rounded-[35px] flex flex-col items-center justify-center gap-3 active:scale-90 transition-all border border-white/5 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 text-xl"><i className="fas fa-waveform-lines"></i></div>
          <span className="text-[10px] font-black tracking-widest uppercase">Parler</span>
        </button>
        
        <button onClick={() => startCapture('image')} className="min-w-[110px] aspect-square premium-card rounded-[35px] flex flex-col items-center justify-center gap-3 active:scale-90 transition-all border border-white/5 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-500 text-xl"><i className="fas fa-image"></i></div>
          <span className="text-[10px] font-black tracking-widest uppercase">Image</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className={`h-full w-full flex flex-col relative overflow-hidden transition-colors duration-500 ${darkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-[-5%] right-[-5%] w-[70%] h-[70%] bg-blue-500/[0.04] rounded-full blur-[120px]"></div>
      </div>

      <div className="flex-1 relative z-10 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto hide-scrollbar">
          {!isCapturing ? (
            <div className="min-h-full flex flex-col pb-40">
              {view === 'home' && renderHome()}
              
              {view === 'history' && (
                <div className="p-8 space-y-8 animate-in slide-in-from-bottom-5 duration-500">
                  <div className="flex items-center justify-between mt-4">
                    <h2 className="text-4xl font-black">Archives</h2>
                    <span className="premium-card px-4 py-2 rounded-xl text-[10px] font-black opacity-60 uppercase tracking-widest">{notes.length}</span>
                  </div>
                  <div className="flex flex-col gap-6">
                    {notes.length === 0 ? (
                      <div className="py-40 text-center opacity-10 flex flex-col items-center gap-4">
                        <i className="fas fa-box-open text-7xl"></i>
                        <p className="font-black uppercase tracking-widest text-xs">Mémoire vide</p>
                      </div>
                    ) : notes.map(n => <NoteCard key={n.id} note={n} onClick={openEditModal} onDelete={handleDelete} />)}
                  </div>
                </div>
              )}

              {view === 'stats' && (
                <div className="p-8 space-y-8 animate-in fade-in">
                  <h2 className="text-3xl font-black mt-4 text-center">Statistiques</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="premium-card p-6 rounded-[35px] flex flex-col items-center justify-center gap-2 border-t-2 border-blue-500/30">
                      <p className="text-[10px] font-black uppercase text-blue-500 tracking-tighter">Mémoire</p>
                      <p className="text-5xl font-black">{notes.length}</p>
                    </div>
                    <div className="premium-card p-6 rounded-[35px] flex flex-col items-center justify-center gap-2 border-t-2 border-emerald-500/30">
                      <p className="text-[10px] font-black uppercase text-emerald-500 tracking-tighter">En cours</p>
                      <p className="text-5xl font-black">{notes.filter(n => n.reminderAt && !n.isCompleted).length}</p>
                    </div>
                  </div>
                  
                  <div className="premium-card p-8 rounded-[40px] space-y-6 shadow-2xl">
                    <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2 mb-4">
                      <i className="fas fa-brain text-blue-500"></i> Organisation par IA
                    </h4>
                    {['task', 'reminder', 'bill', 'contact', 'general'].map(nature => {
                      const count = notes.filter(n => n.nature === nature).length;
                      const percent = notes.length > 0 ? (count / notes.length) * 100 : 0;
                      if (count === 0 && notes.length > 0) return null;
                      return (
                        <div key={nature} className="space-y-3">
                          <div className="flex justify-between text-[11px] font-black uppercase">
                            <span className="opacity-70">{nature === 'bill' ? 'Facture' : nature === 'task' ? 'Tâche' : nature === 'reminder' ? 'Rappel' : nature}</span>
                            <span className="text-blue-500">{count}</span>
                          </div>
                          <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 shadow-inner">
                            <div className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-1000 ease-out" style={{ width: `${percent}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {view === 'settings' && (
                <div className="p-8 space-y-6 animate-in fade-in">
                  <h2 className="text-3xl font-black mt-4">Réglages</h2>
                  <div className="premium-card p-6 rounded-[35px] flex items-center justify-between border border-white/5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500"><i className="fas fa-moon"></i></div>
                      <span className="font-black uppercase tracking-widest text-[10px]">Mode Sombre</span>
                    </div>
                    <button onClick={() => setDarkMode(!darkMode)} className={`w-14 h-8 rounded-full transition-all relative p-1 ${darkMode ? 'bg-blue-600' : 'bg-slate-300'}`}>
                      <div className={`w-6 h-6 rounded-full transition-all shadow-md bg-white ${darkMode ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                  </div>
                  <div className="premium-card p-6 rounded-[35px] flex items-center justify-between border border-white/5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500"><i className="fas fa-bell"></i></div>
                      <span className="font-black uppercase tracking-widest text-[10px]">Rappels Azel</span>
                    </div>
                    <button onClick={() => setRemindersEnabled(!remindersEnabled)} className={`w-14 h-8 rounded-full transition-all relative p-1 ${remindersEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                      <div className={`w-6 h-6 rounded-full transition-all shadow-md bg-white ${remindersEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                  </div>
                  <button onClick={() => { if(confirm("Effacer toute la mémoire d'Azel_ai ?")) { localStorage.clear(); location.reload(); } }} className="w-full p-6 rounded-[35px] border border-red-500/20 text-red-500 text-[11px] font-black uppercase tracking-widest mt-12 bg-red-500/5 hover:bg-red-500/10 transition-all">Réinitialiser la mémoire</button>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col animate-in slide-in-from-bottom-10 duration-500">
              <div className="p-8 pb-4 flex items-center justify-between shrink-0">
                <button onClick={() => setIsCapturing(false)} className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center"><i className="fas fa-chevron-left"></i></button>
                <span className="font-black uppercase tracking-[0.5em] text-[10px] opacity-40">{captureType}</span>
                <div className="w-12" />
              </div>

              <div className="flex-1 overflow-y-auto px-8 space-y-6 hide-scrollbar pb-32">
                {captureType === 'voice' && !currentAnalysis && (
                  <div className="h-full flex flex-col items-center justify-center space-y-12 py-12">
                    <div className={`w-52 h-52 rounded-full flex items-center justify-center transition-all duration-500 ${isRecording ? 'bg-red-500/10 scale-110' : 'bg-blue-500/5'}`}>
                      <div className={`w-32 h-32 rounded-full flex items-center justify-center text-4xl shadow-2xl transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse shadow-[0_0_30px_rgba(239,68,68,0.5)]' : 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]'}`}><i className={`fas ${isRecording ? 'fa-stop' : 'fa-microphone'}`}></i></div>
                    </div>
                    <button onClick={isRecording ? stopRecording : startRecording} className={`px-16 py-7 rounded-full font-black uppercase tracking-[0.2em] text-xs shadow-xl transition-all ${isRecording ? 'bg-white text-red-500' : 'bg-blue-600 text-white'}`}>{isRecording ? 'Terminer' : 'Écouter'}</button>
                  </div>
                )}

                {(captureType === 'text' || currentAnalysis || imagePreview) && (
                  <div className="flex flex-col gap-8 py-4">
                    {imagePreview && (
                      <div className="w-full aspect-video rounded-[45px] overflow-hidden premium-card shrink-0 shadow-2xl border-4 border-white/10">
                        <img src={imagePreview} className="w-full h-full object-cover" alt="Capture" />
                      </div>
                    )}
                    
                    {!currentAnalysis && captureType === 'text' && (
                      <textarea autoFocus className={`w-full min-h-[250px] premium-card bg-transparent rounded-[45px] p-10 focus:outline-none text-2xl font-medium placeholder-slate-800 leading-relaxed shadow-inner`} placeholder="Décrivez votre pensée..." value={tempContent} onChange={(e) => setTempContent(e.target.value)} />
                    )}

                    {currentAnalysis && (
                      <div className="space-y-8 animate-in fade-in">
                        <div className="premium-card p-10 rounded-[50px] border-l-[6px] border-blue-500 shadow-2xl">
                          <h3 className="text-3xl font-black mb-3 tracking-tight">{currentAnalysis.title}</h3>
                          <p className="text-base italic opacity-50 leading-relaxed mb-6">"{currentAnalysis.summary}"</p>
                          <textarea className="w-full bg-white/5 p-6 rounded-3xl text-base opacity-90 focus:outline-none border border-white/5 focus:border-blue-500/30 transition-all" value={tempContent} onChange={(e) => setTempContent(e.target.value)} rows={5} />
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center justify-between px-4">
                             <h4 className="text-[11px] font-black uppercase tracking-[0.4em] opacity-40">Actions de l'IA</h4>
                             {currentAnalysis.suggestions.some((s: AISuggestion) => s.actionType === 'schedule') && (
                                <button onClick={() => setAnticipateReminder(!anticipateReminder)} className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${anticipateReminder ? 'bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'bg-white/10 text-slate-500'}`}>
                                   <i className="fas fa-clock"></i> Rappel -30 min
                                </button>
                             )}
                          </div>
                          
                          <div className="grid gap-4">
                            {currentAnalysis.suggestions.map((s: AISuggestion) => (
                              <div 
                                key={s.id} 
                                onClick={() => toggleAction(s.id)}
                                className={`flex items-center gap-5 p-6 rounded-[35px] premium-card transition-all cursor-pointer border-2 ${selectedActionIds.includes(s.id) ? 'border-blue-500/50 bg-blue-500/10 scale-[1.02]' : 'border-transparent opacity-50'}`}
                              >
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center border-2 transition-all ${selectedActionIds.includes(s.id) ? 'bg-blue-500 border-blue-500' : 'border-white/20'}`}>
                                  {selectedActionIds.includes(s.id) && <i className="fas fa-check text-[10px] text-white"></i>}
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-black uppercase tracking-widest">{s.label}</p>
                                  {s.metadata && (
                                    <p className="text-[10px] opacity-60 mt-1 font-bold">
                                      {anticipateReminder && s.actionType === 'schedule' 
                                        ? new Date(new Date(s.metadata).getTime() - 30 * 60 * 1000).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })
                                        : new Date(s.metadata).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })
                                      }
                                    </p>
                                  )}
                                </div>
                                <i className={`fas ${s.actionType === 'schedule' ? 'fa-clock' : s.actionType === 'save_contact' ? 'fa-user' : 'fa-list-check'} text-lg opacity-40`}></i>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="p-8 pt-4 pb-[calc(2.5rem + env(safe-area-inset-bottom))] shrink-0 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent">
                {!currentAnalysis ? (
                  captureType === 'text' && (
                    <button onClick={() => handleAnalysis(tempContent)} disabled={isProcessing || !tempContent.trim()} className="w-full py-8 rounded-[35px] bg-blue-600 text-white font-black uppercase tracking-[0.3em] text-[12px] shadow-2xl disabled:opacity-50 active:scale-95 transition-all">Mémoriser</button>
                  )
                ) : (
                  <button onClick={finalizeNote} className="w-full py-8 rounded-[35px] bg-blue-600 text-white font-black uppercase tracking-[0.3em] text-[12px] shadow-[0_10px_30px_rgba(37,99,235,0.4)] active:scale-95 transition-all">Confirmer & Organiser</button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {!isCapturing && (
        <div className="fixed bottom-0 left-0 right-0 z-[100] p-8 flex justify-center pb-[calc(2rem + env(safe-area-inset-bottom))] pointer-events-none">
          <nav className={`w-full max-w-[360px] premium-card p-3 rounded-[40px] flex justify-between items-center shadow-2xl pointer-events-auto border border-white/10 ${darkMode ? 'bg-slate-900/90' : 'bg-white/90'}`}>
            {[ { id: 'home', icon: 'fa-house' }, { id: 'history', icon: 'fa-box-archive' }, { id: 'stats', icon: 'fa-chart-pie' }, { id: 'settings', icon: 'fa-sliders' } ].map((item) => (
              <button key={item.id} onClick={() => setView(item.id as any)} className={`w-16 h-16 rounded-[28px] flex items-center justify-center transition-all duration-300 ${view === item.id ? (darkMode ? 'bg-white text-slate-950 shadow-xl scale-110' : 'bg-slate-950 text-white shadow-xl scale-110') : 'text-slate-500 hover:text-blue-500'}`}>
                <i className={`fas ${item.icon} text-xl`}></i>
              </button>
            ))}
          </nav>
        </div>
      )}

      {isProcessing && (
        <div className="fixed inset-0 z-[200] bg-slate-950/85 backdrop-blur-2xl flex flex-col items-center justify-center space-y-8 animate-in fade-in duration-300">
          <div className="relative w-24 h-24">
            <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-t-blue-500 rounded-full animate-spin"></div>
            <div className="absolute inset-4 bg-blue-500/10 rounded-full animate-pulse"></div>
          </div>
          <p className="text-[11px] font-black uppercase tracking-[0.5em] text-white animate-pulse">Azel_ai analyse...</p>
        </div>
      )}

      {activeReminder && (
        <div className="fixed inset-0 z-[300] bg-slate-950/80 backdrop-blur-3xl flex items-center justify-center p-8 animate-in fade-in duration-500">
          <div className="bg-white text-slate-950 rounded-[60px] p-12 w-full max-w-sm text-center space-y-10 shadow-2xl border-b-[10px] border-slate-200">
            <div className="w-24 h-24 rounded-full bg-blue-600 mx-auto flex items-center justify-center text-white text-4xl animate-bounce shadow-2xl shadow-blue-500/40"><i className="fas fa-bell"></i></div>
            <div className="space-y-4">
              <h3 className="text-3xl font-black tracking-tight leading-tight">{activeReminder.title}</h3>
              <p className="text-slate-500 font-semibold text-base leading-relaxed">{activeReminder.content}</p>
            </div>
            <button onClick={() => { const updated = { ...activeReminder, isCompleted: true }; storageService.saveNote(updated); loadNotes(); setActiveReminder(null); }} className="w-full py-6 rounded-[30px] bg-slate-950 text-white font-black uppercase tracking-[0.2em] text-[11px] active:scale-95 transition-all shadow-xl">J'ai compris</button>
          </div>
        </div>
      )}

      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*" 
        onChange={handleFileChange} 
      />

      <NoteModal isOpen={isModalOpen} note={selectedNote} onClose={() => setIsModalOpen(false)} onSave={loadNotes} />
    </div>
  );
};

export default App;
