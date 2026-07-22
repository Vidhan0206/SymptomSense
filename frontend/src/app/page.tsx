"use client";

import { useState, useRef, useEffect } from "react";

type Message = {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: string;
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
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [userName, setUserName] = useState("Guest Patient");
  const [isEditingName, setIsEditingName] = useState(false);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatHistoryRef = useRef<HTMLDivElement>(null);

  // Load from LocalStorage on mount
  useEffect(() => {
    const savedName = localStorage.getItem("symptomsense_username");
    if (savedName) {
      setUserName(savedName);
    }

    const saved = localStorage.getItem("symptomsense_sessions");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSessions(parsed);
        if (parsed.length > 0) {
          setActiveSessionId(parsed[0].id);
        } else {
          createNewSession();
        }
      } catch (e) {
        console.error("Failed to parse sessions", e);
        createNewSession();
      }
    } else {
      createNewSession();
    }
  }, []);

  // Save to LocalStorage when sessions change
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem("symptomsense_sessions", JSON.stringify(sessions));
    } else if (sessions.length === 0 && activeSessionId === null) {
      // If we just deleted everything, don't overwrite with empty yet, let createNewSession handle it
    }
  }, [sessions]);

  // Save username to LocalStorage
  useEffect(() => {
    localStorage.setItem("symptomsense_username", userName);
  }, [userName]);

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

  const createNewSession = () => {
    const newId = Date.now().toString();
    const newSession: Session = {
      id: newId,
      title: "New Assessment",
      messages: [],
      assessment: null,
      createdAt: Date.now()
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newId);
    setInput("");
    setIsMobileMenuOpen(false); // Close menu on new chat
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

  const handleDeleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // prevent triggering active session switch
    const updated = sessions.filter(s => s.id !== id);
    setSessions(updated);

    if (updated.length === 0) {
      localStorage.removeItem("symptomsense_sessions");
      createNewSession();
    } else if (activeSessionId === id) {
      setActiveSessionId(updated[0].id);
    }
  };

  const handleChipClick = (text: string) => {
    setInput(text);
  };

  const updateActiveSession = (updates: Partial<Session>) => {
    setSessions(prev => prev.map(s =>
      s.id === activeSessionId ? { ...s, ...updates } : s
    ));
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
    const userMessage: Message = { role: "user", content: input, timestamp };

    const newMessages = [...currentMessages, userMessage];

    // Auto-generate title if this is the first message
    let newTitle = activeSession?.title;
    if (currentMessages.length === 0) {
      newTitle = input.length > 25 ? input.substring(0, 25) + "..." : input;
    }

    updateActiveSession({ messages: newMessages, title: newTitle });
    setInput("");
    setLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/interview/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: newMessages }),
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

  return (
    <div className="app-layout">
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
          <div className="user-profile">
            <div className="avatar user-avatar mini">👤</div>
            {isEditingName ? (
              <input
                type="text"
                className="name-edit-input"
                value={userName}
                onChange={e => setUserName(e.target.value)}
                onBlur={() => setIsEditingName(false)}
                onKeyDown={e => e.key === 'Enter' && setIsEditingName(false)}
                autoFocus
              />
            ) : (
              <>
                <span>{userName}</span>
                <button className="edit-name-btn" onClick={() => setIsEditingName(true)} title="Edit Name">✎</button>
              </>
            )}
          </div>
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
                  <span className="loading-text">Analyzing symptoms & medical literature...</span>
                </div>
              </div>
            </div>
          )}

          {currentAssessment && (
            <div className="assessment-card">
              <div className="assessment-header">
                <h2 className="assessment-title">Condition: {currentAssessment.condition}</h2>
                <span className={`badge urgency-${currentAssessment.urgency}`}>
                  Urgency: {currentAssessment.urgency}
                </span>
              </div>

              <div className="assessment-section">
                <h3>Reasoning (Confidence: {currentAssessment.confidence})</h3>
                <p>{currentAssessment.reasoning}</p>
              </div>

              <div className="assessment-section">
                <h3>Recommended Next Steps</h3>
                <ul>
                  {currentAssessment.next_steps.map((step, idx) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ul>
              </div>

              {currentAssessment.sources && currentAssessment.sources.length > 0 && (
                <div className="assessment-section" style={{ borderTop: '1px solid var(--card-border)', paddingTop: '1rem', marginTop: '1rem' }}>
                  <h3>Verified Medical Sources</h3>
                  <ul>
                    {currentAssessment.sources.map((src, idx) => (
                      <li key={idx}>
                        <a href={src.url} target="_blank" rel="noopener noreferrer" className="source-link">
                          MedlinePlus: {src.condition}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="assessment-actions" style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
                {currentAssessment.urgency === "emergency" ? (
                  <a href="tel:112" className="reset-button" style={{ flex: 2, margin: 0, background: 'rgba(220, 38, 38, 0.1)', borderColor: '#dc2626', color: '#b91c1c', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700' }}>
                    🚨 CALL AMBULANCE (112)
                  </a>
                ) : (
                  <a href={`https://www.google.com/maps/search/doctors+for+${encodeURIComponent(currentAssessment.condition)}+near+me`} target="_blank" rel="noopener noreferrer" className="reset-button" style={{ flex: 1.5, margin: 0, background: 'rgba(14, 165, 233, 0.1)', borderColor: '#0ea5e9', color: '#0284c7', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600' }}>
                    📍 Find Nearby Clinics
                  </a>
                )}
                <button className="reset-button" onClick={handlePrint} style={{ flex: 1, margin: 0, background: 'rgba(0, 0, 0, 0.02)' }}>
                  🖨️ Export Report
                </button>
                <button className="reset-button" onClick={handleReset} style={{ flex: 1, margin: 0 }}>
                  ⟲ Start New
                </button>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="input-wrapper">
          <div className="input-area">
            <form onSubmit={handleSubmit} className="input-form">
              <input
                type="text"
                className="chat-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={currentAssessment ? "Assessment complete. Please start a new session." : "Describe your symptoms..."}
                disabled={loading || currentAssessment !== null}
              />

              <button
                type="button"
                className={`mic-button ${isListening ? 'listening' : ''}`}
                onClick={startListening}
                disabled={loading || currentAssessment !== null}
                title="Speak your symptoms"
              >
                🎤
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
