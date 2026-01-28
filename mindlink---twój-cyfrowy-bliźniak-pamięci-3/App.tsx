
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Memory, ViewState, ChatMessage, GraphData, Node, Link, Attachment } from './types';
import { analyzeMemory, getDigitalTwinResponse, generateInsights, generateStudyPlan } from './services/geminiService';
import KnowledgeGraph from './components/KnowledgeGraph';
import { 
  History, 
  Network, 
  Sparkles, 
  Plus, 
  Send, 
  Trash2, 
  Lightbulb,
  Cpu,
  User,
  Search,
  X,
  ChevronRight,
  Image as ImageIcon,
  FileText,
  BookOpen,
  Loader2,
  Mail,
  Lock,
  LogOut,
  ShieldCheck
} from 'lucide-react';

const LOGO_URL = "https://files.oaiusercontent.com/file-K1F56p5S9uQ7xK4uHj5X7e?se=2025-02-18T12%3A58%3A01Z&sp=r&sv=24.12.30&sr=b&rscc=max-age%3D604800%2C%20immutable%2C%20private&rscd=attachment%3B%20filename%3D7f769062-8706-4444-964a-250917637841.webp&sig=G0Fas2p/nN3h53iA6D/G6Y0L94m4eP%2BJpT0h9H6WqGk%3D";

const App: React.FC = () => {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [view, setView] = useState<ViewState>('timeline');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [insights, setInsights] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState<Attachment | null>(null);
  const [studyPlan, setStudyPlan] = useState<string | null>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cleanText = (text: string) => text.replace(/\*/g, '');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('mindlink_memories');
      if (saved) setMemories(JSON.parse(saved));
      const savedChat = localStorage.getItem('mindlink_chat');
      if (savedChat) setChatHistory(JSON.parse(savedChat));
      const savedLogin = localStorage.getItem('mindlink_logged_in');
      if (savedLogin === 'true') {
        setIsLoggedIn(true);
        setEmail(localStorage.getItem('mindlink_user_email') || '');
      }
    } catch (e) {
      console.error("Storage loading error", e);
    }
    const timer = setTimeout(() => setShowSplash(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!showSplash) localStorage.setItem('mindlink_memories', JSON.stringify(memories));
  }, [memories, showSplash]);

  useEffect(() => {
    if (!showSplash) localStorage.setItem('mindlink_chat', JSON.stringify(chatHistory));
  }, [chatHistory, showSplash]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      setSelectedAttachment({
        type: file.type.includes('pdf') ? 'pdf' : 'image',
        data: base64,
        mimeType: file.type,
        name: file.name
      });
    };
    reader.readAsDataURL(file);
  };

  const handleAddMemory = async () => {
    if (!inputValue.trim() && !selectedAttachment) return;
    setIsProcessing(true);
    try {
      const analysis = await analyzeMemory(inputValue || "Załącznik: " + selectedAttachment?.name, memories, selectedAttachment || undefined);
      const newMemory: Memory = {
        id: crypto.randomUUID(),
        content: inputValue || `Analiza: ${selectedAttachment?.name}`,
        timestamp: Date.now(),
        type: 'note',
        concepts: analysis.concepts || [],
        links: analysis.suggestedLinks || [],
        attachment: selectedAttachment || undefined
      };
      setMemories(prev => [newMemory, ...prev]);
      setInputValue('');
      setSelectedAttachment(null);
      setIsAddModalOpen(false);
      const newInsights = await generateInsights([newMemory, ...memories]);
      setInsights(newInsights);
    } catch (error) {
      console.error("AI Analysis error", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleChat = async () => {
    if (!chatInput.trim() || isProcessing) return;
    const userMsg: ChatMessage = { role: 'user', text: chatInput, timestamp: Date.now() };
    setChatHistory(prev => [...prev, userMsg]);
    const input = chatInput;
    setChatInput('');
    setIsProcessing(true);
    try {
      const response = await getDigitalTwinResponse(input, memories, chatHistory);
      const modelMsg: ChatMessage = { role: 'model', text: response, timestamp: Date.now() };
      setChatHistory(prev => [...prev, modelMsg]);
    } catch (error) {
      console.error("Chat error", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateStudyPlan = async () => {
    if (memories.length === 0 || isGeneratingPlan) return;
    setIsGeneratingPlan(true);
    try {
      const plan = await generateStudyPlan(memories);
      setStudyPlan(plan);
    } catch (error) {
      console.error("Plan generation error", error);
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) {
      setIsLoggedIn(true);
      localStorage.setItem('mindlink_logged_in', 'true');
      localStorage.setItem('mindlink_user_email', email);
      setView('timeline');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('mindlink_logged_in');
    localStorage.removeItem('mindlink_user_email');
    setView('account');
  };

  const graphData = useMemo((): GraphData => {
    const nodes: Node[] = [];
    const links: Link[] = [];
    const conceptMap = new Map<string, string>();
    memories.forEach(m => {
      nodes.push({ id: m.id, label: m.content.substring(0, 20), type: 'memory', group: 1 });
      (m.concepts || []).forEach(concept => {
        if (!conceptMap.has(concept)) {
          const conceptId = `concept-${concept}`;
          conceptMap.set(concept, conceptId);
          nodes.push({ id: conceptId, label: concept, type: 'concept', group: 2 });
        }
        links.push({ source: m.id, target: conceptMap.get(concept)!, strength: 1 });
      });
    });
    return { nodes, links };
  }, [memories]);

  if (showSplash) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-[#047857]">
        <div className="w-56 h-56 mb-8 overflow-hidden rounded-full border-4 border-[#d1fae5]/30 shadow-2xl animate-pulse-soft">
          <img src={LOGO_URL} className="w-full h-full object-cover" alt="Logo" />
        </div>
        <h1 className="text-4xl font-bold tracking-widest text-[#d1fae5]">MINDLINK</h1>
        <p className="text-[#d1fae5]/60 text-xs mt-2 uppercase tracking-widest">Twoja pamięć na sterydach</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 overflow-hidden relative">
      <header className="px-6 pt-8 pb-4 flex justify-between items-center bg-slate-950/80 backdrop-blur-md z-20 sticky top-0 border-b border-emerald-900/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden border border-emerald-500/40 bg-emerald-950">
            <img src={LOGO_URL} className="w-full h-full object-cover" alt="Logo" />
          </div>
          <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">Mindlink</h1>
        </div>
        <button 
          onClick={() => setView('account')}
          className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all ${view === 'account' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400'}`}
        >
          <User size={18} />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto px-5 pb-32 pt-2 scroll-smooth" ref={scrollRef}>
        
        {view === 'timeline' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="relative mb-8">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input 
                type="text" 
                placeholder="Szukaj w swoich myślach..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-sm"
              />
            </div>

            {memories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 opacity-20 gap-4">
                 <img src={LOGO_URL} className="w-32 h-32 rounded-full grayscale" alt="empty" />
                 <p className="text-sm text-center">Dodaj pierwszą notatkę.<br/>Zacznij budować swój kognitywny świat.</p>
              </div>
            ) : memories.filter(m => m.content.toLowerCase().includes(searchTerm.toLowerCase())).map((m) => (
              <div key={m.id} className="bg-slate-900 border border-slate-800/60 p-5 rounded-3xl border-l-4 border-l-emerald-600 shadow-lg">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">{new Date(m.timestamp).toLocaleDateString()}</span>
                  <button onClick={() => setMemories(prev => prev.filter(x => x.id !== m.id))} className="text-slate-700 hover:text-red-400">
                    <Trash2 size={14} />
                  </button>
                </div>
                {m.attachment && (
                  <div className="mb-4 rounded-xl border border-slate-800 bg-slate-950 p-2 flex items-center gap-3">
                    {m.attachment.type === 'image' ? (
                      <img src={`data:${m.attachment.mimeType};base64,${m.attachment.data}`} className="w-12 h-12 object-cover rounded-lg" alt="att" />
                    ) : (
                      <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-400"><FileText size={24} /></div>
                    )}
                    <p className="text-[10px] text-slate-400 truncate flex-1">{m.attachment.name}</p>
                  </div>
                )}
                <p className="text-sm text-slate-200 leading-relaxed mb-4">{m.content}</p>
                <div className="flex flex-wrap gap-2">
                  {(m.concepts || []).map(c => <span key={c} className="text-[9px] px-2 py-1 bg-emerald-900/20 text-emerald-300 rounded-lg border border-emerald-800/50">#{c}</span>)}
                </div>
              </div>
            ))}
          </div>
        )}

        {view === 'graph' && <div className="h-[calc(100vh-250px)]"><KnowledgeGraph data={graphData} /></div>}

        {view === 'chat' && (
          <div className="flex flex-col h-full">
            <div className="flex-1 space-y-4 mb-4 pb-20">
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl text-[10px] text-emerald-400 mb-6 uppercase tracking-widest font-bold text-center">
                Rozmawiasz ze swoim cyfrowym bliźniakiem
              </div>
              {chatHistory.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-4 rounded-3xl ${msg.role === 'user' ? 'bg-emerald-700 text-white shadow-lg shadow-emerald-900/20' : 'bg-slate-900 text-slate-200 border border-slate-800'}`}>
                    <p className="text-sm leading-relaxed">{cleanText(msg.text)}</p>
                  </div>
                </div>
              ))}
              {isProcessing && <div className="text-emerald-500 px-4 animate-pulse text-xs font-bold uppercase tracking-widest">Mindlink myśli...</div>}
            </div>
            <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-full max-w-[480px] px-5">
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Zagadaj do bliźniaka..."
                  className="w-full bg-slate-900/95 backdrop-blur border border-slate-700 rounded-2xl py-4 pl-5 pr-14 text-sm focus:ring-2 focus:ring-emerald-500/30"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleChat()}
                />
                <button onClick={handleChat} className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white"><Send size={18} /></button>
              </div>
            </div>
          </div>
        )}

        {view === 'insights' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-emerald-900/30 to-slate-900 border border-emerald-500/20 p-6 rounded-[32px] shadow-xl">
               <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-emerald-300"><Sparkles size={20} /> Kognitywny Insight</h3>
               <p className="text-sm text-slate-300 leading-relaxed font-light">{insights || "Dodaj więcej treści, a pokażę Ci wzorce w Twoim myśleniu."}</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-[32px] space-y-4 shadow-xl">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold flex items-center gap-2 text-emerald-400"><BookOpen size={20} /> Evidence-Based Study Plan</h3>
                <button onClick={handleCreateStudyPlan} disabled={isGeneratingPlan || memories.length === 0} className="bg-emerald-600 text-white text-[10px] font-bold px-4 py-2 rounded-full shadow-lg active:scale-95 transition-all">
                  {isGeneratingPlan ? <Loader2 size={12} className="animate-spin" /> : 'GENERUJ PLAN'}
                </button>
              </div>
              <div className="bg-slate-950/50 rounded-2xl p-5 border border-slate-800 min-h-[100px]">
                {studyPlan ? (
                  <p className="text-sm text-slate-300 font-light leading-relaxed">{cleanText(studyPlan)}</p>
                ) : (
                  <p className="text-xs text-slate-600 italic text-center py-4">Kliknij przycisk, aby stworzyć plan nauki oparty o badania nad pamięcią.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {view === 'account' && (
          <div className="space-y-8 pt-4">
            {!isLoggedIn ? (
              <div className="bg-slate-900 border border-slate-800 p-8 rounded-[40px] shadow-2xl border-t-2 border-t-emerald-500/30">
                <div className="flex flex-col items-center gap-6 mb-10 text-center">
                   <div className="w-24 h-24 rounded-3xl overflow-hidden border-2 border-emerald-500/20 shadow-xl"><img src={LOGO_URL} className="w-full h-full object-cover" alt="login" /></div>
                   <h2 className="text-2xl font-bold">Witaj w Mindlink</h2>
                   <p className="text-xs text-slate-500">Zsynchronizuj swój umysł z chmurą</p>
                </div>
                <form onSubmit={handleLogin} className="space-y-4">
                   <div className="relative"><Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} /><input type="email" placeholder="Twój e-mail" required className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-sm focus:ring-2 focus:ring-emerald-500/20" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                   <div className="relative"><Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} /><input type="password" placeholder="Hasło" required className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-sm focus:ring-2 focus:ring-emerald-500/20" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
                   <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-4 rounded-2xl shadow-xl active:scale-[0.98] transition-transform">WEJDŹ DO SYSTEMU</button>
                </form>
              </div>
            ) : (
              <div className="space-y-6">
                 <div className="bg-slate-900 border border-slate-800 p-8 rounded-[40px] flex flex-col items-center shadow-xl border-b-4 border-b-emerald-600/20">
                    <div className="w-20 h-20 rounded-full bg-emerald-600 flex items-center justify-center text-white mb-4 shadow-xl shadow-emerald-500/20"><User size={40} /></div>
                    <h3 className="text-xl font-bold">{email}</h3>
                    <p className="text-xs text-emerald-500 font-bold tracking-widest mt-2 uppercase">Poziom synchronizacji: 100%</p>
                 </div>
                 <button onClick={handleLogout} className="w-full bg-slate-900 border border-red-900/30 p-5 rounded-3xl flex items-center justify-between text-red-400 hover:bg-red-950/20 transition-colors"><div className="flex items-center gap-4"><LogOut size={20} /><span className="font-bold text-sm">Wyloguj się</span></div><ChevronRight size={16} /></button>
              </div>
            )}
          </div>
        )}
      </main>

      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-950/98 z-50 flex flex-col p-6 animate-in slide-in-from-bottom-full duration-300">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-emerald-50">Nowa Myśl</h2>
            <button onClick={() => { setIsAddModalOpen(false); setSelectedAttachment(null); }} className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center border border-slate-800"><X size={24} /></button>
          </div>
          <textarea autoFocus placeholder="O czym teraz myślisz?" className="flex-1 bg-transparent text-3xl font-light focus:outline-none resize-none placeholder:text-slate-800 leading-tight" value={inputValue} onChange={(e) => setInputValue(e.target.value)} />
          {selectedAttachment && (
            <div className="mb-8 p-5 bg-emerald-900/10 rounded-3xl border border-emerald-500/20 flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-4 text-emerald-100">{selectedAttachment.type === 'image' ? <ImageIcon size={24} /> : <FileText size={24} />}<span className="text-sm truncate max-w-[200px] font-medium">{selectedAttachment.name}</span></div>
              <button onClick={() => setSelectedAttachment(null)} className="text-red-400 p-2"><X size={20} /></button>
            </div>
          )}
          <div className="py-8 flex justify-between items-center border-t border-slate-900">
             <button onClick={() => fileInputRef.current?.click()} className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center text-emerald-500 border border-slate-800 hover:bg-emerald-500/10 transition-colors"><ImageIcon size={24} /></button>
             <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,application/pdf" />
             <button onClick={handleAddMemory} disabled={isProcessing || (!inputValue.trim() && !selectedAttachment)} className="bg-emerald-600 disabled:opacity-50 text-white px-10 py-4 rounded-3xl font-bold shadow-2xl active:scale-95 transition-all text-lg">
              {isProcessing ? <Loader2 className="animate-spin" /> : 'ZAKODUJ'}
             </button>
          </div>
        </div>
      )}

      {view === 'timeline' && !isAddModalOpen && (
        <button onClick={() => setIsAddModalOpen(true)} className="fixed bottom-28 right-6 w-18 h-18 bg-emerald-600 rounded-[2rem] flex items-center justify-center text-white shadow-[0_20px_50px_rgba(5,150,105,0.4)] active:scale-90 z-40 transition-transform">
          <Plus size={36} />
        </button>
      )}

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] h-24 bg-slate-950/90 backdrop-blur-2xl border-t border-emerald-900/20 flex justify-around items-center px-4 pb-4 z-40">
        <TabItem icon={<History />} label="Pamięć" active={view === 'timeline'} onClick={() => setView('timeline')} />
        <TabItem icon={<Network />} label="Graf" active={view === 'graph'} onClick={() => setView('graph')} />
        <div className="w-12 h-12"></div>
        <TabItem icon={<Cpu />} label="Bliźniak" active={view === 'chat'} onClick={() => setView('chat')} />
        <TabItem icon={<Sparkles />} label="Wnioski" active={view === 'insights'} onClick={() => setView('insights')} />
      </nav>
    </div>
  );
};

const TabItem: React.FC<{ icon: React.ReactNode, label: string, active: boolean, onClick: () => void }> = ({ icon, label, active, onClick }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1.5 transition-all ${active ? 'text-emerald-400 scale-110' : 'text-slate-500 hover:text-slate-400'}`}>
    <div className={`p-2.5 rounded-2xl ${active ? 'bg-emerald-500/10 shadow-lg shadow-emerald-500/10' : ''}`}>{React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { size: 22 }) : icon}</div>
    <span className="text-[9px] font-bold uppercase tracking-widest">{label}</span>
  </button>
);

export default App;
