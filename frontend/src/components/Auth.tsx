"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState('');
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false); // Default to Light Mode

  // Typing effect state
  const fullText = "Next-Gen AI Clinical Intelligence.";
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    setMounted(true);
    // Explicitly remove dark mode if it was applied elsewhere
    document.body.classList.remove('dark');

    // Typewriter effect
    let i = 0;
    const typingInterval = setInterval(() => {
      if (i < fullText.length) {
        setDisplayedText(fullText.slice(0, i + 1));
        i++;
      } else {
        clearInterval(typingInterval);
      }
    }, 50); // Speed of typing

    return () => clearInterval(typingInterval);
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.body.classList.remove('dark');
    } else {
      document.body.classList.add('dark');
    }
    setIsDark(!isDark);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage('Check your email for the login link!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error: any) {
      setMessage(error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ 
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) console.error("Error signing in with Google:", error.message);
  };

  if (!mounted) return null;

  return (
    <div className="landing-container">
      <style>{`
        .landing-container {
          display: flex;
          height: 100vh;
          width: 100vw;
          background: var(--bg-main);
          color: var(--text-main);
          font-family: 'Plus Jakarta Sans', sans-serif;
          overflow-y: auto;
          overflow-x: hidden;
          position: relative;
        }

        /* Ambient Emerald Glow */
        .ambient-glow {
          position: fixed;
          left: 10%;
          top: 20%;
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, transparent 60%);
          pointer-events: none;
          z-index: 0;
        }

        /* Animated EKG Background */
        .ekg-background {
          position: fixed;
          top: 0;
          left: 0;
          width: 200%;
          height: 100%;
          opacity: 0.15;
          z-index: 0;
          pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1000 200'%3E%3Cpath d='M0 100 h200 l20 -20 l20 60 l40 -120 l30 160 l20 -80 l20 0 h650' fill='none' stroke='%2310b981' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: repeat-x;
          background-size: 1000px 200px;
          background-position: center;
          animation: slide-ekg 8s linear infinite;
        }

        @keyframes slide-ekg {
          from { transform: translateX(0); }
          to { transform: translateX(-1000px); }
        }

        .landing-left {
          flex: 1.1;
          padding: 6rem 5rem;
          display: flex;
          flex-direction: column;
          justify-content: center;
          position: relative;
          z-index: 1;
        }

        .landing-right {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          position: relative;
          z-index: 1;
        }

        .hero-logo {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 2rem;
        }

        .hero-title {
          font-size: clamp(2.5rem, 4vw, 3.5rem); 
          font-weight: 800;
          line-height: 1.2;
          letter-spacing: -0.02em;
          color: var(--text-main);
          margin-bottom: 1.5rem;
          display: block;
        }

        .hero-cursor {
          display: inline-block;
          width: 3px;
          height: 0.9em;
          background-color: var(--text-highlight);
          vertical-align: baseline;
          margin-left: 4px;
          animation: blink-caret 0.75s step-end infinite;
        }

        @keyframes blink-caret {
          from, to { opacity: 0; }
          50% { opacity: 1; }
        }

        .hero-subtitle {
          font-size: 1.15rem;
          color: var(--text-muted);
          max-width: 500px;
          line-height: 1.6;
          margin-bottom: 2.5rem;
          font-weight: 500;
        }

        .feature-list {
          display: flex;
          flex-direction: column;
          gap: 1.75rem;
        }

        .feature-item {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          font-size: 1rem;
          font-weight: 600;
          color: var(--text-main);
        }

        .feature-icon {
          background: var(--icon-bg);
          color: var(--text-highlight);
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.05);
        }

        .auth-card {
          background: var(--card-bg);
          padding: 3.5rem 3rem;
          border-radius: 24px;
          border: 1px solid var(--card-border);
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
          width: 100%;
          max-width: 460px;
        }

        .auth-input {
          width: 100%;
          padding: 1rem 1.25rem;
          border-radius: 8px;
          border: 1px solid transparent;
          background: var(--input-bg);
          color: var(--text-main);
          font-size: 0.95rem;
          font-weight: 500;
          outline: none;
          transition: all 0.2s ease;
          font-family: inherit;
        }

        .auth-input:focus {
          border-color: var(--text-highlight);
        }

        .auth-btn {
          width: 100%;
          padding: 1.1rem;
          border-radius: 8px;
          border: none;
          background: var(--btn-primary);
          color: var(--btn-primary-text);
          font-weight: 700;
          font-size: 1rem;
          cursor: pointer;
          transition: opacity 0.2s ease;
          margin-top: 0.5rem;
        }

        .auth-btn:hover {
          opacity: 0.9;
        }

        .google-btn {
          width: 100%;
          padding: 1.1rem;
          border-radius: 8px;
          border: 1px solid var(--btn-google-border);
          background: var(--btn-google-bg);
          color: var(--text-main);
          font-weight: 700;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 12px;
        }

        .google-btn:hover {
          opacity: 0.8;
        }

        .theme-toggle {
          position: absolute;
          bottom: 2rem;
          left: 2rem;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: var(--card-bg);
          color: var(--text-highlight);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          border: 1px solid var(--card-border);
          z-index: 100;
          font-weight: 700;
          font-size: 1.2rem;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        @keyframes mobileSlideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 968px) {
          .landing-container { flex-direction: column; overflow-y: auto; }
          .landing-left { padding: 4rem 2rem; flex: none; text-align: center; align-items: center; }
          .hero-subtitle { text-align: center; }
          .landing-right { padding: 2rem; align-items: center; justify-content: center; width: 100%; }
          .theme-toggle { position: absolute; top: 1.5rem; right: 1.5rem; bottom: auto; left: auto; margin: 0; }
          .hero-title { min-height: 80px; }
          .auth-card {
            animation: mobileSlideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            width: 100%;
          }
        }
      `}</style>

      <div className="ambient-glow"></div>
      <div className="ekg-background"></div>

      <div className="theme-toggle" onClick={toggleTheme} title="Toggle Theme">
        {isDark ? '☾' : '☀'}
      </div>

      {/* Left Column: Hero Section */}
      <div className="landing-left">
        <div className="hero-logo">
          <span style={{ fontSize: '2.5rem' }}>⚕️</span>
          <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.5px' }}>
            SymptomSense
          </span>
        </div>
        <h1 className="hero-title">
          {displayedText}
          <span className="hero-cursor"></span>
        </h1>
        <p className="hero-subtitle">
          Get instant, personalized medical insights. Upload your lab reports, chat with our AI diagnostician, and securely track your health journey in one place.
        </p>

        <div className="feature-list">
          <div className="feature-item">
            <div className="feature-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
            </div>
            <span>Personalized Health Assessments</span>
          </div>
          <div className="feature-item">
            <div className="feature-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            </div>
            <span>100% Private & Secure Records</span>
          </div>
          <div className="feature-item">
            <div className="feature-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
            </div>
            <span>Lightning-Fast Medical Insights</span>
          </div>
        </div>
      </div>

      {/* Right Column: Auth Card */}
      <div className="landing-right">
        <div className="auth-card">
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              {isSignUp ? 'Join SymptomSense' : 'Welcome Back'}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
              {isSignUp ? 'Create your account' : 'Sign in to access your dashboard'}
            </p>
          </div>

          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.5rem' }}>Email Address</label>
              <input
                type="email"
                placeholder="name@example.com"
                value={email}
                required
                onChange={(e) => setEmail(e.target.value)}
                className="auth-input"
              />
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.5rem' }}>Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                required
                onChange={(e) => setPassword(e.target.value)}
                className="auth-input"
              />
            </div>

            <button type="submit" disabled={loading} className="auth-btn">
              {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In')}
            </button>
          </form>

          <div style={{ margin: '2rem 0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--card-border)' }}></div>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>OR</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--card-border)' }}></div>
          </div>

          <button onClick={handleGoogleAuth} className="google-btn">
            <img src="https://www.google.com/favicon.ico" alt="Google" style={{ width: '18px' }} />
            Continue with Google
          </button>

          {message && (
            <div style={{ 
              marginTop: '1.5rem', padding: '1rem', borderRadius: '8px', 
              background: 'rgba(16, 185, 129, 0.1)', color: 'var(--text-highlight)', 
              fontSize: '0.875rem', textAlign: 'center'
            }}>
              {message}
            </div>
          )}

          <div style={{ marginTop: '2.5rem', textAlign: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              {isSignUp ? "Already have an account? " : "Don't have an account? "}
            </span>
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              style={{
                background: 'none', border: 'none', color: 'var(--text-highlight)',
                fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600
              }}
            >
              {isSignUp ? "Sign In" : "Sign Up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
