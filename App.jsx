import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  getLiturgicalSeason, LITURGICAL_COLORS,
  MONTHS_FR, DAYS_FR, isSameDay, addDays, getEaster
} from './liturgicalCalendar.js';

// ─── System Prompt ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Tu es un conseiller catholique expert, profondément ancré dans la Tradition de l'Église catholique romaine. Tu réponds UNIQUEMENT à partir des sources suivantes :

1. La Sainte Écriture – La Bible dans la tradition catholique (Vulgate et traductions approuvées)
2. Le Catéchisme de l'Église Catholique (CEC) – y compris le Catéchisme du Concile de Trente
3. Les dogmes définis par les Conciles œcuméniques (Nicée, Éphèse, Chalcédoine, Trente, Vatican I et II)
4. Le Magistère – Encycliques, Constitutions apostoliques, Exhortations apostoliques
5. Les Pères et Docteurs de l'Église – saint Augustin d'Hippone, saint Thomas d'Aquin (Somme Théologique), saint Jean Chrysostome, saint Jérôme, saint Ambroise, saint Grégoire le Grand, saint Basile, saint Athanase, saint Bonaventure, sainte Thérèse d'Avila, saint Jean de la Croix, etc.
6. La théologie scolastique et la philosophie aristotélico-thomiste
7. La liturgie, le droit canonique, et le calendrier liturgique romain

**Règles absolues :**
- Tu ne cites jamais de sources protestantes, hétérodoxes ou contraires au Magistère
- Tu n'inventes jamais de citations — si tu cites, sois précis (ex : CEC §1324, ST I, q.2, a.3, Augustin, Confessions I,1)
- Pour les lectures liturgiques, utilise l'exégèse catholique traditionnelle selon les quatre sens : littéral, allégorique, moral, anagogique
- Tu rappelles avec bienveillance les sources de tes réponses
- Réponds en français, avec un ton respectueux, érudit mais accessible, pastoral et bienveillant
- Aide la personne à croître dans la foi, l'espérance et la charité
- Si on te demande d'interpréter une lecture liturgique, donne d'abord le sens littéral, puis le sens christologique/allégorique, puis l'application morale pour le chrétien d'aujourd'hui

Tu es doux, patient, savant et profondément catholique. Termine parfois tes réponses par une courte phrase latine ou une prière appropriée.`;

// ─── Storage helpers ──────────────────────────────────────────────────────────
const STORAGE_KEY = 'lumiere_conversations';

function loadConversations() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch { return []; }
}

function saveConversations(convs) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(convs)); } catch {}
}

function createNewConversation() {
  return {
    id: Date.now().toString(),
    title: 'Nouvelle conversation',
    createdAt: new Date().toISOString(),
    messages: [],
  };
}

// ─── Components ───────────────────────────────────────────────────────────────

function Cross({ style }) {
  return <span style={{ fontFamily: 'serif', ...style }}>✝</span>;
}

function Divider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0' }}>
      <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, var(--gold-dark))' }} />
      <span style={{ color: 'var(--gold)', fontSize: 10 }}>✦</span>
      <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, var(--gold-dark), transparent)' }} />
    </div>
  );
}

// ─── Calendar Panel ───────────────────────────────────────────────────────────
function CalendarPanel({ today }) {
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const todaySeason = getLiturgicalSeason(today);
  const todayColor = LITURGICAL_COLORS[todaySeason.color] || LITURGICAL_COLORS.vert;

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '16px 12px', gap: 12 }}>
      {/* Today's feast */}
      <div style={{
        background: 'linear-gradient(135deg, var(--burgundy), var(--burgundy-mid))',
        border: `1px solid var(--gold-dark)`,
        borderLeft: `4px solid ${todayColor.hex}`,
        borderRadius: 2,
        padding: '10px 12px',
      }}>
        <div style={{ fontFamily: 'Cinzel', fontSize: 9, letterSpacing: 2, color: 'var(--gold-light)', textTransform: 'uppercase', marginBottom: 4 }}>
          Aujourd'hui
        </div>
        <div style={{ fontFamily: 'EB Garamond', fontSize: 13, color: 'var(--parchment)', fontWeight: 500, lineHeight: 1.4 }}>
          {todaySeason.name}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: todayColor.hex, border: '1px solid rgba(255,255,255,0.3)' }} />
          <span style={{ fontFamily: 'Cinzel', fontSize: 9, color: 'var(--gold-light)', letterSpacing: 1 }}>
            {todaySeason.season} — {todayColor.label}
          </span>
        </div>
        {todaySeason.rank && (
          <div style={{ marginTop: 4, fontFamily: 'EB Garamond', fontSize: 11, fontStyle: 'italic', color: 'var(--gold)' }}>
            {todaySeason.rank}
          </div>
        )}
      </div>

      {/* Meaning of color */}
      <div style={{ fontFamily: 'EB Garamond', fontSize: 12, color: 'var(--gold-light)', fontStyle: 'italic', textAlign: 'center', lineHeight: 1.5 }}>
        {todayColor.meaning}
      </div>

      <Divider />

      {/* Month navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={prevMonth} style={navBtnStyle}>‹</button>
        <div style={{ fontFamily: 'Cinzel', fontSize: 11, color: 'var(--gold)', letterSpacing: 1, textAlign: 'center' }}>
          {MONTHS_FR[month]}<br />
          <span style={{ fontSize: 9, color: 'var(--gold-dim)' }}>{year}</span>
        </div>
        <button onClick={nextMonth} style={navBtnStyle}>›</button>
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {DAYS_FR.map(d => (
          <div key={d} style={{ fontFamily: 'Cinzel', fontSize: 8, color: 'var(--gold-dim)', textAlign: 'center', letterSpacing: 1 }}>
            {d}
          </div>
        ))}
        {cells.map((date, i) => {
          if (!date) return <div key={`e${i}`} />;
          const season = getLiturgicalSeason(date);
          const color = LITURGICAL_COLORS[season.color] || LITURGICAL_COLORS.vert;
          const isToday = isSameDay(date, today);
          const isSunday = date.getDay() === 0;
          return (
            <div
              key={i}
              title={season.name}
              style={{
                aspectRatio: '1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 2,
                fontSize: 10,
                fontFamily: isSunday ? 'Cinzel' : 'EB Garamond',
                fontWeight: isSunday ? 600 : 400,
                color: isToday ? '#fff' : isSunday ? color.hex : 'var(--parchment)',
                background: isToday ? color.hex : isSunday ? `${color.hex}22` : 'transparent',
                border: isToday ? `1px solid ${color.hex}` : '1px solid transparent',
                cursor: 'default',
                transition: 'all 0.15s',
              }}
            >
              {date.getDate()}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <Divider />
      <div style={{ fontFamily: 'Cinzel', fontSize: 8, color: 'var(--gold-dim)', letterSpacing: 1, textAlign: 'center', marginBottom: 4 }}>
        COULEURS LITURGIQUES
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {Object.entries(LITURGICAL_COLORS).map(([key, { hex, label, meaning }]) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: hex, flexShrink: 0, border: '1px solid rgba(255,255,255,0.2)' }} />
            <span style={{ fontFamily: 'Cinzel', fontSize: 8, color: 'var(--gold-light)', letterSpacing: 0.5 }}>{label}</span>
            <span style={{ fontFamily: 'EB Garamond', fontSize: 9, color: 'var(--gold-dim)', fontStyle: 'italic' }}>— {meaning}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const navBtnStyle = {
  background: 'transparent',
  border: '1px solid var(--gold-dark)',
  color: 'var(--gold)',
  width: 24,
  height: 24,
  borderRadius: 2,
  cursor: 'pointer',
  fontSize: 16,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'Cinzel',
  lineHeight: 1,
};

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ conversations, activeId, onSelect, onNew, onDelete, sidebarOpen }) {
  return (
    <div style={{
      width: sidebarOpen ? 220 : 0,
      minWidth: sidebarOpen ? 220 : 0,
      overflow: 'hidden',
      transition: 'all 0.3s ease',
      borderRight: '1px solid var(--gold-dark)',
      background: 'linear-gradient(180deg, rgba(58,6,20,0.95), rgba(40,0,10,0.98))',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    }}>
      <div style={{ padding: '14px 12px', borderBottom: '1px solid var(--gold-dark)' }}>
        <button onClick={onNew} style={{
          width: '100%',
          background: 'linear-gradient(135deg, var(--burgundy), var(--burgundy-mid))',
          border: '1px solid var(--gold-dark)',
          color: 'var(--gold-light)',
          padding: '8px 10px',
          borderRadius: 2,
          cursor: 'pointer',
          fontFamily: 'Cinzel',
          fontSize: 10,
          letterSpacing: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          transition: 'all 0.2s',
        }}>
          ✝ Nouvelle conversation
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 6px' }}>
        <div style={{ fontFamily: 'Cinzel', fontSize: 8, color: 'var(--gold-dim)', letterSpacing: 2, textTransform: 'uppercase', padding: '6px 6px 4px', marginBottom: 4 }}>
          Historique
        </div>
        {conversations.length === 0 && (
          <div style={{ fontFamily: 'EB Garamond', fontSize: 11, color: 'var(--gold-dim)', fontStyle: 'italic', padding: '8px 6px', lineHeight: 1.5 }}>
            Aucune conversation sauvegardée
          </div>
        )}
        {conversations.map(conv => (
          <div
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            style={{
              padding: '8px 8px',
              borderRadius: 2,
              cursor: 'pointer',
              background: conv.id === activeId ? 'rgba(201,168,76,0.12)' : 'transparent',
              border: conv.id === activeId ? '1px solid var(--gold-dark)' : '1px solid transparent',
              marginBottom: 3,
              position: 'relative',
              transition: 'all 0.15s',
            }}
          >
            <div style={{ fontFamily: 'EB Garamond', fontSize: 12, color: 'var(--parchment)', lineHeight: 1.3, paddingRight: 18 }}>
              {conv.title}
            </div>
            <div style={{ fontFamily: 'Cinzel', fontSize: 8, color: 'var(--gold-dim)', marginTop: 2, letterSpacing: 0.5 }}>
              {new Date(conv.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
            </div>
            <button
              onClick={e => { e.stopPropagation(); onDelete(conv.id); }}
              style={{
                position: 'absolute', top: 6, right: 6,
                background: 'transparent', border: 'none',
                color: 'var(--gold-dim)', cursor: 'pointer',
                fontSize: 12, lineHeight: 1, padding: 2,
                opacity: 0.6,
              }}
              title="Supprimer"
            >×</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────
function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  const parts = msg.content.split(/\n\n+/).filter(Boolean);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: isUser ? 'flex-end' : 'flex-start',
      animation: 'fadeIn 0.35s ease',
    }}>
      <div style={{
        fontFamily: 'Cinzel',
        fontSize: 9,
        letterSpacing: 2,
        color: 'var(--gold-dark)',
        marginBottom: 5,
        textTransform: 'uppercase',
      }}>
        {isUser ? '✦ Votre question' : '✦ Conseiller'}
      </div>
      <div style={{
        maxWidth: '82%',
        padding: '14px 18px',
        background: isUser
          ? 'linear-gradient(135deg, var(--burgundy), var(--burgundy-mid))'
          : 'var(--cream)',
        border: `1px solid ${isUser ? 'var(--gold-dark)' : 'var(--gold-light)'}`,
        borderRadius: 2,
        color: isUser ? 'var(--parchment)' : 'var(--ink)',
        boxShadow: '3px 3px 12px rgba(0,0,0,0.15)',
        fontSize: 16,
        lineHeight: 1.75,
        fontFamily: 'EB Garamond',
        position: 'relative',
      }}>
        {!isUser && (
          <span style={{
            position: 'absolute', top: -9, left: 14,
            fontSize: 10, color: 'var(--gold)',
            background: 'var(--cream)', padding: '0 4px',
          }}>✟</span>
        )}
        {parts.map((p, i) => (
          <p key={i} style={{ marginBottom: i < parts.length - 1 ? 10 : 0 }}
            dangerouslySetInnerHTML={{
              __html: p
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/\n/g, '<br />')
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Typing Indicator ─────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', animation: 'fadeIn 0.3s ease' }}>
      <div style={{ fontFamily: 'Cinzel', fontSize: 9, letterSpacing: 2, color: 'var(--gold-dark)', marginBottom: 5 }}>
        ✦ Conseiller
      </div>
      <div style={{
        padding: '14px 20px',
        background: 'var(--cream)',
        border: '1px solid var(--gold-light)',
        borderRadius: 2,
        display: 'flex',
        gap: 6,
        alignItems: 'center',
      }}>
        {[0, 0.2, 0.4].map((delay, i) => (
          <div key={i} style={{
            width: 7, height: 7,
            background: 'var(--gold-dark)',
            borderRadius: '50%',
            animation: `bounce 1.2s ${delay}s infinite`,
          }} />
        ))}
      </div>
    </div>
  );
}

// ─── Quick Prompts ────────────────────────────────────────────────────────────
const QUICK_PROMPTS = [
  { label: 'La Trinité', prompt: "Explique-moi le dogme de la Trinité selon les Pères de l'Église" },
  { label: "Lectures du dimanche", prompt: "Interprète pour moi les lectures de ce dimanche selon la tradition catholique et les quatre sens de l'Écriture" },
  { label: "Thomas d'Aquin", prompt: "Qu'enseigne saint Thomas d'Aquin sur la grâce divine et le salut ?" },
  { label: "L'Eucharistie", prompt: "Explique le sacrement de l'Eucharistie et la doctrine de la présence réelle du Christ" },
  { label: "Le Magistère", prompt: "Qu'est-ce que le Magistère de l'Église et pourquoi le chrétien doit-il lui obéir ?" },
  { label: "Saint Augustin", prompt: "Comment saint Augustin parle-t-il de la grâce et du libre arbitre dans ses œuvres ?" },
  { label: "La prière", prompt: "Comment progresser dans la vie de prière selon la tradition catholique ?" },
  { label: "Marie", prompt: "Quels sont les dogmes mariaux de l'Église catholique et comment les comprendre ?" },
];

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const today = new Date();
  const [conversations, setConversations] = useState(loadConversations);
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [calendarOpen, setCalendarOpen] = useState(true);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('lumiere_api_key') || '');
  const [showApiModal, setShowApiModal] = useState(false);
  const [tempKey, setTempKey] = useState('');
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const activeConv = conversations.find(c => c.id === activeId) || null;

  useEffect(() => {
    saveConversations(conversations);
  }, [conversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConv?.messages, loading]);

  // Check API key on mount
  useEffect(() => {
    if (!apiKey) setShowApiModal(true);
  }, []);

  const newConversation = useCallback(() => {
    const conv = createNewConversation();
    setConversations(prev => [conv, ...prev]);
    setActiveId(conv.id);
  }, []);

  useEffect(() => {
    if (conversations.length === 0) {
      newConversation();
    } else if (!activeId) {
      setActiveId(conversations[0].id);
    }
  }, []);

  const deleteConversation = useCallback((id) => {
    setConversations(prev => prev.filter(c => c.id !== id));
    setActiveId(prev => {
      if (prev === id) {
        const remaining = conversations.filter(c => c.id !== id);
        return remaining[0]?.id || null;
      }
      return prev;
    });
  }, [conversations]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading || !activeId) return;
    if (!apiKey) { setShowApiModal(true); return; }

    setInput('');
    if (textareaRef.current) { textareaRef.current.style.height = 'auto'; }
    setLoading(true);

    const userMsg = { role: 'user', content: text };

    setConversations(prev => prev.map(c => {
      if (c.id !== activeId) return c;
      const messages = [...c.messages, userMsg];
      const title = c.messages.length === 0
        ? text.slice(0, 45) + (text.length > 45 ? '…' : '')
        : c.title;
      return { ...c, messages, title };
    }));

    try {
      const conv = conversations.find(c => c.id === activeId);
      const history = [...(conv?.messages || []), userMsg];

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-opus-4-6',
          max_tokens: 1200,
          system: SYSTEM_PROMPT,
          messages: history,
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error.message);

      const aiContent = data.content?.[0]?.text || "Une erreur s'est produite.";
      const aiMsg = { role: 'assistant', content: aiContent };

      setConversations(prev => prev.map(c => {
        if (c.id !== activeId) return c;
        return { ...c, messages: [...c.messages, aiMsg] };
      }));
    } catch (err) {
      const errMsg = {
        role: 'assistant',
        content: `*Une erreur s'est produite :* ${err.message}\n\nVérifiez votre clé API dans les paramètres.`,
      };
      setConversations(prev => prev.map(c => {
        if (c.id !== activeId) return c;
        return { ...c, messages: [...c.messages, errMsg] };
      }));
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  }, [input, loading, activeId, apiKey, conversations]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleQuick = (prompt) => {
    setInput(prompt);
    textareaRef.current?.focus();
  };

  const saveApiKey = () => {
    localStorage.setItem('lumiere_api_key', tempKey);
    setApiKey(tempKey);
    setShowApiModal(false);
    setTempKey('');
  };

  const todaySeason = getLiturgicalSeason(today);
  const seasonColor = LITURGICAL_COLORS[todaySeason.color]?.hex || '#2D5A27';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>

      {/* ── API Key Modal ── */}
      {showApiModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(20,0,8,0.92)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20,
        }}>
          <div style={{
            background: 'var(--parchment)',
            border: '2px solid var(--gold)',
            borderRadius: 4,
            padding: '32px 28px',
            maxWidth: 460,
            width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 32, marginBottom: 10, color: 'var(--gold)', animation: 'pulse-glow 2s infinite' }}>✝</div>
            <h2 style={{ fontFamily: 'Cinzel Decorative', fontSize: 18, color: 'var(--burgundy)', marginBottom: 8 }}>
              Lumière de la Foi
            </h2>
            <p style={{ fontFamily: 'EB Garamond', fontSize: 15, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6 }}>
              Pour utiliser cette application, vous avez besoin d'une <strong>clé API Anthropic</strong>.
              Obtenez-la gratuitement sur <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" style={{ color: 'var(--burgundy)' }}>console.anthropic.com</a>.
            </p>
            <input
              type="password"
              placeholder="sk-ant-..."
              value={tempKey}
              onChange={e => setTempKey(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveApiKey()}
              style={{
                width: '100%', padding: '10px 14px',
                fontFamily: 'EB Garamond', fontSize: 14,
                border: '1px solid var(--gold-dark)',
                borderRadius: 2, background: 'var(--cream)',
                color: 'var(--ink)', marginBottom: 12,
                outline: 'none',
              }}
            />
            <button
              onClick={saveApiKey}
              disabled={!tempKey}
              style={{
                width: '100%', padding: '10px',
                background: tempKey ? 'var(--burgundy)' : '#ccc',
                color: 'var(--gold-light)',
                border: '1px solid var(--gold-dark)',
                borderRadius: 2, cursor: tempKey ? 'pointer' : 'not-allowed',
                fontFamily: 'Cinzel', fontSize: 11, letterSpacing: 2,
              }}
            >
              COMMENCER — AD MAIOREM DEI GLORIAM
            </button>
            <p style={{ fontFamily: 'EB Garamond', fontSize: 11, color: 'var(--text-muted)', marginTop: 12, fontStyle: 'italic' }}>
              Votre clé est stockée localement dans votre navigateur et n'est jamais envoyée ailleurs.
            </p>
          </div>
        </div>
      )}

      {/* ── Top Bar ── */}
      <div style={{
        background: 'linear-gradient(90deg, var(--burgundy-dark), var(--burgundy), var(--burgundy-dark))',
        borderBottom: '2px solid var(--gold-dark)',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexShrink: 0,
        boxShadow: '0 2px 20px rgba(0,0,0,0.5)',
      }}>
        <button onClick={() => setSidebarOpen(s => !s)} style={{ ...navBtnStyle, flexShrink: 0 }}>☰</button>

        <div style={{ fontFamily: 'Cinzel Decorative', fontSize: 16, color: 'var(--gold)', animation: 'pulse-glow 3s infinite', letterSpacing: 1 }}>
          ✝ Lumière de la Foi
        </div>

        <div style={{ flex: 1 }} />

        <div style={{
          fontFamily: 'Cinzel', fontSize: 9, letterSpacing: 1,
          color: 'var(--gold-light)',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: seasonColor }} />
          {todaySeason.name}
        </div>

        <button
          onClick={() => { setTempKey(apiKey); setShowApiModal(true); }}
          style={{ ...navBtnStyle, fontSize: 12, width: 'auto', padding: '0 8px', gap: 4 }}
          title="Paramètres API"
        >
          ⚙
        </button>

        <button onClick={() => setCalendarOpen(s => !s)} style={{ ...navBtnStyle, fontSize: 11 }} title="Calendrier liturgique">
          📅
        </button>
      </div>

      {/* ── Main Layout ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Sidebar */}
        <Sidebar
          conversations={conversations}
          activeId={activeId}
          onSelect={setActiveId}
          onNew={newConversation}
          onDelete={deleteConversation}
          sidebarOpen={sidebarOpen}
        />

        {/* Chat Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Messages */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px 28px',
            display: 'flex',
            flexDirection: 'column',
            gap: 22,
            background: 'linear-gradient(180deg, var(--parchment) 0%, var(--parchment-dark) 100%)',
          }}>
            {!activeConv || activeConv.messages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--burgundy)' }}>
                <div style={{ fontSize: 40, marginBottom: 16, animation: 'pulse-glow 3s infinite', color: 'var(--gold)' }}>✝</div>
                <h2 style={{ fontFamily: 'Cinzel', fontSize: 18, marginBottom: 10, color: 'var(--burgundy)' }}>
                  Bienvenue dans la lumière de l'Église
                </h2>
                <p style={{ fontFamily: 'EB Garamond', fontSize: 15, lineHeight: 1.7, color: '#5a2a35', maxWidth: 520, margin: '0 auto 24px' }}>
                  Je suis votre guide dans la foi catholique, fondé sur le Catéchisme, la Sainte Écriture, le Magistère, et les Pères de l'Église — notamment saint Thomas d'Aquin et saint Augustin.
                </p>
                <Divider />
                <div style={{ marginTop: 20, display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                  {QUICK_PROMPTS.map(qp => (
                    <button key={qp.label} onClick={() => handleQuick(qp.prompt)} style={{
                      background: 'rgba(92,10,33,0.08)',
                      border: '1px solid var(--gold-dark)',
                      color: 'var(--burgundy)',
                      padding: '7px 14px',
                      borderRadius: 2,
                      fontFamily: 'Cinzel',
                      fontSize: 9,
                      letterSpacing: 1,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}>
                      {qp.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              activeConv.messages.map((msg, i) => (
                <MessageBubble key={i} msg={msg} />
              ))
            )}
            {loading && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{
            borderTop: '2px solid var(--gold-dark)',
            background: 'var(--parchment-dark)',
            padding: '14px 20px',
            display: 'flex',
            gap: 10,
            alignItems: 'flex-end',
            flexShrink: 0,
          }}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 130) + 'px';
              }}
              onKeyDown={handleKeyDown}
              placeholder="Posez votre question sur la foi catholique… (Entrée pour envoyer)"
              rows={1}
              style={{
                flex: 1,
                background: 'var(--cream)',
                border: '1px solid var(--gold-dark)',
                borderRadius: 2,
                padding: '11px 14px',
                fontFamily: 'EB Garamond',
                fontSize: 16,
                color: 'var(--ink)',
                resize: 'none',
                outline: 'none',
                minHeight: 46,
                maxHeight: 130,
                lineHeight: 1.5,
                transition: 'border-color 0.2s',
              }}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              style={{
                background: loading || !input.trim() ? '#9a7a7a' : 'var(--burgundy)',
                border: '2px solid var(--gold-dark)',
                color: 'var(--gold-light)',
                width: 46,
                height: 46,
                borderRadius: 2,
                cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                fontSize: 18,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
                flexShrink: 0,
              }}
            >
              ✟
            </button>
          </div>
        </div>

        {/* Calendar Panel */}
        <div style={{
          width: calendarOpen ? 240 : 0,
          minWidth: calendarOpen ? 240 : 0,
          overflow: 'hidden',
          transition: 'all 0.3s ease',
          borderLeft: '1px solid var(--gold-dark)',
          background: 'linear-gradient(180deg, rgba(58,6,20,0.97), rgba(30,0,8,0.99))',
          overflowY: calendarOpen ? 'auto' : 'hidden',
          flexShrink: 0,
        }}>
          <CalendarPanel today={today} />
        </div>
      </div>
    </div>
  );
}
