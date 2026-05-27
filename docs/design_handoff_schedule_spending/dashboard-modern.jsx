// dashboard-modern.jsx — Direction C v2: Vivid Modern + features from A & B
//
// New in v2:
//   • Quick add button → opens a wants-tracker modal (working)
//   • "Due in 7 days" summary card replaces the redundant Income KPI
//   • Wishlist row with proper "X mo to save · at $250/mo" math
//   • Sticky bottom status bar — recent purchases ticker + up-next bills
//   • Drag-to-reorder on the middle section row preserved

const { useState: useStateC, useRef: useRefC } = React;

function DashboardModern({ theme = 'light', accent = '#5b3df5', density = 'comfortable', cardStyle = 'elevated', font = 'sans', tab = 'dashboard' }) {
  const B = window.BUDGET;
  const F = window.FMT;
  const isDark = theme === 'dark';
  const [activeTab, setActiveTab] = useStateC(tab);
  const [order, setOrder] = useStateC(['recurring', 'loans', 'savings']);
  const [showQuickAdd, setShowQuickAdd] = useStateC(false);

  // Local state for purchases / wants spent so the Quick-Add modal feels real
  const [recent, setRecent] = useStateC(B.recent);
  const [wantsSpent, setWantsSpent] = useStateC(B.buckets.wants.spent);

  // Inline expand + edit state — preserves functionality from the original app
  const [expandedCardId, setExpandedCardId] = useStateC(null);
  const [activeEdit, setActiveEdit] = useStateC(null); // { type:'loan'|'savings', id, value }
  const [loanBalances, setLoanBalances] = useStateC(() =>
    Object.fromEntries(B.loans.map((l) => [l.id, l.remaining]))
  );
  const [savingsBalances, setSavingsBalances] = useStateC(() =>
    Object.fromEntries(B.savingsAccounts.map((s) => [s.id, s.balance]))
  );
  const wantsLeftLive = B.buckets.wants.budget - wantsSpent;
  const biWantsLive = B.derived.biWants - wantsSpent;

  const dragRef = useRefC(null);
  const accent2 = '#c8f24a';

  const t = isDark ? {
    bg: '#0d0d12', card: '#16161e', cardAlt: '#1a1a24',
    border: cardStyle === 'flat' ? 'transparent' : '#23232f',
    text: '#f0f0f5', muted: '#8b8b95', subtle: '#5a5a65', danger: '#ff6b6b', success: '#4ade80', warn: '#fbbf24',
    accent, accent2, accentSoft: accent + '24', track: '#1f1f2a',
    heroBg: accent, heroText: '#fff', heroMuted: 'rgba(255,255,255,0.7)',
    statusBg: '#0a0a10', statusBorder: '#1f1f2a',
  } : {
    bg: '#f3f4f7', card: '#ffffff', cardAlt: '#f9fafc',
    border: cardStyle === 'flat' ? 'transparent' : '#ebecef',
    text: '#16171f', muted: '#6c7280', subtle: '#a0a4ad', danger: '#dc2626', success: '#16a34a', warn: '#d97706',
    accent, accent2, accentSoft: accent + '12', track: '#eef0f3',
    heroBg: accent, heroText: '#fff', heroMuted: 'rgba(255,255,255,0.75)',
    statusBg: '#0d0d12', statusBorder: '#23232f',
  };

  const pad = density === 'compact' ? 16 : 22;
  const gap = density === 'compact' ? 12 : 16;
  const radius = cardStyle === 'flat' ? 4 : 18;
  const body = font === 'serif' ? '"Source Serif 4", Georgia, serif'
    : font === 'mono' ? 'ui-monospace, monospace'
    : '"Inter", "Helvetica Neue", system-ui, sans-serif';
  const mono = 'ui-monospace, "JetBrains Mono", monospace';
  const cardShadow = cardStyle === 'elevated' ? (isDark ? '0 4px 16px rgba(0,0,0,0.35)' : '0 1px 2px rgba(22,23,31,0.04), 0 4px 16px rgba(22,23,31,0.04)') : 'none';

  const Card = ({ children, style = {}, draggable, onDragStart, onDragOver, onDrop, dragging }) => (
    <div
      draggable={draggable} onDragStart={onDragStart} onDragOver={onDragOver} onDrop={onDrop}
      style={{
        background: t.card, border: `1px solid ${t.border}`, borderRadius: radius,
        padding: pad, boxShadow: cardShadow, position: 'relative',
        opacity: dragging ? 0.4 : 1, transition: 'opacity 0.15s',
        ...style,
      }}>{children}</div>
  );

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', glyph: '◧' },
    { id: 'schedule',  label: 'Schedule',  glyph: '▥' },
    { id: 'spending',  label: 'Spending',  glyph: '◐' },
    { id: 'goals',     label: 'Goals',     glyph: '◎' },
    { id: 'settings',  label: 'Settings',  glyph: '◆' },
  ];

  // Drag handlers (state-driven, not ref, so reorder repaints)
  const [dragId, setDragId] = useStateC(null);
  function handleDragStart(e, id) { setDragId(id); e.dataTransfer.effectAllowed = 'move'; }
  function handleDragOver(e) { e.preventDefault(); }
  function handleDrop(e, targetId) {
    e.preventDefault();
    if (!dragId || dragId === targetId) { setDragId(null); return; }
    const from = order.indexOf(dragId);
    const to = order.indexOf(targetId);
    const next = [...order];
    next.splice(from, 1);
    next.splice(to, 0, dragId);
    setOrder(next);
    setDragId(null);
  }

  // ── Cat color helper ──
  const catColor = (cat) => ({
    sub: t.accent, food: accent2, fun: '#ec4899', shop: '#f59e0b', auto: '#06b6d4',
  })[cat] || t.muted;
  const catTextColor = (cat) => (cat === 'food' ? '#3a4500' : '#fff');

  // ── Section content blocks ──
  const sectionContent = {
    recurring: () => (
      <>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 13, color: t.muted, marginBottom: 2 }}>Recurring spend</div>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.4 }}>${B.cards.reduce((a, c) => a + c.total, 0).toFixed(2)}<span style={{ color: t.muted, fontSize: 14, fontWeight: 500 }}>/mo</span></div>
          </div>
          <span style={{ fontSize: 16, color: t.subtle, cursor: 'grab' }}>⠿</span>
        </div>
        {B.cards.map((c, i) => {
          const isExpanded = expandedCardId === c.id;
          return (
            <div key={c.id} style={{
              borderBottom: i < B.cards.length - 1 && !isExpanded ? `1px solid ${t.border}` : 'none',
            }}>
              <button
                onClick={(e) => { e.stopPropagation(); setExpandedCardId(isExpanded ? null : c.id); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', width: '100%',
                  background: 'transparent', border: 0, cursor: 'pointer', textAlign: 'left',
                  fontFamily: 'inherit', color: t.text,
                }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: c.type === 'credit' ? accent2 : t.accent,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: c.type === 'credit' ? '#3a4500' : '#fff', fontSize: 14, fontWeight: 700, flexShrink: 0,
                }}>{c.name[0]}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: t.muted }}>{c.items.length} items · {c.type}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, fontFamily: mono }}>${c.total.toFixed(2)}</div>
                  <div style={{ fontSize: 10.5, color: t.muted }}>Next {c.items[0].due}</div>
                </div>
                <span style={{
                  color: t.muted, fontSize: 14, marginLeft: 4, width: 14, textAlign: 'center',
                  transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                  transition: 'transform 0.15s', display: 'inline-block',
                }}>›</span>
              </button>
              {isExpanded && (
                <div style={{
                  background: t.bg, borderRadius: 10, padding: '6px 12px',
                  marginBottom: 10, marginTop: 2, border: `1px solid ${t.border}`,
                }}>
                  {c.items.map((item, j) => (
                    <div key={j} style={{
                      display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 12,
                      alignItems: 'center', padding: '7px 0',
                      borderBottom: j < c.items.length - 1 ? `1px dashed ${t.border}` : 'none',
                      fontSize: 12,
                    }}>
                      <div>
                        <div style={{ fontWeight: 500, color: t.text }}>{item.name}</div>
                        <div style={{ fontSize: 10, color: t.subtle, fontFamily: mono, letterSpacing: 0.2 }}>{item.freq}</div>
                      </div>
                      <div style={{ color: t.muted, fontFamily: mono, fontSize: 11, whiteSpace: 'nowrap' }}>{item.due}</div>
                      <div style={{ fontFamily: mono, fontWeight: 600, minWidth: 56, textAlign: 'right' }}>${item.amount.toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </>
    ),

    loans: () => (
      <>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 13, color: t.muted, marginBottom: 2 }}>Loan payoff</div>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.4 }}>
              ${Math.round(Object.values(loanBalances).reduce((a, v) => a + v, 0)).toLocaleString()}<span style={{ color: t.muted, fontSize: 14, fontWeight: 500 }}> left</span>
            </div>
          </div>
          <span style={{ fontSize: 16, color: t.subtle, cursor: 'grab' }}>⠿</span>
        </div>
        {B.loans.map((l) => {
          const remaining = loanBalances[l.id] ?? l.remaining;
          const paid = Math.max(0, l.original - remaining);
          const pct = Math.max(0, Math.min(100, (paid / l.original) * 100));
          const isEditing = activeEdit?.type === 'loan' && activeEdit?.id === l.id;
          const placeholder = l.id === 'car' ? '199.03' : l.id === 'school' ? '135.77' : '54.00';
          return (
            <div key={l.id} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{l.name}</span>
                <span style={{ fontSize: 13, fontFamily: mono, color: t.muted }}>
                  ${Math.round(remaining).toLocaleString()}<span style={{ color: t.subtle }}> / ${Math.round(l.original).toLocaleString()}</span>
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <window.ProgressBar value={paid} max={l.original} color={l.color} trackColor={t.track} height={6} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, fontFamily: mono, color: t.muted, minWidth: 32, textAlign: 'right' }}>{pct.toFixed(0)}%</span>
                <button
                  onClick={(e) => { e.stopPropagation(); setActiveEdit(isEditing ? null : { type: 'loan', id: l.id, value: '' }); }}
                  style={{
                    padding: '3px 10px',
                    background: isEditing ? t.accent : 'transparent',
                    border: `1px solid ${isEditing ? t.accent : t.border}`,
                    color: isEditing ? '#fff' : t.muted,
                    borderRadius: 999, fontSize: 10.5, fontWeight: 700, cursor: 'pointer',
                    whiteSpace: 'nowrap', fontFamily: 'inherit',
                  }}>+ Pay</button>
              </div>
              {isEditing && (
                <div onClick={(e) => e.stopPropagation()} draggable={false} style={{
                  marginTop: 8, padding: 8, background: t.bg, borderRadius: 8,
                  display: 'flex', gap: 6, alignItems: 'center', border: `1px solid ${t.border}`,
                }}>
                  <span style={{ fontSize: 11, color: t.muted, fontWeight: 600 }}>$</span>
                  <input
                    autoFocus type="number" step="0.01"
                    value={activeEdit.value} placeholder={placeholder}
                    draggable={false}
                    onMouseDown={(e) => e.stopPropagation()}
                    onChange={(e) => setActiveEdit({ ...activeEdit, value: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const amt = parseFloat(activeEdit.value);
                        if (amt > 0) { setLoanBalances({ ...loanBalances, [l.id]: Math.max(0, remaining - amt) }); setActiveEdit(null); }
                      } else if (e.key === 'Escape') setActiveEdit(null);
                    }}
                    style={{
                      flex: 1, padding: '5px 8px', fontSize: 12, fontFamily: mono,
                      border: `1px solid ${t.border}`, background: t.card, color: t.text,
                      borderRadius: 6, outline: 'none', minWidth: 0,
                    }} />
                  <button onClick={(e) => {
                    e.stopPropagation();
                    const amt = parseFloat(activeEdit.value);
                    if (amt > 0) { setLoanBalances({ ...loanBalances, [l.id]: Math.max(0, remaining - amt) }); setActiveEdit(null); }
                  }} style={{
                    padding: '5px 12px', background: t.accent, color: '#fff', border: 0,
                    borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  }}>Apply</button>
                </div>
              )}
            </div>
          );
        })}
      </>
    ),

    savings: () => (
      <>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 13, color: t.muted, marginBottom: 2 }}>Savings goals</div>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.4 }}>
              ${Math.round(Object.values(savingsBalances).reduce((a, v) => a + v, 0)).toLocaleString()}
            </div>
          </div>
          <span style={{ fontSize: 16, color: t.subtle, cursor: 'grab' }}>⠿</span>
        </div>
        {B.savingsAccounts.slice(0, 4).map((s, i) => {
          const balance = savingsBalances[s.id] ?? s.balance;
          const goal = s.id === 'tfsa' ? 50000 : s.id === 'fhsa' ? 25000 : 5000;
          const isEditing = activeEdit?.type === 'savings' && activeEdit?.id === s.id;
          const sign = activeEdit?.sign ?? 1;
          const applyDelta = () => {
            const amt = parseFloat(activeEdit.value);
            if (!amt || amt <= 0) return;
            const next = Math.max(0, balance + sign * amt);
            setSavingsBalances({ ...savingsBalances, [s.id]: next });
            setActiveEdit(null);
          };
          return (
            <div key={s.id} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{s.name}</span>
                <span style={{ fontSize: 12, fontFamily: mono, color: t.muted }}>
                  ${balance.toLocaleString()}<span style={{ color: t.subtle }}> / ${goal.toLocaleString()}</span>
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <window.ProgressBar value={balance} max={goal} color={i % 2 === 0 ? t.accent : accent2} trackColor={t.track} height={5} />
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setActiveEdit(isEditing ? null : { type: 'savings', id: s.id, value: '', sign: 1 }); }}
                  style={{
                    padding: '3px 12px',
                    background: isEditing ? t.accent : 'transparent',
                    border: `1px solid ${isEditing ? t.accent : t.border}`,
                    color: isEditing ? '#fff' : t.muted,
                    borderRadius: 999, fontSize: 10.5, fontWeight: 700, cursor: 'pointer',
                    whiteSpace: 'nowrap', fontFamily: 'inherit',
                  }}>Edit</button>
              </div>
              {isEditing && (
                <div onClick={(e) => e.stopPropagation()} draggable={false} style={{
                  marginTop: 6, padding: 8, background: t.bg, borderRadius: 8,
                  display: 'flex', gap: 6, alignItems: 'center', border: `1px solid ${t.border}`,
                }}>
                  {/* +/- toggle */}
                  <div style={{ display: 'flex', background: t.card, borderRadius: 6, border: `1px solid ${t.border}`, overflow: 'hidden' }}>
                    <button onClick={(e) => { e.stopPropagation(); setActiveEdit({ ...activeEdit, sign: 1 }); }}
                      style={{
                        padding: '4px 9px', border: 0, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                        background: sign === 1 ? t.success : 'transparent',
                        color: sign === 1 ? '#fff' : t.muted, fontFamily: 'inherit',
                      }}>+ Add</button>
                    <button onClick={(e) => { e.stopPropagation(); setActiveEdit({ ...activeEdit, sign: -1 }); }}
                      style={{
                        padding: '4px 9px', border: 0, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                        background: sign === -1 ? t.danger : 'transparent',
                        color: sign === -1 ? '#fff' : t.muted, fontFamily: 'inherit',
                      }}>− Withdraw</button>
                  </div>
                  <span style={{ fontSize: 11, color: t.muted, fontWeight: 600 }}>$</span>
                  <input
                    autoFocus type="number" step="0.01" min="0"
                    value={activeEdit.value} placeholder={s.alloc.toString()}
                    draggable={false}
                    onMouseDown={(e) => e.stopPropagation()}
                    onChange={(e) => setActiveEdit({ ...activeEdit, value: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); applyDelta(); }
                      else if (e.key === 'Escape') setActiveEdit(null);
                    }}
                    style={{
                      flex: 1, padding: '5px 8px', fontSize: 12, fontFamily: mono,
                      border: `1px solid ${t.border}`, background: t.card, color: t.text,
                      borderRadius: 6, outline: 'none', minWidth: 0,
                    }} />
                  <button onClick={(e) => { e.stopPropagation(); applyDelta(); }} style={{
                    padding: '5px 12px', background: t.accent, color: '#fff', border: 0,
                    borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  }}>Apply</button>
                </div>
              )}
              {isEditing && parseFloat(activeEdit.value) > 0 && (
                <div style={{ marginTop: 4, fontSize: 10.5, color: t.muted, fontFamily: mono, paddingLeft: 4 }}>
                  New balance · ${Math.max(0, balance + sign * parseFloat(activeEdit.value)).toLocaleString()}
                </div>
              )}
            </div>
          );
        })}
      </>
    ),
  };

  // ── Quick-Add wants modal handler ──
  function handleQuickAdd(name, amount, cat) {
    setRecent([{ name, amount, when: 'just now', cat, card: 'WS Credit' }, ...recent.slice(0, 9)]);
    setWantsSpent(wantsSpent + amount);
    setShowQuickAdd(false);
  }

  // Affordability rate for wishlist — at this contribution rate, how many months?
  const SAVE_RATE = 250;
  const monthsToSave = (price) => Math.ceil(price / SAVE_RATE);

  // Context object passed to other tab components
  const ctx = {
    t, B, F, mono, body, accent, accent2, isDark, gap, pad, radius,
    Card,
    recent, setRecent,
    wantsSpent, setWantsSpent,
    loanBalances, setLoanBalances,
    savingsBalances, setSavingsBalances,
    activeEdit, setActiveEdit,
  };

  return (
    <div style={{
      width: '100%', height: '100%', background: t.bg, color: t.text,
      fontFamily: body, display: 'flex', overflow: 'hidden',
    }}>
      {/* ── Slim icon sidebar ── */}
      <aside style={{
        width: 64, background: t.card, borderRight: `1px solid ${t.border}`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '18px 0',
        flexShrink: 0, gap: 4,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, background: t.accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 18, fontWeight: 700, marginBottom: 14,
        }}>¢</div>
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} title={tab.label}
            style={{
              width: 40, height: 40, borderRadius: 12,
              background: activeTab === tab.id ? t.accentSoft : 'transparent',
              border: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: activeTab === tab.id ? t.accent : t.muted, fontSize: 16,
            }}>{tab.glyph}</button>
        ))}
        <div style={{ flex: 1 }} />
        <button style={{
          width: 40, height: 40, borderRadius: 999, background: t.cardAlt,
          border: `1px solid ${t.border}`, cursor: 'pointer', fontSize: 13,
          color: t.text, fontWeight: 700,
        }}>B</button>
      </aside>

      {/* ── Main column ── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Scrollable area */}
        <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          {activeTab === 'dashboard' && (<>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
            <div>
              <div style={{ fontSize: 13, color: t.muted, marginBottom: 4 }}>Welcome back, Brahim</div>
              <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: -0.7 }}>Your money, May 2026</h1>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button style={{
                padding: '10px 16px', background: t.card, border: `1px solid ${t.border}`,
                borderRadius: 999, fontSize: 12, color: t.text, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600,
              }}>⊞ Manage widgets</button>
              <button onClick={() => setShowQuickAdd(true)} style={{
                padding: '10px 18px', background: t.accent, color: '#fff',
                border: 0, borderRadius: 999, fontSize: 12, cursor: 'pointer', fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: 6, letterSpacing: 0.2,
                boxShadow: `0 2px 10px ${t.accent}44`,
              }}>+ Quick add to wants</button>
            </div>
          </div>

          {/* ─── KPI row: Hero · Due 7d · Needs · Net worth ─── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap, marginBottom: gap }}>
            {/* Hero */}
            <div style={{
              background: t.heroBg, color: t.heroText, borderRadius: radius,
              padding: 26, position: 'relative', overflow: 'hidden', boxShadow: cardShadow,
            }}>
              <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: 999, background: 'rgba(255,255,255,0.08)', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', top: -10, right: 60, width: 80, height: 80, borderRadius: 999, background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
              <div style={{ position: 'relative' }}>
                <div style={{ fontSize: 12, color: t.heroMuted, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 6 }}>Available to spend</div>
                <div style={{ fontSize: 13, color: t.heroMuted, marginBottom: 14 }}>Bi-weekly wants budget · until May 24</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontSize: 52, fontWeight: 800, letterSpacing: -1.8, lineHeight: 1 }}>
                    {F.splitDollars(biWantsLive)[0]}
                  </span>
                  <span style={{ fontSize: 26, color: t.heroMuted, fontWeight: 700, letterSpacing: -0.8 }}>.{F.splitDollars(biWantsLive)[1]}</span>
                </div>
                <div style={{ marginTop: 16, fontSize: 11, color: t.heroMuted, marginBottom: 6, fontFamily: mono, letterSpacing: 0.3 }}>
                  ${wantsSpent.toFixed(2)} SPENT OF ${B.derived.biWants.toFixed(2)}
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.18)', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, (wantsSpent / B.derived.biWants) * 100)}%`, height: '100%', background: accent2, borderRadius: 999, transition: 'width 0.3s' }} />
                </div>
              </div>
            </div>

            {/* DUE 7 DAYS — replaces Income KPI */}
            <div style={{ background: t.card, borderRadius: radius, padding: 22, border: `1px solid ${t.border}`, boxShadow: cardShadow, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                <div style={{ fontSize: 13, color: t.muted, fontWeight: 500 }}>Due next 7 days</div>
                <span style={{ fontSize: 10.5, padding: '2px 8px', background: accent2, color: '#3a4500', borderRadius: 999, fontWeight: 700 }}>{B.upcoming.length}</span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.8, lineHeight: 1, marginBottom: 10 }}>
                ${B.upcoming.reduce((a, u) => a + u.amount, 0).toFixed(2)}
              </div>
              <div style={{ flex: 1, fontSize: 11.5 }}>
                {B.upcoming.slice(0, 3).map((u, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderTop: i === 0 ? `1px solid ${t.border}` : 'none', borderBottom: `1px solid ${t.border}` }}>
                    <span style={{ color: t.text, display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ fontSize: 10, color: t.muted, fontFamily: mono, width: 24 }}>{u.day}</span>
                      <span style={{ fontWeight: 500 }}>{u.name}</span>
                    </span>
                    <span style={{ fontFamily: mono, fontWeight: 600 }}>${u.amount.toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Needs spent */}
            <div style={{ background: t.card, borderRadius: radius, padding: 22, border: `1px solid ${t.border}`, boxShadow: cardShadow }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ fontSize: 13, color: t.muted, fontWeight: 500 }}>Needs spent</div>
                <button style={{ background: 'transparent', border: 0, color: t.muted, cursor: 'pointer', fontSize: 14 }}>↗</button>
              </div>
              <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: -0.8, lineHeight: 1, marginBottom: 6 }}>
                {F.money(B.buckets.needs.spent, { cents: false })}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <span style={{ fontSize: 11, padding: '2px 7px', background: t.danger + '22', color: t.danger, borderRadius: 999, fontWeight: 700 }}>↑ over $58</span>
                <span style={{ fontSize: 11, color: t.muted }}>budget</span>
              </div>
              <window.ProgressBar value={B.buckets.needs.spent} max={B.buckets.needs.budget} color={t.danger} trackColor={t.track} height={4} />
            </div>

            {/* Net worth */}
            <div style={{ background: t.card, borderRadius: radius, padding: 22, border: `1px solid ${t.border}`, boxShadow: cardShadow }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ fontSize: 13, color: t.muted, fontWeight: 500 }}>Net worth</div>
                <button style={{ background: 'transparent', border: 0, color: t.muted, cursor: 'pointer', fontSize: 14 }}>↗</button>
              </div>
              <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: -0.8, lineHeight: 1, marginBottom: 6 }}>
                {F.money(B.derived.netWorth, { cents: false, compact: true })}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <span style={{ fontSize: 11, padding: '2px 7px', background: t.success + '22', color: t.success, borderRadius: 999, fontWeight: 700 }}>↑ 1.8%</span>
                <span style={{ fontSize: 11, color: t.muted }}>vs last month</span>
              </div>
              <window.Sparkline data={[12, 14, 13, 15, 16, 14, 17, 18, 19, 20, 21, 22]} width={180} height={28} color={t.success} fill strokeWidth={1.5} />
            </div>
          </div>

          {/* ─── Big two: Flow + Donut ─── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap, marginBottom: gap }}>
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 13, color: t.muted, marginBottom: 2 }}>Money flow</div>
                  <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.4 }}>Last 12 months</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <span style={{ padding: '4px 10px', background: t.accentSoft, color: t.accent, borderRadius: 999, fontSize: 11, fontWeight: 600 }}>● Income</span>
                  <span style={{ padding: '4px 10px', background: isDark ? '#23232f' : '#eef0f3', color: t.muted, borderRadius: 999, fontSize: 11, fontWeight: 600 }}>● Spend</span>
                </div>
              </div>
              <window.BarChart data={B.flow} width={520} height={170} colors={[t.accent, isDark ? '#3a3a48' : '#cdd1d8']} axisColor={t.muted} />
            </Card>

            <Card>
              {(() => {
                // Aggregate purchases by category
                const catMeta = {
                  food: { label: 'Food',     color: accent2 },
                  shop: { label: 'Shopping', color: '#f59e0b' },
                  auto: { label: 'Auto',     color: '#06b6d4' },
                  fun:  { label: 'Fun',      color: '#ec4899' },
                  sub:  { label: 'Subs',     color: t.accent },
                };
                const byCat = {};
                recent.forEach((r) => { byCat[r.cat] = (byCat[r.cat] || 0) + r.amount; });
                const totalPeriod = recent.reduce((a, r) => a + r.amount, 0);
                const sorted = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
                return (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                      <div>
                        <div style={{ fontSize: 13, color: t.muted, marginBottom: 2 }}>Purchases this period</div>
                        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.4 }}>
                          ${totalPeriod.toFixed(2)} <span style={{ color: t.muted, fontSize: 13, fontWeight: 500 }}>· {recent.length} items</span>
                        </div>
                      </div>
                      <span style={{
                        fontSize: 10.5, padding: '3px 8px', background: t.accentSoft, color: t.accent,
                        borderRadius: 999, fontWeight: 700, fontFamily: mono, letterSpacing: 0.3,
                      }}>BI-WK</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <window.Donut
                        segments={sorted.map(([cat, v]) => ({ name: catMeta[cat].label, value: v, color: catMeta[cat].color }))}
                        size={130} thickness={18} trackColor={t.track}
                        label={`$${totalPeriod.toFixed(0)}`} sublabel="SPENT"
                      />
                      <div style={{ flex: 1, fontSize: 12 }}>
                        {sorted.map(([cat, v], i) => {
                          const pct = (v / totalPeriod) * 100;
                          return (
                            <div key={cat} style={{ display: 'flex', alignItems: 'center', padding: '6px 0', borderBottom: i < sorted.length - 1 ? `1px solid ${t.border}` : 'none' }}>
                              <span style={{ width: 10, height: 10, background: catMeta[cat].color, borderRadius: 3, marginRight: 8 }} />
                              <span style={{ color: t.muted, flex: 1 }}>{catMeta[cat].label}</span>
                              <span style={{ fontWeight: 700, marginRight: 8, fontFamily: mono }}>${v.toFixed(0)}</span>
                              <span style={{ color: t.subtle, fontFamily: mono, fontSize: 11, width: 32, textAlign: 'right' }}>{pct.toFixed(0)}%</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                );
              })()}
            </Card>
          </div>

          {/* ─── Reorderable section row ─── */}
          <div style={{ fontSize: 11, color: t.muted, fontFamily: mono, letterSpacing: 0.5, marginBottom: 8, paddingLeft: 4 }}>
            ⠿ DRAG TO REORDER · {order.length} SECTIONS
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap, marginBottom: gap }}>
            {order.map((id) => (
              <Card key={id}
                draggable
                onDragStart={(e) => handleDragStart(e, id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, id)}
                dragging={dragId === id}
                style={{ cursor: 'grab' }}>
                {sectionContent[id]()}
              </Card>
            ))}
          </div>

          {/* ─── Wishlist row — with real affordability math ─── */}
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10, paddingLeft: 2 }}>
            <div>
              <div style={{ fontSize: 13, color: t.muted, marginBottom: 2 }}>Wishlist</div>
              <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.4 }}>
                ${B.wishlist.reduce((a, w) => a + w.est, 0).toLocaleString()} <span style={{ color: t.muted, fontSize: 13, fontWeight: 500 }}>· at $250/mo savings rate</span>
              </div>
            </div>
            <button style={{
              padding: '6px 12px', background: 'transparent', border: `1px solid ${t.border}`,
              borderRadius: 999, fontSize: 11, color: t.text, cursor: 'pointer', fontWeight: 600,
            }}>+ Add item</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap, marginBottom: gap }}>
            {B.wishlist.map((w, i) => {
              const months = monthsToSave(w.est);
              const progress = Math.min(1, (i + 1) * 0.18); // synthetic saved-toward progress per item
              return (
                <Card key={w.id} style={{ padding: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: 10, background: t.accentSoft,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: t.accent, fontSize: 20, fontWeight: 700,
                    }}>{w.icon}</div>
                    <span style={{
                      fontSize: 10.5, padding: '3px 8px', background: months <= 6 ? accent2 : isDark ? t.cardAlt : '#f3f4f7',
                      color: months <= 6 ? '#3a4500' : t.muted,
                      borderRadius: 999, fontWeight: 700, fontFamily: mono, letterSpacing: 0.3,
                    }}>~{months} mo</span>
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 500, marginBottom: 8, lineHeight: 1.35, minHeight: 34 }}>{w.name}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.6, marginBottom: 8 }}>${w.est.toLocaleString()}</div>
                  <window.ProgressBar value={progress * w.est} max={w.est} color={t.accent} trackColor={t.track} height={4} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: t.muted, fontFamily: mono, marginTop: 5 }}>
                    <span>${Math.round(progress * w.est).toLocaleString()} saved</span>
                    <span>{(progress * 100).toFixed(0)}%</span>
                  </div>
                </Card>
              );
            })}
          </div>

          <div style={{ height: 8 }} />
          </>)}
          {activeTab === 'schedule' && window.TabSchedule && <window.TabSchedule ctx={ctx} />}
          {activeTab === 'spending' && window.TabSpending && <window.TabSpending ctx={ctx} />}
          {activeTab === 'goals'    && window.TabGoals    && <window.TabGoals    ctx={ctx} />}
          {activeTab === 'settings' && window.TabSettings && <window.TabSettings ctx={ctx} />}
        </div>

        {/* ─── STICKY BOTTOM STATUS BAR ─── */}
        <div style={{
          flexShrink: 0, background: t.statusBg, color: '#e6e6ed',
          borderTop: `1px solid ${t.statusBorder}`, padding: '8px 16px',
          display: 'flex', alignItems: 'center', gap: 14, fontSize: 11.5,
          fontFamily: body, height: 44,
        }}>
          {/* Recent */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 9.5, fontFamily: mono, color: '#6b7280', letterSpacing: 0.5, fontWeight: 700 }}>RECENT</span>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden', minWidth: 0 }}>
            {recent.slice(0, 5).map((r, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px',
                background: 'rgba(255,255,255,0.06)', borderRadius: 999, flexShrink: 0,
                border: r.when === 'just now' ? `1px solid ${accent2}` : '1px solid transparent',
              }}>
                <span style={{ width: 6, height: 6, background: catColor(r.cat), borderRadius: 999 }} />
                <span style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{r.name}</span>
                <span style={{ color: '#9ca3af', fontFamily: mono, fontSize: 10.5 }}>−${r.amount.toFixed(2)}</span>
                <span style={{ color: '#6b7280', fontSize: 10 }}>{r.when}</span>
              </div>
            ))}
          </div>

          <div style={{ width: 1, height: 18, background: '#23232f', flexShrink: 0 }} />

          {/* Up next */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 9.5, fontFamily: mono, color: '#6b7280', letterSpacing: 0.5, fontWeight: 700 }}>UP NEXT</span>
            {B.upcoming.slice(0, 3).map((u, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px',
                background: 'rgba(255,255,255,0.06)', borderRadius: 999, flexShrink: 0,
              }}>
                <span style={{ color: '#9ca3af', fontFamily: mono, fontSize: 10 }}>{u.day}</span>
                <span style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{u.name}</span>
                <span style={{ color: accent2, fontFamily: mono, fontSize: 10.5 }}>${u.amount.toFixed(0)}</span>
              </div>
            ))}
          </div>

          <div style={{ width: 1, height: 18, background: '#23232f', flexShrink: 0 }} />
          <div style={{ fontSize: 10, fontFamily: mono, color: '#6b7280', flexShrink: 0 }}>
            <span style={{ color: t.success }}>●</span> SYNCED · 22:54
          </div>
        </div>
      </main>

      {/* ─── Quick Add Wants modal ─── */}
      {showQuickAdd && (
        <QuickAddModal
          theme={t} accent={accent} accent2={accent2} radius={radius} body={body} mono={mono}
          biRemaining={biWantsLive}
          onClose={() => setShowQuickAdd(false)}
          onAdd={handleQuickAdd}
        />
      )}
    </div>
  );
}

function QuickAddModal({ theme: t, accent, accent2, radius, body, mono, biRemaining, onClose, onAdd }) {
  const [name, setName] = React.useState('');
  const [amount, setAmount] = React.useState('');
  const [cat, setCat] = React.useState('fun');

  const cats = [
    { id: 'fun',  label: 'Fun',     color: '#ec4899' },
    { id: 'food', label: 'Food',    color: accent2 },
    { id: 'shop', label: 'Shopping',color: '#f59e0b' },
    { id: 'sub',  label: 'Sub',     color: accent },
    { id: 'auto', label: 'Auto',    color: '#06b6d4' },
  ];

  const submit = (e) => {
    e?.preventDefault?.();
    const amt = parseFloat(amount);
    if (!name || !amt || amt <= 0) return;
    onAdd(name, amt, cat);
  };

  const after = biRemaining - (parseFloat(amount) || 0);

  return (
    <div onClick={onClose} style={{
      position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
      backdropFilter: 'blur(2px)',
    }}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} style={{
        background: t.card, color: t.text, borderRadius: radius, padding: 24,
        width: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        border: `1px solid ${t.border}`, fontFamily: body,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: t.muted, fontFamily: mono, letterSpacing: 0.5, marginBottom: 2 }}>QUICK ADD</div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: -0.4 }}>Log a wants purchase</h2>
          </div>
          <button type="button" onClick={onClose} style={{
            background: 'transparent', border: 0, color: t.muted, fontSize: 20, cursor: 'pointer',
          }}>×</button>
        </div>

        <label style={{ display: 'block', fontSize: 11, color: t.muted, marginBottom: 4, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase' }}>What did you buy?</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. coffee, t-shirt, dinner"
          autoFocus
          style={{
            width: '100%', padding: '10px 12px', fontSize: 14, border: `1px solid ${t.border}`,
            background: t.bg, color: t.text, borderRadius: 10, marginBottom: 14, outline: 'none',
            fontFamily: 'inherit',
          }} />

        <label style={{ display: 'block', fontSize: 11, color: t.muted, marginBottom: 4, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase' }}>Amount</label>
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: t.muted, fontSize: 14 }}>$</span>
          <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00"
            style={{
              width: '100%', padding: '10px 12px 10px 24px', fontSize: 14, border: `1px solid ${t.border}`,
              background: t.bg, color: t.text, borderRadius: 10, outline: 'none', fontFamily: mono,
            }} />
        </div>

        <label style={{ display: 'block', fontSize: 11, color: t.muted, marginBottom: 6, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase' }}>Category</label>
        <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
          {cats.map((c) => (
            <button key={c.id} type="button" onClick={() => setCat(c.id)} style={{
              padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600,
              border: `1px solid ${cat === c.id ? c.color : t.border}`,
              background: cat === c.id ? c.color + '22' : 'transparent',
              color: cat === c.id ? c.color : t.muted, cursor: 'pointer',
            }}>{c.label}</button>
          ))}
        </div>

        <div style={{
          background: t.bg, border: `1px solid ${t.border}`, borderRadius: 10, padding: 12, marginBottom: 16,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12,
        }}>
          <div>
            <div style={{ color: t.muted, fontSize: 10.5, fontFamily: mono, letterSpacing: 0.4 }}>BI-WEEKLY REMAINING AFTER</div>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: mono, marginTop: 2, color: after < 0 ? t.danger : t.text }}>
              ${after.toFixed(2)}
            </div>
          </div>
          {after < 0 && <span style={{ fontSize: 10.5, padding: '3px 8px', background: t.danger + '22', color: t.danger, borderRadius: 999, fontWeight: 700 }}>OVER BUDGET</span>}
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} style={{
            padding: '10px 16px', background: 'transparent', border: `1px solid ${t.border}`,
            borderRadius: 999, fontSize: 13, color: t.text, cursor: 'pointer', fontWeight: 600,
          }}>Cancel</button>
          <button type="submit" disabled={!name || !amount} style={{
            padding: '10px 20px', background: accent, color: '#fff', border: 0,
            borderRadius: 999, fontSize: 13, cursor: (name && amount) ? 'pointer' : 'not-allowed',
            fontWeight: 700, opacity: (name && amount) ? 1 : 0.5,
            boxShadow: `0 2px 10px ${accent}44`,
          }}>Add purchase</button>
        </div>
      </form>
    </div>
  );
}

window.DashboardModern = DashboardModern;
