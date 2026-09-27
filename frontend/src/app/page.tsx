"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import Auth from "../components/Auth";
import { User } from "@supabase/supabase-js";

type Message = {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: string;
  attachmentName?: string;
  attachmentText?: string;
};

type Assessment = {
  condition: string;
  confidence: "low" | "medium" | "high";
  urgency: "low" | "medium" | "high" | "emergency";
  reasoning: string;
  sources: Array<{ condition: string; url: string }>;
  next_steps: string[];
};

type Session = {
  id: string;
  title: string;
  messages: Message[];
  assessment: Assessment | null;
  createdAt: number;
};

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("Analyzing symptoms...");
  const [isListening, setIsListening] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatHistoryRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync theme with body class on mount
  useEffect(() => {
    setIsDark(document.body.classList.contains('dark'));
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.body.classList.remove('dark');
    } else {
      document.body.classList.add('dark');
    }
    setIsDark(!isDark);
  };

  // Check Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: any } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load from Supabase on mount/auth
  useEffect(() => {
    if (!user) return;
    
    const fetchSessions = async () => {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error("Failed to fetch sessions from Supabase", error);
        createNewSession();
        return;
      }
      
      if (data && data.length > 0) {
        // Map snake_case to camelCase
        const mappedSessions: Session[] = data.map(row => ({
          id: row.id,
          title: row.title,
          messages: row.messages,
          assessment: row.assessment,
          createdAt: new Date(row.created_at).getTime()
        }));
        setSessions(mappedSessions);
        setActiveSessionId(mappedSessions[0].id);
      } else {
        createNewSession();
      }
    };
    
    fetchSessions();
  }, [user?.id]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const currentMessages = activeSession?.messages || [];
  const currentAssessment = activeSession?.assessment || null;

  const scrollToBottom = () => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTo({
        top: chatHistoryRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentMessages, loading]);

  // Dynamic Loading Text Cycling
  useEffect(() => {
    if (!loading) return;
    
    const phrases = [
      "Extracting clinical data...",
      "Cross-referencing medical literature...",
      "Analyzing potential conditions...",
      "Evaluating clinical urgency...",
      "Synthesizing final assessment..."
    ];
    
    let index = 0;
    setLoadingText(phrases[0]); // Reset on start
    
    const interval = setInterval(() => {
      index = (index + 1) % phrases.length;
      setLoadingText(phrases[index]);
    }, 2500);
    
    return () => clearInterval(interval);
  }, [loading]);

  const createNewSession = async () => {
    const newId = crypto.randomUUID();
    const newSession: Session = {
      id: newId,
      title: "New Assessment",
      messages: [],
      assessment: null,
      createdAt: Date.now()
    };
    
    // Optimistic UI update
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newId);
    setInput("");
    setIsMobileMenuOpen(false); // Close menu on new chat

    if (user) {
      // Background insert to Supabase
      const { error } = await supabase.from('chat_sessions').insert([{
        id: newSession.id,
        user_id: user.id,
        title: newSession.title,
        messages: newSession.messages,
        assessment: newSession.assessment
      }]);
      if (error) {
        console.error("Error creating session in Supabase:", error);
        alert("Database Error (Insert): " + error.message);
      }
    }
  };

  const handleReset = () => {
    const emptySession = sessions.find(s => s.messages.length === 0);
    if (emptySession) {
      setActiveSessionId(emptySession.id);
      setInput("");
      return;
    }
    createNewSession();
  };

  const handleDeleteSession = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // prevent triggering active session switch
    const updated = sessions.filter(s => s.id !== id);
    setSessions(updated);

    if (updated.length === 0) {
      createNewSession();
    } else if (activeSessionId === id) {
      setActiveSessionId(updated[0].id);
    }
    
    if (user) {
      const { error } = await supabase.from('chat_sessions').delete().eq('id', id);
      if (error) console.error("Error deleting session from Supabase:", error);
    }
  };

  const handleChipClick = (text: string) => {
    setInput(text);
  };

  const updateActiveSession = async (updates: Partial<Session>) => {
    let updatedSession: Session | null = null;
    
    setSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        updatedSession = { ...s, ...updates };
        return updatedSession;
      }
      return s;
    }));

    if (user && updatedSession && activeSessionId) {
      const { error } = await supabase.from('chat_sessions').update({
        title: (updatedSession as Session).title,
        messages: (updatedSession as Session).messages,
        assessment: (updatedSession as Session).assessment
      }).eq('id', activeSessionId);
      
      if (error) {
        console.error("Error updating session in Supabase:", error);
        alert("Database Error (Update): " + error.message);
      }
    }
  };

  const startListening = () => {
    // @ts-ignore - SpeechRecognition is not strictly typed in all browsers
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join("");
      setInput(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading || currentAssessment) return;

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    // Auto-generate title if this is the first message
    let newTitle = activeSession?.title;
    if (currentMessages.length === 0) {
      newTitle = input.length > 25 ? input.substring(0, 25) + "..." : input || (selectedFile ? `File: ${selectedFile.name}` : "New Assessment");
    }

    // Keep track of the attached file, then clear the UI state
    const attachedFile = selectedFile;
    setSelectedFile(null);
    setLoading(true);

    let newMessages = [...currentMessages];

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      
      let finalMessageContent = input;
      let attachmentName = "";
      let attachmentText = "";

      // 1. If there is a file, upload it first to extract text
      if (attachedFile) {
        const formData = new FormData();
        formData.append("file", attachedFile);

        const uploadRes = await fetch(`${apiUrl}/upload`, {
          method: "POST",
          body: formData,
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          if (uploadData.text) {
            attachmentName = attachedFile.name;
            attachmentText = uploadData.text;
          }
        }
      }

      // Create the message for the UI (hiding the giant text wall)
      const userMessage: Message = { 
        role: "user", 
        content: input, 
        timestamp,
        attachmentName: attachmentName || undefined,
        attachmentText: attachmentText || undefined
      };
      
      newMessages = [...currentMessages, userMessage];

      // Update UI with the clean user message immediately
      updateActiveSession({ messages: newMessages, title: newTitle });
      setInput(""); // Clear the input box immediately

      // Format messages for the backend AI (injecting the hidden text)
      const apiMessages = newMessages.map(msg => ({
        role: msg.role,
        content: msg.attachmentText 
          ? `${msg.content}\n\n[Attached File: ${msg.attachmentName}]\n${msg.attachmentText}`
          : msg.content
      }));

      // 2. Send the conversation to the AI
      const response = await fetch(`${apiUrl}/interview/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: apiMessages }),
      });

      const data = await response.json();

      const responseTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      if (data.is_assessment && data.assessment) {
        updateActiveSession({
          assessment: data.assessment,
          messages: [
            ...newMessages,
            { role: "assistant", content: "Based on our conversation and medical literature, I've generated an assessment below.", timestamp: responseTimestamp }
          ]
        });
      } else if (data.question) {
        updateActiveSession({
          messages: [
            ...newMessages,
            { role: "assistant", content: data.question, timestamp: responseTimestamp }
          ]
        });
      } else {
        // Handle unexpected 500 errors from backend
        throw new Error(data.detail || "Invalid response from server");
      }
    } catch (error) {
      console.error("Failed to fetch:", error);
      updateActiveSession({
        messages: [
          ...newMessages,
          { role: "assistant", content: "Sorry, I encountered a network error connecting to the server.", timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <Auth />;
  }

  return (
    <div className="app-layout">
      {/* Background Elements to match Auth screen */}
      <div className="ambient-glow-chat"></div>
      <div className="ekg-background" style={{ opacity: 0.05 }}></div>

      {/* Mobile Header */}
      <div className="mobile-header">
        <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          ☰
        </button>
        <div className="logo">⚕️ SymptomSense</div>
        <button className="mobile-new-btn" onClick={() => { handleReset(); setIsMobileMenuOpen(false); }}>
          +
        </button>
      </div>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div className="mobile-overlay" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">⚕️ SymptomSense</div>
        </div>

        <div className="sidebar-content">
          <button className="new-chat-btn" onClick={handleReset}>
            <span className="plus-icon">+</span> New Assessment
          </button>

          <div className="history-section">
            <p className="section-title">Recent Activity</p>
            {sessions.filter(s => s.messages.length > 0).length === 0 ? (
              <div className="empty-history">No assessments yet</div>
            ) : (
              sessions.filter(s => s.messages.length > 0).map(session => (
                <div
                  key={session.id}
                  className={`history-item ${session.id === activeSessionId ? 'active' : ''}`}
                  onClick={() => { setActiveSessionId(session.id); setIsMobileMenuOpen(false); }}
                >
                  <span className="history-icon">{session.assessment ? '🩺' : '💬'}</span>
                  <span className="history-title">{session.title}</span>
                  <button
                    className="delete-session-btn"
                    onClick={(e) => handleDeleteSession(e, session.id)}
                    title="Delete Session"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="sidebar-footer">
          <div className="user-profile" style={{ flexGrow: 1 }}>
            <div className="avatar user-avatar mini">
              {user.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} alt="User Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
              ) : (
                '👤'
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'}
              </span>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Signed in</span>
            </div>
          </div>
          
          <button 
            onClick={toggleTheme} 
            title="Toggle Theme"
            style={{
              background: 'transparent', border: 'none',
              color: 'var(--text-muted)', width: '32px', height: '32px',
              cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem',
              transition: 'color 0.2s'
            }}
          >
            {isDark ? '☾' : '☀'}
          </button>

          <button 
            onClick={handleSignOut} 
            title="Sign Out"
            style={{
              background: 'transparent', border: 'none',
              color: '#ef4444', width: '32px', height: '32px',
              cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem',
              transition: 'color 0.2s'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <div className={`chat-history ${currentMessages.length === 0 ? 'empty' : ''}`} ref={chatHistoryRef}>
          {currentMessages.length === 0 ? (
            <div className="welcome-screen">
              <div className="welcome-icon">⚕️</div>
              <h2>Welcome to SymptomSense</h2>
              <p>Your AI-powered clinical assistant.</p>

              <div className="suggestion-chips">
                <button className="chip" onClick={() => handleChipClick("I have a severe headache and nausea.")}>🤕 Severe headache & nausea</button>
                <button className="chip" onClick={() => handleChipClick("My chest hurts and I'm short of breath.")}>🫀 Chest pain & shortness of breath</button>
                <button className="chip" onClick={() => handleChipClick("I've been feeling very thirsty and tired.")}>💧 Very thirsty & tired</button>
                <button className="chip" onClick={() => handleChipClick("I have a fever, cough, and body aches.")}>🤒 Fever & body aches</button>
              </div>
            </div>
          ) : (
            currentMessages.map((msg, idx) => (
              <div key={idx} className={`message-row ${msg.role}`}>
                <div className={`avatar ${msg.role === 'user' ? 'user-avatar' : 'ai-avatar'}`}>
                  {msg.role === 'user' ? '👤' : '🤖'}
                </div>
                <div className="message-bubble">
                  {msg.content}
                  {msg.attachmentName && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                      padding: '0.5rem 0.75rem', borderRadius: '0.5rem', marginTop: '0.75rem',
                      width: 'max-content', fontSize: '0.85rem'
                    }}>
                      <span>📄</span>
                      <span style={{ fontWeight: 600 }}>{msg.attachmentName}</span>
                    </div>
                  )}
                  {msg.timestamp && <span className="timestamp">{msg.timestamp}</span>}
                </div>
              </div>
            ))
          )}

          {loading && (
            <div className="message-row ai">
              <div className="avatar ai-avatar">🤖</div>
              <div className="message-bubble">
                <div className="loading-container">
                  <div className="loading-dots">
                    <div></div><div></div><div></div>
                  </div>
                  <span className="loading-text">{loadingText}</span>
                </div>
              </div>
            </div>
          )}

          {currentAssessment && (
            <div className="assessment-card premium-assessment">
              <div className="premium-assessment-header">
                <div className="pulse-icon">⚕️</div>
                <div className="header-text">
                  <span className="label">CLINICAL ASSESSMENT</span>
                  <h2 className="assessment-title">{currentAssessment.condition}</h2>
                </div>
                <span className={`premium-badge urgency-${currentAssessment.urgency}`}>
                  {currentAssessment.urgency.toUpperCase()} URGENCY
                </span>
              </div>

              <div className="premium-assessment-body">
                <div className="assessment-section">
                  <div className="section-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
                    Clinical Reasoning <span className={`confidence-tag ${currentAssessment.confidence || 'medium'}`}>{currentAssessment.confidence || 'medium'} confidence</span>
                  </div>
                  <p>{currentAssessment.reasoning || "No detailed reasoning provided by the AI."}</p>
                </div>

                <div className="assessment-section">
                  <div className="section-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5l7 7-7 7"></path></svg>
                    Recommended Next Steps
                  </div>
                  <ul className="premium-steps">
                    {Array.isArray(currentAssessment.next_steps) ? (
                      currentAssessment.next_steps.map((step, idx) => (
                        <li key={idx}><span>{idx + 1}</span> {step}</li>
                      ))
                    ) : (
                      <li><span>1</span> {String(currentAssessment.next_steps || "Consult a healthcare provider.")}</li>
                    )}
                  </ul>
                  
                  <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                    <button 
                      className="primary-action" 
                      onClick={() => window.open(`https://www.google.com/maps/search/doctors+near+me+for+${encodeURIComponent(currentAssessment.condition || 'general practice')}`, '_blank')}
                      style={{ 
                        background: 'var(--btn-primary)', color: 'white', border: 'none', 
                        padding: '0.75rem 1.5rem', borderRadius: '0.5rem', fontWeight: 600, 
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
                        boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)', transition: 'transform 0.2s'
                      }}
                    >
                      <span className="icon">🏥</span> Find Nearby Doctors
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="input-wrapper">
          <div className="input-area">
            {selectedFile && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                background: 'var(--card-bg)', border: '1px solid var(--text-highlight)',
                padding: '0.5rem 1rem', borderRadius: '0.5rem', marginBottom: '0.5rem',
                width: 'max-content', fontSize: '0.85rem', color: 'var(--text-main)',
                boxShadow: '0 2px 10px rgba(16,185,129,0.1)'
              }}>
                <span style={{ color: 'var(--text-highlight)' }}>📄</span>
                <span style={{ fontWeight: 600, maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {selectedFile.name}
                </span>
                <button 
                  onClick={() => setSelectedFile(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginLeft: '0.5rem' }}
                >
                  ✕
                </button>
              </div>
            )}
            <form onSubmit={handleSubmit} className="input-form">
              <input
                type="text"
                className="chat-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={currentAssessment ? "Assessment complete. Please start a new session." : "Describe your symptoms..."}
                disabled={loading || currentAssessment !== null}
              />

              <input 
                type="file" 
                accept=".pdf" 
                style={{ display: 'none' }} 
                ref={fileInputRef}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setSelectedFile(e.target.files[0]);
                  }
                }}
              />

              <button
                type="button"
                className="mic-button"
                title="Upload Lab Report (PDF)"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading || currentAssessment !== null}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                </svg>
              </button>

              <button
                type="button"
                className={`mic-button ${isListening ? 'listening' : ''}`}
                onClick={startListening}
                disabled={loading || currentAssessment !== null}
                title="Speak your symptoms"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                  <line x1="12" y1="19" x2="12" y2="23"></line>
                  <line x1="8" y1="23" x2="16" y2="23"></line>
                </svg>
              </button>

              <button
                type="submit"
                className="send-button"
                disabled={!input.trim() || loading || currentAssessment !== null}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            </form>
            <div className="disclaimer">
              SymptomSense is an AI tool for informational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
