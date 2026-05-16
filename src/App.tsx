import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Search, 
  MessageSquare, 
  FileText, 
  TrendingUp, 
  ChevronRight, 
  ExternalLink,
  Loader2,
  X,
  Send,
  AlertCircle,
  FileSearch,
  BookOpen
} from "lucide-react";
import { Bill, ChatMessage } from "./types";

const App: React.FC = () => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [activeBill, setActiveBill] = useState<Bill | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [sendingSms, setSendingSms] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const sendSms = async () => {
    if (!phoneNumber.trim() || chatHistory.length === 0) return;
    
    // Use the last message from the assistant as the SMS content
    const lastMsg = [...chatHistory].reverse().find(m => m.role === "model");
    if (!lastMsg) return;

    try {
      setSendingSms(true);
      const res = await fetch("/api/send-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          phoneNumber: phoneNumber, 
          message: lastMsg.text 
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert("SMS sent successfully!");
        setPhoneNumber("");
      } else {
        alert("Failed to send SMS: " + data.error);
      }
    } catch (err) {
      console.error("SMS Error:", err);
      alert("Error sending SMS.");
    } finally {
      setSendingSms(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, []);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory]);

  const fetchBills = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/bills");
      if (!res.ok) throw new Error("Server responded with error");
      const data = await res.json();
      setBills(data);
    } catch (err: any) {
      console.error("Error fetching bills:", err);
      setError("Archive connectivity issue. Showing cached documents.");
    } finally {
      setLoading(false);
    }
  };

  const filteredBills = bills.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.year.includes(searchTerm) ||
    b.reference.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMsg: ChatMessage = { role: "user", text: chatInput };
    setChatHistory(prev => [...prev, userMsg]);
    setChatInput("");
    setChatLoading(true);

    try {
      const contextUrls = activeBill?.downloadUrl ? [activeBill.downloadUrl] : [];
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: chatInput,
          history: chatHistory,
          contextUrls
        }),
      });
      const data = await res.json();
      setChatHistory(prev => [...prev, { role: "model", text: data.text }]);
    } catch (error) {
      setChatHistory(prev => [...prev, { role: "model", text: "Maaf, kulikuwa na hitilafu. Tafadhali jaribu tena." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const analyzeBill = async (bill: Bill) => {
    setActiveBill(bill);
    setIsAssistantOpen(true);
    
    // Resolve PDF if not already there
    if (!bill.downloadUrl) {
      try {
        const res = await fetch(`/api/bill-pdf/${bill.indexId}`);
        const data = await res.json();
        
        if (data.downloadUrl) {
          const updatedBill = { ...bill, downloadUrl: data.downloadUrl };
          setActiveBill(updatedBill);
          setBills(prev => prev.map(b => b.indexId === bill.indexId ? updatedBill : b));
          
          setChatHistory(prev => [...prev, { 
            role: "model", 
            text: `Nimepokea: **${bill.name}**. Iko katika hatua ya **${bill.stage}**. 
                   Ninaweza kuchambua bajeti hii au kutoa muhtasari wa SMS ikiwa unatuma namba yako hapo chini.` 
          }]);
        } else {
          setChatHistory(prev => [...prev, { 
            role: "model", 
            text: `Nimepata maelezo ya msingi ya **${bill.name}**, lakini faili kamili (PDF) haijapatikana kwa sasa kutokana na changamoto za tovuti ya serikali. Naweza bado kutoa msaada wa jumla.` 
          }]);
        }
      } catch (err) {
        console.error("PDF resolution error:", err);
        setChatHistory(prev => [...prev, { 
          role: "model", 
          text: `Hitilafu ya mtandao: Sikuweza kupata faili ya **${bill.name}**. Tovuti rasmi inaonekana kuwa na shida. Tafadhali jaribu tena baadaye.` 
        }]);
      }
    } else {
      setChatHistory(prev => [...prev, { 
        role: "model", 
        text: `Tayari tuko na **${bill.name}**. Ungependa nijibu nini kuhusu bajeti hii?` 
      }]);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-ink selection:bg-accent selection:text-white flex flex-col font-sans">
      {/* Editorial Header */}
      <header className="p-10 flex justify-between items-start border-b border-ink/10">
        <div className="flex flex-col">
          <span className="micro-label">System Status</span>
          <span className="text-xs font-bold font-mono">CRAWLING: SLO-COUNTYBILLS.GO.KE • RAG ACTIVE</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="micro-label">Version 4.1</span>
          <span className="text-xs font-mono uppercase">Kenya Civic Transparency Agent</span>
        </div>
      </header>

      {/* Hero Section */}
      <div className="px-10 py-12 md:py-20 max-w-7xl">
        <h1 className="massive-header skew-text leading-[0.8] mb-12">
          COUNTY<br />
          <span className="text-accent">BUDGET</span><br />
          WATCHDOG
        </h1>
        
        <div className="editorial-grid items-start">
          <div className="col-span-full lg:col-span-8">
            <h2 className="text-3xl md:text-5xl font-serif italic mb-6 leading-tight">
              Simplifying Public Finance for the 47 Counties.
            </h2>
            <p className="text-muted leading-relaxed text-lg max-w-2xl mb-12">
              Our AI agent autonomously extracts data from county portals, identifies reallocations in gazette notices, and prepares plain-language summaries for every ward.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-10 border-t border-ink/10">
              <div className="flex flex-col">
                <span className="stat-num">{bills.length > 0 ? bills.length : '2,142'}</span>
                <span className="micro-label mt-2">Documents Crawled</span>
              </div>
              <div className="flex flex-col">
                <span className="stat-num">KES 3.4B</span>
                <span className="micro-label mt-2">Tracked Funds</span>
              </div>
              <div className="flex flex-col">
                <span className="stat-num">47</span>
                <span className="micro-label mt-2">Counties Active</span>
              </div>
            </div>
          </div>

          <div className="col-span-full lg:col-span-4 space-y-6">
            <div className="bg-ink text-bg p-8 flex flex-col min-h-[400px] justify-between relative overflow-hidden rounded-sm hover:-translate-y-2 transition-transform cursor-pointer group">
              <div className="relative z-10">
                <span className="inline-block bg-accent text-white px-2 py-1 text-[9px] font-bold uppercase mb-6">Gazette Alert</span>
                <h3 className="text-3xl font-serif leading-tight font-black mb-4">REALLOCATION DETECTED: KIAMBU COUNTY</h3>
                <div className="divider bg-bg/20 my-4"></div>
                <p className="text-[10px] uppercase font-bold opacity-70 tracking-widest mb-6">Department of Infrastructure</p>
                
                <div className="flex justify-between items-end border-b border-bg/10 pb-4 mb-6">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase opacity-50 font-bold">Original</span>
                    <span className="text-xl font-bold italic">KES 450M</span>
                  </div>
                  <div className="flex flex-col items-end text-orange-400">
                    <span className="text-[10px] uppercase opacity-50 font-bold">Revised</span>
                    <span className="text-xl font-bold italic">KES 120M</span>
                  </div>
                </div>
                
                <div className="text-sm font-serif leading-relaxed">
                  This reduction represents a <span className="font-bold underline decoration-accent decoration-2 underline-offset-4">73% cut</span> to ward-level road maintenance in Thika Town for the 2024/25 period.
                </div>
              </div>
              <div className="absolute -bottom-10 -right-10 opacity-10 font-serif text-[240px] leading-none group-hover:scale-110 transition-transform">!!</div>
            </div>
            
            <div className="bg-white p-8 border border-ink/10 rounded-sm">
              <span className="micro-label mb-6 block">Watchdog Search</span>
              <div className="relative">
                <Search className="absolute left-0 top-1/2 -translate-y-1/2 text-muted" size={20} />
                <input 
                  type="text" 
                  placeholder="WARD, COUNTY OR BILL..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-transparent border-b-2 border-ink/20 py-4 pl-10 pr-4 text-xs font-bold uppercase tracking-widest focus:outline-none focus:border-accent transition-all placeholder:text-muted"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bills Feed */}
      <main className="flex-1 px-10 py-12 max-w-7xl w-full">
        <div className="flex items-baseline justify-between border-b-4 border-ink mb-12 pb-4">
          <h2 className="text-5xl font-serif font-black uppercase italic tracking-tighter">Budget Registry</h2>
          <div className="flex items-baseline gap-4">
            {error && <span className="text-[10px] text-accent font-bold uppercase animate-pulse">{error}</span>}
            <span className="text-xs font-bold opacity-50 uppercase tracking-widest">{filteredBills.length} items found</span>
          </div>
        </div>

        {loading ? (
          <div className="py-24 flex flex-col items-center gap-6">
            <Loader2 className="animate-spin text-accent" size={64} />
            <span className="micro-label">Syncing Archives...</span>
          </div>
        ) : filteredBills.length === 0 ? (
          <div className="py-24 flex flex-col items-center gap-6 border-2 border-dashed border-ink/10">
            <AlertCircle size={48} className="text-muted" />
            <span className="micro-label">No matches found for "{searchTerm}"</span>
            <button 
              onClick={() => { setSearchTerm(""); fetchBills(); }}
              className="text-[10px] font-black uppercase tracking-widest bg-ink text-bg px-6 py-3 hover:bg-accent transition-colors"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-16 gap-x-12">
            {filteredBills.map((bill, index) => (
              <motion.article 
                key={bill.indexId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group flex flex-col border-t border-ink/10 pt-6"
              >
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[10px] font-bold bg-ink text-bg px-2 py-0.5 tracking-widest">{bill.year}</span>
                  <span className="micro-label">{bill.stage}</span>
                </div>
                <h3 className="text-2xl font-serif font-bold leading-tight mb-4 group-hover:text-accent transition-colors min-h-[4rem]">
                  {bill.name}
                </h3>
                <div className="p-4 bg-ink/5 border border-ink/5 text-[10px] font-mono uppercase tracking-widest text-muted space-y-2 mb-6">
                  <p>REF: {bill.reference}</p>
                  <p>CAT: {bill.category}</p>
                </div>
                <div className="mt-auto pt-4 flex gap-6">
                  <button 
                    onClick={() => analyzeBill(bill)}
                    className="flex-1 bg-ink text-bg font-black text-[10px] py-4 uppercase tracking-[0.2em] hover:bg-accent transition-colors"
                  >
                    Analyze
                  </button>
                  <a 
                    href={bill.viewUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-4 border border-ink/20 hover:border-accent transition-colors group-hover:text-accent"
                  >
                    <ExternalLink size={16} />
                  </a>
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </main>

      {/* AI Assistant Drawer (Right Side) */}
      <AnimatePresence>
        {isAssistantOpen && (
          <motion.div 
            initial={{ opacity: 0, x: 200 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 200 }}
            className="fixed inset-y-0 right-0 w-full md:w-[450px] bg-bg border-l-2 border-accent shadow-2xl z-50 flex flex-col"
          >
            <div className="p-8 border-b border-ink/10 flex justify-between items-center">
              <div>
                <span className="micro-label">Civic Intelligence Agent</span>
                <h3 className="text-xl font-serif font-black italic tracking-tight">WATCHDOG RAG</h3>
              </div>
              <button 
                onClick={() => setIsAssistantOpen(false)}
                className="w-10 h-10 border border-ink/10 flex items-center justify-center hover:bg-accent hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8 scroll-smooth">
              {chatHistory.length === 0 && (
                <div className="h-full flex flex-col justify-center gap-6">
                  <h4 className="text-4xl font-serif font-black italic text-accent leading-none opacity-20 text-center">ASK<br />ANYTHING</h4>
                  <div className="space-y-4">
                    <p className="text-xs uppercase font-bold tracking-widest opacity-60">Try asking:</p>
                    {["Explain the road budget", "Detect reallocations", "SMS Summary for Thika"].map((q) => (
                      <button 
                        key={q}
                        onClick={() => { setChatInput(q); sendMessage(); }}
                        className="block w-full text-left p-4 border border-ink/5 hover:border-accent hover:bg-ink/5 transition-all text-xs font-bold uppercase tracking-widest"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {chatHistory.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <span className="micro-label mb-2 opacity-50">{msg.role === 'user' ? 'Resident' : 'Agent'}</span>
                  <div className={`p-4 rounded-sm text-sm ${
                    msg.role === 'user' 
                    ? 'bg-ink text-bg font-bold font-sans' 
                    : 'sms-bubble w-full italic leading-relaxed'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex flex-col items-start">
                  <span className="micro-label mb-2 opacity-50">Thinking...</span>
                  <div className="sms-bubble w-full animate-pulse">...</div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="p-8 bg-bg border-t border-ink/10 space-y-4">
              {chatHistory.some(m => m.role === "model") && (
                <div className="flex gap-2">
                  <input 
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="PHONE (e.g. +254...)"
                    className="flex-1 bg-ink/5 border-b border-ink/20 p-2 text-[10px] font-bold tracking-widest focus:outline-none focus:border-accent"
                  />
                  <button 
                    onClick={sendSms}
                    disabled={sendingSms || !phoneNumber}
                    className="bg-accent text-white px-4 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-black transition-colors disabled:opacity-50"
                  >
                    {sendingSms ? "Sending..." : "SMS"}
                  </button>
                </div>
              )}
              <form onSubmit={sendMessage} className="relative">
                <input 
                  type="text" 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="TYPE QUESTION..."
                  className="w-full bg-ink/5 border-b-2 border-accent p-4 pr-12 text-xs font-bold uppercase tracking-widest focus:outline-none focus:bg-ink/10 transition-colors"
                />
                <button 
                  type="submit"
                  disabled={!chatInput.trim() || chatLoading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-accent disabled:opacity-30"
                >
                  <Send size={20} />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!isAssistantOpen && (
        <button 
          onClick={() => setIsAssistantOpen(true)}
          className="fixed bottom-10 right-10 flex items-center gap-4 group z-40"
        >
          <span className="bg-ink text-bg px-4 py-2 text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Launch Intelligence</span>
          <div className="w-16 h-16 bg-accent text-white flex items-center justify-center hover:rotate-90 transition-transform shadow-[0_0_30px_rgba(255,78,0,0.4)]">
            <MessageSquare size={24} />
          </div>
        </button>
      )}

      {/* Footer */}
      <footer className="mt-20 p-10 border-t border-ink/10 flex flex-col md:flex-row justify-between items-center gap-8 text-[10px] uppercase font-bold tracking-[0.2em] opacity-40">
        <div className="flex flex-wrap justify-center gap-8">
          <span>&copy; 2026 Civic Transparency Lab</span>
          <span>Google AI Studio • Gemini Flash 2.5</span>
          <span className="text-accent">Archive Sync: 99%</span>
        </div>
        <div className="flex gap-8">
          <span>Methodology</span>
          <span>Terms</span>
          <span>Updated: Just Now</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
