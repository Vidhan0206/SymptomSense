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

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleReset = () => {
    setMessages([]);
    setAssessment(null);
    setInput("");
  };

  const handleChipClick = (text: string) => {
    setInput(text);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading || assessment) return;

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMessage: Message = { role: "user", content: input, timestamp };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("http://localhost:8000/interview/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: newMessages }),
      });

      const data = await response.json();

      const responseTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      if (data.is_assessment && data.assessment) {
        setAssessment(data.assessment);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Based on our conversation and medical literature, I've generated an assessment below.", timestamp: responseTimestamp }
        ]);
      } else if (data.question) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.question, timestamp: responseTimestamp }]);
      }
    } catch (error) {
      console.error("Failed to fetch:", error);
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I encountered a network error connecting to the server." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="app-container">
      <div className="header">
        <h1>SymptomSense</h1>
        <p>Adaptive AI Clinical Interview Assistant</p>
      </div>

      <div className="chat-container">
        <div className="chat-history">
          {messages.length === 0 ? (
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
            messages.map((msg, idx) => (
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

          {assessment && (
            <div className="assessment-card">
              <div className="assessment-header">
                <h2 className="assessment-title">Condition: {assessment.condition}</h2>
                <span className={`badge urgency-${assessment.urgency}`}>
                  Urgency: {assessment.urgency}
                </span>
              </div>
              
              <div className="assessment-section">
                <h3>Reasoning (Confidence: {assessment.confidence})</h3>
                <p>{assessment.reasoning}</p>
              </div>

              <div className="assessment-section">
                <h3>Recommended Next Steps</h3>
                <ul>
                  {assessment.next_steps.map((step, idx) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ul>
              </div>

              {assessment.sources && assessment.sources.length > 0 && (
                <div className="assessment-section" style={{ borderTop: '1px solid var(--card-border)', paddingTop: '1rem', marginTop: '1rem' }}>
                  <h3>Verified Medical Sources</h3>
                  <ul>
                    {assessment.sources.map((src, idx) => (
                      <li key={idx}>
                        <a href={src.url} target="_blank" rel="noopener noreferrer" className="source-link">
                          MedlinePlus: {src.condition}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              <button className="reset-button" onClick={handleReset}>
                ⟲ Start New Assessment
              </button>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        <div className="input-area">
          <form onSubmit={handleSubmit} className="input-form">
            <input
              type="text"
              className="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={assessment ? "Assessment complete. Please start a new session." : "Describe your symptoms..."}
              disabled={loading || assessment !== null}
            />
            <button 
              type="submit" 
              className="send-button"
              disabled={!input.trim() || loading || assessment !== null}
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
  );
}
