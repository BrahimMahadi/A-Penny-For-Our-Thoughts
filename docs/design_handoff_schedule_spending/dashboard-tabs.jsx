// dashboard-tabs.jsx — Schedule, Spending, Goals, Settings tabs
// Each takes a `ctx` object with theme tokens + shared state from the parent.
// Same visual language as the main dashboard.

const { useState: useStateT } = React;

// ─── Shared header ────────────────────────────────────────────────
function TabHeader({ eyebrow, title, ctx, right }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
      <div>
        <div style={{ fontSize: 13, color: ctx.t.muted, marginBottom: 4 }}>{eyebrow}</div>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: -0.7 }}>{title}</h1>
      </div>
      {right}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SCHEDULE TAB
// ═══════════════════════════════════════════════════════════════════
function TabSchedule({ ctx }) {
  const { t, B, F, mono, accent, accent2, Card } = ctx;
  const [selectedKey, setSelectedKey] = useStateT('5-25'); // today
  const [view, setView] = useStateT('month'); // 'month' | 'period'

  // ─── Events keyed by "month-day" ─────────────────────────────
  // Period 9 spans May 22 → Jun 4 (next pay Jun 5)
  const events = {
    '5-1':  [{ name: 'Rent', amount: 700, type: 'bill', card: 'WS Debit' }],
    '5-2':  [{ name: 'Apple Music', amount: 6.89, type: 'sub', card: 'WS Debit' }],
    '5-4':  [{ name: 'CAA', amount: 16.67, type: 'sub', card: 'WS Debit' }],
    '5-5':  [{ name: 'WiFi', amount: 50, type: 'bill', card: 'WS Debit' }, { name: 'Amazon Prime', amount: 5, type: 'sub', card: 'WS Credit' }],
    '5-8':  [{ name: 'Pay · Stream A+B', amount: 3551.64, type: 'income' }, { name: 'Car Loan', amount: 199.03, type: 'loan', card: 'TD Debit' }],
    '5-15': [{ name: 'Car Insurance', amount: 222.05, type: 'bill', card: 'TD Debit' }],
    '5-17': [{ name: 'PS Plus', amount: 17, type: 'sub', card: 'WS Debit' }],
    '5-22': [{ name: 'Pay · Stream A+B', amount: 3551.64, type: 'income' }, { name: 'Car Loan', amount: 199.03, type: 'loan', card: 'TD Debit' }],
    '5-23': [{ name: 'Phone Loan', amount: 54, type: 'loan', card: 'WS Debit' }],
    '5-25': [{ name: 'Apple Music', amount: 6.89, type: 'sub', card: 'WS Debit' }],
    '5-27': [{ name: 'CAA', amount: 16.67, type: 'sub', card: 'WS Debit' }],
    '5-29': [{ name: 'Gym', amount: 72, type: 'sub', card: 'WS Debit' }],
    '5-30': [{ name: 'Fizz Mobile', amount: 36, type: 'sub', card: 'WS Credit' }],
    '6-1':  [{ name: 'Rent', amount: 700, type: 'bill', card: 'WS Debit' }],
    '6-2':  [{ name: 'Apple Music', amount: 6.89, type: 'sub', card: 'WS Debit' }],
    '6-4':  [{ name: 'CAA', amount: 16.67, type: 'sub', card: 'WS Debit' }],
    '6-5':  [{ name: 'Pay · Stream A+B', amount: 3551.64, type: 'income' }],
  };

  // ─── Build cells for current view ───────────────────────────
  let cells = []; // { key, day, month, isToday, inPeriod, padding }
  let weekdayLabels;

  if (view === 'month') {
    weekdayLabels = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const monthStart = 5; // May 1, 2026 = Friday
    for (let i = 0; i < monthStart; i++) cells.push({ padding: true });
    for (let d = 1; d <= 31; d++) {
      const key = `5-${d}`;
      const inPeriod = d >= 22 && d <= 31; // first half of period 9 in May
      cells.push({ key, day: d, monthLabel: 'May', isToday: d === 25, inPeriod });
    }
    while (cells.length < 35) cells.push({ padding: true });
  } else {
    // Pay-period view: 14 days from May 22 → Jun 4, top-left = THU
    weekdayLabels = ['THU', 'FRI', 'SAT', 'SUN', 'MON', 'TUE', 'WED'];
    for (let i = 0; i < 14; i++) {
      const offset = 22 + i;
      const day = offset <= 31 ? offset : offset - 31;
      const monthLabel = offset <= 31 ? 'May' : 'Jun';
      const monthNum = offset <= 31 ? 5 : 6;
      const key = `${monthNum}-${day}`;
      cells.push({
        key, day, monthLabel,
        isToday: monthNum === 5 && day === 25,
        inPeriod: true,
        isPayStart: monthNum === 5 && day === 22,
        isPayEnd: monthNum === 6 && day === 4,
      });
    }
  }

  const typeColor = (type) => ({
    income: t.success, bill: t.danger, sub: accent, loan: t.warn, var: accent2,
  })[type] || t.muted;

  const selectedEvents = (events[selectedKey] || []);
  const [selMonth, selDay] = selectedKey.split('-').map(Number);
  const selMonthLabel = selMonth === 5 ? 'May' : 'Jun';

  // Tallies — scoped to active view
  let incomeTotal = 0, billsTotal = 0;
  const tallyKeys = view === 'month'
    ? Object.keys(events).filter((k) => k.startsWith('5-'))
    : cells.filter((c) => !c.padding).map((c) => c.key);
  tallyKeys.forEach((k) => (events[k] || []).forEach((e) => {
    if (e.type === 'income') incomeTotal += e.amount;
    else billsTotal += e.amount;
  }));

  const headerTitle = view === 'month' ? 'May 2026' : 'Period 9 · May 22 – Jun 4';
  const kpiLabel = view === 'month' ? 'this month' : 'this period';

  return (
    <>
      <TabHeader eyebrow="Schedule" title={headerTitle}
        ctx={ctx}
        right={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ display: 'flex', background: t.card, border: `1px solid ${t.border}`, borderRadius: 999, padding: 3 }}>
              <button style={{ padding: '6px 12px', background: 'transparent', border: 0, fontSize: 12, color: t.muted, cursor: 'pointer', fontFamily: 'inherit', borderRadius: 999 }}>‹</button>
              <button style={{ padding: '6px 14px', background: t.accentSoft, color: t.accent, border: 0, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', borderRadius: 999, fontWeight: 600 }}>Today</button>
              <button style={{ padding: '6px 12px', background: 'transparent', border: 0, fontSize: 12, color: t.muted, cursor: 'pointer', fontFamily: 'inherit', borderRadius: 999 }}>›</button>
            </div>
            <div style={{ display: 'flex', background: t.card, border: `1px solid ${t.border}`, borderRadius: 999, padding: 3 }}>
              {[
                { id: 'month',  label: 'Month' },
                { id: 'period', label: 'Pay period' },
              ].map((opt) => (
                <button key={opt.id} onClick={() => setView(opt.id)} style={{
                  padding: '6px 14px',
                  background: view === opt.id ? t.accent : 'transparent',
                  color: view === opt.id ? '#fff' : t.muted,
                  border: 0, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', borderRadius: 999,
                  fontWeight: view === opt.id ? 700 : 500,
                }}>{opt.label}</button>
              ))}
            </div>
          </div>
        } />

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: ctx.gap, marginBottom: ctx.gap }}>
        {[
          { label: `Income ${kpiLabel}`, value: incomeTotal, color: t.success, sign: '+' },
          { label: 'Bills + recurring',  value: billsTotal, color: t.danger,  sign: '−' },
          { label: 'Net (income − bills)', value: incomeTotal - billsTotal, color: t.text, sign: '' },
        ].map((m, i) => (
          <Card key={i}>
            <div style={{ fontSize: 13, color: t.muted, marginBottom: 4 }}>{m.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.8, color: m.color }}>
              {m.sign}${Math.round(m.value).toLocaleString()}
            </div>
          </Card>
        ))}
      </div>

      {/* Calendar + selected day */}
      <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1fr', gap: ctx.gap, marginBottom: ctx.gap }}>
        <Card>
          {/* Weekday header */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 8 }}>
            {weekdayLabels.map((w) => (
              <div key={w} style={{ fontSize: 10, color: t.muted, fontFamily: mono, letterSpacing: 0.5, textAlign: 'center', fontWeight: 700 }}>{w}</div>
            ))}
          </div>
          {/* Day grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
            {cells.map((c, i) => {
              if (c.padding) return <div key={i} style={{ minHeight: view === 'period' ? 130 : 86 }} />;
              const dayEvts = events[c.key] || [];
              const isSelected = c.key === selectedKey;
              const showNames = view === 'period' || dayEvts.length <= 2;
              const maxNamesShown = view === 'period' ? 4 : 2;
              return (
                <button key={i}
                  onClick={() => setSelectedKey(c.key)}
                  style={{
                    minHeight: view === 'period' ? 130 : 86,
                    border: `1px solid ${isSelected ? t.accent : c.isPayStart || c.isPayEnd ? t.success + '88' : t.border}`,
                    background: isSelected ? t.accentSoft : c.isToday ? t.cardAlt : t.card,
                    borderRadius: 10, padding: 7, cursor: 'pointer', textAlign: 'left',
                    fontFamily: 'inherit', display: 'flex', flexDirection: 'column', gap: 3,
                    boxShadow: isSelected ? `0 0 0 2px ${t.accent}33` : 'none', transition: 'all 0.1s',
                    overflow: 'hidden',
                  }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{
                      fontSize: 12, fontWeight: c.isToday ? 800 : 600,
                      color: c.isToday ? t.accent : t.text,
                      display: 'flex', alignItems: 'baseline', gap: 4,
                    }}>
                      {c.day}
                      {view === 'period' && c.day === 1 && (
                        <span style={{ fontSize: 9, color: t.muted, fontFamily: mono, fontWeight: 600 }}>JUN</span>
                      )}
                      {view === 'period' && i === 0 && (
                        <span style={{ fontSize: 9, color: t.muted, fontFamily: mono, fontWeight: 600 }}>MAY</span>
                      )}
                    </span>
                    {(c.isPayStart || c.isPayEnd) && (
                      <span style={{ fontSize: 8.5, fontFamily: mono, color: t.success, fontWeight: 800, letterSpacing: 0.3 }}>
                        {c.isPayStart ? 'PAY' : 'END'}
                      </span>
                    )}
                  </div>
                  {showNames ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 2, minWidth: 0 }}>
                      {dayEvts.slice(0, maxNamesShown).map((e, j) => (
                        <div key={j} style={{
                          display: 'flex', alignItems: 'center', gap: 4, minWidth: 0,
                        }}>
                          <span style={{
                            width: 2, alignSelf: 'stretch', minHeight: 10,
                            background: typeColor(e.type), borderRadius: 999, flex: '0 0 auto',
                          }} />
                          <span style={{
                            fontSize: 10, color: t.text, fontWeight: 500,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0, flex: 1,
                            lineHeight: 1.25,
                          }}>{e.name.replace('Pay · Stream A+B', 'Pay').replace(' Mobile', '')}</span>
                        </div>
                      ))}
                      {dayEvts.length > maxNamesShown && (
                        <div style={{ fontSize: 9, color: t.muted, fontFamily: mono, fontWeight: 600, marginLeft: 6 }}>
                          +{dayEvts.length - maxNamesShown} more
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <div style={{ fontSize: 9, fontFamily: mono, color: t.muted, fontWeight: 700 }}>
                        {dayEvts.length} events
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 'auto' }}>
                        {dayEvts.slice(0, 4).map((e, j) => (
                          <div key={j} style={{
                            height: 3, background: typeColor(e.type), borderRadius: 999, opacity: 0.85,
                          }} />
                        ))}
                      </div>
                    </>
                  )}
                </button>
              );
            })}
          </div>
          {/* Legend */}
          <div style={{ display: 'flex', gap: 14, marginTop: 14, flexWrap: 'wrap', fontSize: 11, color: t.muted }}>
            {[
              { l: 'Income', c: t.success },
              { l: 'Bill',   c: t.danger },
              { l: 'Sub',    c: accent },
              { l: 'Loan',   c: t.warn },
            ].map((l) => (
              <span key={l.l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 8, height: 3, background: l.c, borderRadius: 999 }} />{l.l}
              </span>
            ))}
          </div>
        </Card>

        {/* Selected day detail */}
        <Card>
          <div style={{ fontSize: 12, color: t.muted, marginBottom: 4, fontFamily: mono, letterSpacing: 0.5 }}>SELECTED DAY</div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5, marginBottom: 4 }}>{selMonthLabel} {selDay}, 2026</div>
          <div style={{ fontSize: 12, color: t.muted, marginBottom: 16 }}>
            {selectedEvents.length === 0 ? 'No events scheduled' : `${selectedEvents.length} event${selectedEvents.length > 1 ? 's' : ''} · $${selectedEvents.reduce((a, e) => a + (e.type === 'income' ? 0 : e.amount), 0).toFixed(2)} out`}
          </div>
          {selectedEvents.length === 0 ? (
            <div style={{
              padding: 24, textAlign: 'center', border: `1px dashed ${t.border}`, borderRadius: 12,
              color: t.subtle, fontSize: 12,
            }}>Click a date with markers to see what's due.</div>
          ) : (
            selectedEvents.map((e, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0',
                borderBottom: i < selectedEvents.length - 1 ? `1px solid ${t.border}` : 'none',
              }}>
                <div style={{
                  width: 4, alignSelf: 'stretch', background: typeColor(e.type), borderRadius: 999,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{e.name}</div>
                  <div style={{ fontSize: 10.5, color: t.muted, fontFamily: mono, letterSpacing: 0.3, textTransform: 'uppercase' }}>
                    {e.type}{e.card ? ` · ${e.card}` : ''}
                  </div>
                </div>
                <div style={{
                  fontFamily: mono, fontWeight: 700, fontSize: 14,
                  color: e.type === 'income' ? t.success : t.text,
                }}>
                  {e.type === 'income' ? '+' : '−'}${e.amount.toFixed(2)}
                </div>
              </div>
            ))
          )}
          <button style={{
            marginTop: 14, width: '100%', padding: '8px 12px', background: 'transparent',
            border: `1px dashed ${t.border}`, borderRadius: 10, fontSize: 12, fontWeight: 600,
            color: t.muted, cursor: 'pointer', fontFamily: 'inherit',
          }}>+ Schedule something</button>
        </Card>
      </div>

      {/* Pay schedule timeline */}
      <Card style={{ marginBottom: ctx.gap }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 13, color: t.muted, marginBottom: 2 }}>Pay schedule</div>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.4 }}>Bi-weekly · Thursdays</div>
          </div>
          <div style={{ fontSize: 12, color: t.muted }}>$3,551.64 per pay</div>
        </div>
        <div style={{ position: 'relative', height: 60, marginTop: 8 }}>
          <div style={{ position: 'absolute', top: 30, left: 12, right: 12, height: 2, background: t.border }} />
          {[
            { d: 'Apr 24', past: true,  label: 'Period 8' },
            { d: 'May 8',  past: true,  label: 'Period 9' },
            { d: 'May 22', past: true,  label: 'Period 9' },
            { d: 'Jun 5',  past: false, label: 'Period 10', next: true },
            { d: 'Jun 19', past: false, label: 'Period 10' },
            { d: 'Jul 3',  past: false, label: 'Period 11' },
          ].map((p, i, arr) => (
            <div key={i} style={{
              position: 'absolute', top: 0, left: `${(i / (arr.length - 1)) * 100}%`,
              transform: 'translateX(-50%)', textAlign: 'center',
            }}>
              <div style={{ fontSize: 10, color: t.muted, fontFamily: mono, fontWeight: 600, marginBottom: 4 }}>{p.d}</div>
              <div style={{
                width: p.next ? 16 : 12, height: p.next ? 16 : 12, borderRadius: 999,
                background: p.past ? t.subtle : p.next ? t.success : t.border,
                border: p.next ? `3px solid ${t.success}33` : 'none',
                margin: '0 auto', position: 'relative', top: p.next ? -2 : 0,
              }} />
              <div style={{ fontSize: 10.5, color: p.next ? t.success : t.muted, fontWeight: p.next ? 700 : 500, marginTop: 6 }}>
                {p.next ? 'Next pay' : p.label}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SPENDING TAB
// ═══════════════════════════════════════════════════════════════════
function TabSpending({ ctx }) {
  const { t, B, F, mono, accent, accent2, Card, recent } = ctx;
  const [filter, setFilter] = useStateT('all');
  const [sortBy, setSortBy] = useStateT('date');
  const [query, setQuery] = useStateT('');

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
  const dailyAvg = totalPeriod / 4; // 4 days into period
  const topCatId = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0]?.[0];

  const filtered = recent.filter((r) => {
    if (filter !== 'all' && r.cat !== filter) return false;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      const catLabel = catMeta[r.cat]?.label.toLowerCase() || '';
      if (!r.name.toLowerCase().includes(q) &&
          !catLabel.includes(q) &&
          !r.card.toLowerCase().includes(q)) return false;
    }
    return true;
  });
  // Sort
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'amount') return b.amount - a.amount;
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    return 0; // date default order
  });

  // Daily strip (synth: 8.45+24.10, 36.99+41.83, 87.12+52.40, 6.99+16.37)
  const dailySpend = [0, 0, 32.55, 78.82, 139.52, 23.36, 0];

  return (
    <>
      <TabHeader eyebrow="Spending" title="Period 9 · May 22 – Jun 5"
        ctx={ctx}
        right={
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{ padding: '8px 14px', background: t.card, border: `1px solid ${t.border}`, borderRadius: 999, fontSize: 12, color: t.text, cursor: 'pointer', fontWeight: 600 }}>‹ Period 8</button>
            <button style={{ padding: '8px 14px', background: t.card, border: `1px solid ${t.border}`, borderRadius: 999, fontSize: 12, color: t.muted, cursor: 'pointer', fontWeight: 600 }}>Period 10 ›</button>
            <button style={{ padding: '8px 14px', background: t.accent, color: '#fff', border: 0, borderRadius: 999, fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>Export CSV</button>
          </div>
        } />

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: ctx.gap, marginBottom: ctx.gap }}>
        {[
          { label: 'Spent', value: `$${totalPeriod.toFixed(2)}`, sub: `of $${B.derived.biWants.toFixed(2)} budget` },
          { label: 'Daily average', value: `$${dailyAvg.toFixed(2)}`, sub: 'over 4 days' },
          { label: 'Top category', value: catMeta[topCatId]?.label || '—', sub: `$${(byCat[topCatId] || 0).toFixed(2)} · ${((byCat[topCatId] || 0) / totalPeriod * 100).toFixed(0)}%` },
          { label: 'Days left', value: '11', sub: 'until period ends' },
        ].map((m, i) => (
          <Card key={i}>
            <div style={{ fontSize: 13, color: t.muted, marginBottom: 4 }}>{m.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.7, lineHeight: 1, marginBottom: 5 }}>{m.value}</div>
            <div style={{ fontSize: 11, color: t.subtle }}>{m.sub}</div>
          </Card>
        ))}
      </div>

      {/* Donut + daily spend */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: ctx.gap, marginBottom: ctx.gap }}>
        <Card>
          <div style={{ fontSize: 13, color: t.muted, marginBottom: 2 }}>By category</div>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.4, marginBottom: 18 }}>${totalPeriod.toFixed(2)}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
            <window.Donut
              segments={Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([cat, v]) => ({ name: catMeta[cat].label, value: v, color: catMeta[cat].color }))}
              size={170} thickness={24} trackColor={t.track}
              label={`$${Math.round(totalPeriod)}`} sublabel="SPENT"
            />
            <div style={{ flex: 1, fontSize: 12 }}>
              {Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([cat, v], i, arr) => {
                const pct = (v / totalPeriod) * 100;
                return (
                  <div key={cat} style={{ display: 'flex', alignItems: 'center', padding: '7px 0', borderBottom: i < arr.length - 1 ? `1px solid ${t.border}` : 'none' }}>
                    <span style={{ width: 10, height: 10, background: catMeta[cat].color, borderRadius: 3, marginRight: 8 }} />
                    <span style={{ color: t.muted, flex: 1 }}>{catMeta[cat].label}</span>
                    <span style={{ fontWeight: 700, marginRight: 10, fontFamily: mono }}>${v.toFixed(0)}</span>
                    <span style={{ color: t.subtle, fontFamily: mono, fontSize: 11, width: 32, textAlign: 'right' }}>{pct.toFixed(0)}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 13, color: t.muted, marginBottom: 2 }}>Daily spend</div>
              <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.4 }}>This period</div>
            </div>
            <div style={{ fontSize: 12, color: t.muted, fontFamily: mono }}>MAX ${Math.max(...dailySpend).toFixed(0)}</div>
          </div>
          {/* Bars */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, height: 160, paddingBottom: 24, position: 'relative' }}>
            {dailySpend.map((amt, i) => {
              const max = Math.max(...dailySpend, 1);
              const h = (amt / max) * 130;
              const days = ['Sat 22', 'Sun 23', 'Mon 24', 'Tue 25', 'Wed 26', 'Thu 27', 'Fri 28'];
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                  {amt > 0 && (
                    <div style={{ fontSize: 10, color: t.muted, fontFamily: mono, marginBottom: 4, fontWeight: 600 }}>${amt.toFixed(0)}</div>
                  )}
                  <div style={{
                    width: '100%', maxWidth: 32, height: Math.max(h, 4),
                    background: amt > 0 ? t.accent : t.track, borderRadius: 6,
                  }} />
                  <div style={{ position: 'absolute', bottom: -22, fontSize: 10, color: t.muted, fontFamily: mono, whiteSpace: 'nowrap' }}>{days[i]}</div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* All purchases table */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 13, color: t.muted, marginBottom: 2 }}>All purchases</div>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.4 }}>{filtered.length} of {recent.length}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Search */}
            <div style={{
              position: 'relative', display: 'flex', alignItems: 'center',
              background: t.card, border: `1px solid ${query ? t.accent : t.border}`,
              borderRadius: 999, padding: '6px 10px 6px 30px',
              transition: 'border-color 0.15s',
              minWidth: 220,
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={query ? t.accent : t.muted}
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}>
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search purchases…"
                style={{
                  flex: 1, background: 'transparent', border: 0, outline: 'none',
                  color: t.text, fontSize: 12.5, fontFamily: 'inherit',
                  padding: 0, minWidth: 0,
                }}
              />
              {query && (
                <button onClick={() => setQuery('')} style={{
                  background: 'transparent', border: 0, padding: 0, marginLeft: 6,
                  color: t.muted, cursor: 'pointer', fontSize: 14, lineHeight: 1,
                  fontFamily: 'inherit',
                }} aria-label="Clear search">×</button>
              )}
            </div>
            <span style={{ fontSize: 11, color: t.muted, fontWeight: 600 }}>Sort</span>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{
              padding: '6px 10px', background: t.card, border: `1px solid ${t.border}`, color: t.text,
              borderRadius: 999, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', outline: 'none',
            }}>
              <option value="date">Date</option>
              <option value="amount">Amount</option>
              <option value="name">Name</option>
            </select>
          </div>
        </div>

        {/* Filter chips */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
          {[{ id: 'all', label: 'All', count: recent.length, color: t.muted }].concat(
            Object.entries(byCat).map(([id, v]) => ({ id, label: catMeta[id].label, count: recent.filter((r) => r.cat === id).length, color: catMeta[id].color, amt: v }))
          ).map((f) => (
            <button key={f.id} onClick={() => setFilter(f.id)} style={{
              padding: '5px 12px', background: filter === f.id ? f.color + '22' : 'transparent',
              border: `1px solid ${filter === f.id ? f.color : t.border}`,
              color: filter === f.id ? f.color : t.muted,
              borderRadius: 999, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              {f.label}
              <span style={{ fontSize: 10, opacity: 0.7, fontFamily: mono }}>{f.count}</span>
            </button>
          ))}
        </div>

        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead>
            <tr style={{ color: t.muted, fontSize: 11, fontWeight: 600, textAlign: 'left' }}>
              <th style={{ padding: '8px 8px 8px 0', fontWeight: 600 }}>WHEN</th>
              <th style={{ padding: '8px 8px', fontWeight: 600 }}>PURCHASE</th>
              <th style={{ padding: '8px 8px', fontWeight: 600 }}>CATEGORY</th>
              <th style={{ padding: '8px 8px', fontWeight: 600 }}>CARD</th>
              <th style={{ padding: '8px 0 8px 8px', fontWeight: 600, textAlign: 'right' }}>AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan="5" style={{
                  padding: '32px 12px', textAlign: 'center', borderTop: `1px solid ${t.border}`,
                  color: t.subtle, fontSize: 13,
                }}>
                  No purchases match <strong style={{ color: t.text }}>"{query}"</strong>
                  {filter !== 'all' && <span> in <strong style={{ color: t.text }}>{catMeta[filter]?.label}</strong></span>}
                  . <button onClick={() => { setQuery(''); setFilter('all'); }} style={{
                    background: 'transparent', border: 0, color: t.accent, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, padding: 0, marginLeft: 4,
                  }}>Clear filters</button>
                </td>
              </tr>
            ) : sorted.map((r, i) => (
              <tr key={i} style={{ fontSize: 13 }}>
                <td style={{ padding: '11px 8px 11px 0', borderTop: `1px solid ${t.border}`, color: t.muted, fontFamily: mono, fontSize: 11.5 }}>{r.when}</td>
                <td style={{ padding: '11px 8px', borderTop: `1px solid ${t.border}`, fontWeight: 500 }}>{r.name}</td>
                <td style={{ padding: '11px 8px', borderTop: `1px solid ${t.border}` }}>
                  <span style={{ padding: '3px 9px', background: catMeta[r.cat].color + '22', color: catMeta[r.cat].color, borderRadius: 999, fontSize: 11, fontWeight: 700 }}>
                    {catMeta[r.cat].label}
                  </span>
                </td>
                <td style={{ padding: '11px 8px', borderTop: `1px solid ${t.border}`, color: t.muted, fontFamily: mono, fontSize: 11.5 }}>{r.card}</td>
                <td style={{ padding: '11px 0 11px 8px', borderTop: `1px solid ${t.border}`, textAlign: 'right', fontFamily: mono, fontWeight: 700 }}>
                  −${r.amount.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// GOALS TAB
// ═══════════════════════════════════════════════════════════════════
function TabGoals({ ctx }) {
  const { t, B, F, mono, accent, accent2, Card, savingsBalances, setSavingsBalances } = ctx;
  const SAVE_RATE = 250;
  const monthsToSave = (price) => Math.ceil(price / SAVE_RATE);

  // Savings goals — full info
  const goals = B.savingsAccounts.map((s) => ({
    ...s,
    goal: s.id === 'tfsa' ? 50000 : s.id === 'fhsa' ? 25000 : s.id === 'crypto' ? 10000 : s.id === 'cc_pay' ? 2000 : 5000,
    balance: savingsBalances[s.id] ?? s.balance,
  }));

  const totalSaved = goals.reduce((a, g) => a + g.balance, 0);
  const totalGoal = goals.reduce((a, g) => a + g.goal, 0);

  return (
    <>
      <TabHeader eyebrow="Goals" title="What you're working toward"
        ctx={ctx}
        right={
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{ padding: '9px 16px', background: t.card, border: `1px solid ${t.border}`, borderRadius: 999, fontSize: 12, color: t.text, cursor: 'pointer', fontWeight: 600 }}>+ Add wishlist item</button>
            <button style={{ padding: '9px 16px', background: t.accent, color: '#fff', border: 0, borderRadius: 999, fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>+ New savings goal</button>
          </div>
        } />

      {/* Savings goals — full grid with prominent balance + edit */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10, paddingLeft: 2 }}>
        <div>
          <div style={{ fontSize: 13, color: t.muted, marginBottom: 2 }}>Savings goals</div>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.4 }}>
            ${Math.round(totalSaved).toLocaleString()} <span style={{ color: t.muted, fontSize: 13, fontWeight: 500 }}>/ ${totalGoal.toLocaleString()} target</span>
          </div>
        </div>
        <span style={{ fontSize: 12, color: t.muted }}>{((totalSaved / totalGoal) * 100).toFixed(0)}% overall</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: ctx.gap, marginBottom: ctx.gap * 2 }}>
        {goals.map((g, i) => {
          const pct = (g.balance / g.goal) * 100;
          const remaining = g.goal - g.balance;
          const months = remaining > 0 ? Math.ceil(remaining / g.alloc) : 0;
          return (
            <Card key={g.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{g.name}</div>
                  <div style={{ fontSize: 11, color: t.muted, marginTop: 2, fontFamily: mono }}>+${g.alloc}/mo auto</div>
                </div>
                <button style={{
                  padding: '4px 10px', background: 'transparent', border: `1px solid ${t.border}`,
                  borderRadius: 999, fontSize: 10.5, fontWeight: 700, cursor: 'pointer', color: t.muted, fontFamily: 'inherit',
                }}>Edit</button>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 12 }}>
                <span style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.8 }}>${g.balance.toLocaleString()}</span>
                <span style={{ fontSize: 13, color: t.muted, fontWeight: 500 }}>/ ${g.goal.toLocaleString()}</span>
              </div>
              <window.ProgressBar value={g.balance} max={g.goal} color={i % 2 === 0 ? t.accent : accent2} trackColor={t.track} height={6} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: mono, marginTop: 6 }}>
                <span style={{ color: t.muted }}>{pct.toFixed(0)}% complete</span>
                <span style={{ color: t.muted }}>{months > 0 ? `~${months} mo left` : '✓ funded'}</span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Wishlist section */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10, paddingLeft: 2 }}>
        <div>
          <div style={{ fontSize: 13, color: t.muted, marginBottom: 2 }}>Wishlist</div>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.4 }}>
            ${B.wishlist.reduce((a, w) => a + w.est, 0).toLocaleString()} <span style={{ color: t.muted, fontSize: 13, fontWeight: 500 }}>· at $250/mo savings rate</span>
          </div>
        </div>
        <span style={{ fontSize: 12, color: t.muted }}>{B.wishlist.length} items</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: ctx.gap, marginBottom: ctx.gap }}>
        {B.wishlist.map((w, i) => {
          const months = monthsToSave(w.est);
          const progress = Math.min(1, (i + 1) * 0.18);
          const saved = Math.round(progress * w.est);
          return (
            <Card key={w.id} style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12, background: t.accentSoft,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: t.accent, fontSize: 22, fontWeight: 700,
                }}>{w.icon}</div>
                <span style={{
                  fontSize: 10.5, padding: '4px 10px',
                  background: months <= 6 ? accent2 : ctx.isDark ? t.cardAlt : '#f3f4f7',
                  color: months <= 6 ? '#3a4500' : t.muted,
                  borderRadius: 999, fontWeight: 700, fontFamily: mono, letterSpacing: 0.3,
                }}>~{months} mo</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8, lineHeight: 1.35, minHeight: 36 }}>{w.name}</div>
              <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.6, marginBottom: 10 }}>${w.est.toLocaleString()}</div>
              <window.ProgressBar value={saved} max={w.est} color={t.accent} trackColor={t.track} height={4} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: t.muted, fontFamily: mono, marginTop: 6 }}>
                <span>${saved.toLocaleString()} saved</span>
                <span>{(progress * 100).toFixed(0)}%</span>
              </div>
              <button style={{
                marginTop: 12, width: '100%', padding: '6px', background: 'transparent',
                border: `1px solid ${t.border}`, borderRadius: 8, fontSize: 11, fontWeight: 600,
                color: t.muted, cursor: 'pointer', fontFamily: 'inherit',
              }}>+ Allocate funds</button>
            </Card>
          );
        })}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SETTINGS TAB
// ═══════════════════════════════════════════════════════════════════
function TabSettings({ ctx }) {
  const { t, B, mono, accent, accent2, Card } = ctx;
  const [budgetSplit, setBudgetSplit] = useStateT({ needs: 50, wants: 30, savings: 20 });
  const [notifications, setNotifications] = useStateT({
    overspend: true, billDue: true, weeklySummary: false, payday: true,
  });

  const Section = ({ title, subtitle, children }) => (
    <Card style={{ marginBottom: ctx.gap }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: -0.3 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: t.muted, marginTop: 2 }}>{subtitle}</div>}
      </div>
      {children}
    </Card>
  );

  const Field = ({ label, value, mono: m, sub }) => (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '12px 0', borderBottom: `1px solid ${t.border}`,
    }}>
      <div>
        <div style={{ fontSize: 12, color: t.muted, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 14, fontFamily: m ? mono : 'inherit', fontWeight: 500 }}>{value}</div>
        {sub && <div style={{ fontSize: 11, color: t.subtle, marginTop: 2 }}>{sub}</div>}
      </div>
      <button style={{
        padding: '5px 12px', background: 'transparent', border: `1px solid ${t.border}`,
        borderRadius: 999, fontSize: 11, fontWeight: 600, cursor: 'pointer', color: t.muted, fontFamily: 'inherit',
      }}>Edit</button>
    </div>
  );

  const Toggle = ({ label, sub, on, onChange }) => (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '12px 0', borderBottom: `1px solid ${t.border}`,
    }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: t.muted, marginTop: 2 }}>{sub}</div>}
      </div>
      <button onClick={() => onChange(!on)} style={{
        width: 38, height: 22, borderRadius: 999, border: 0, padding: 0, position: 'relative',
        background: on ? t.accent : t.track, cursor: 'pointer', transition: 'background 0.15s',
      }}>
        <span style={{
          position: 'absolute', top: 2, left: on ? 18 : 2, width: 18, height: 18,
          background: '#fff', borderRadius: 999, transition: 'left 0.15s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }} />
      </button>
    </div>
  );

  const splitTotal = budgetSplit.needs + budgetSplit.wants + budgetSplit.savings;
  const splitOk = splitTotal === 100;

  return (
    <>
      <TabHeader eyebrow="Settings" title="Configure A Penny For Our Thoughts" ctx={ctx} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: ctx.gap, alignItems: 'flex-start' }}>
        <div>
          <Section title="Profile" subtitle="Identity and locale">
            <Field label="Name" value="Brahim Mahadi" />
            <Field label="Email" value="brahim@penny.app" />
            <Field label="Currency" value="CAD · Canadian Dollar" />
            <Field label="Timezone" value="America/Toronto" sub="UTC−05:00" />
          </Section>

          <Section title="Budget rules" subtitle="The 50/30/20 split. Adjust if your situation calls for it.">
            {[
              { id: 'needs', label: 'Needs', desc: 'Rent, groceries, transport, insurance', color: t.danger },
              { id: 'wants', label: 'Wants', desc: 'Dining, subs, hobbies', color: t.accent },
              { id: 'savings', label: 'Savings', desc: 'Investments, FHSA, TFSA', color: accent2 },
            ].map((b) => (
              <div key={b.id} style={{ marginBottom: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{b.label}</span>
                    <span style={{ fontSize: 11, color: t.muted, marginLeft: 8 }}>{b.desc}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <input type="number" min="0" max="100" value={budgetSplit[b.id]}
                      onChange={(e) => setBudgetSplit({ ...budgetSplit, [b.id]: parseInt(e.target.value) || 0 })}
                      style={{
                        width: 50, padding: '4px 8px', fontSize: 14, fontFamily: mono, fontWeight: 700,
                        border: `1px solid ${t.border}`, background: t.card, color: t.text,
                        borderRadius: 6, outline: 'none', textAlign: 'right',
                      }} />
                    <span style={{ fontSize: 12, color: t.muted, fontFamily: mono }}>%</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="range" min="0" max="100" value={budgetSplit[b.id]}
                    onChange={(e) => setBudgetSplit({ ...budgetSplit, [b.id]: parseInt(e.target.value) })}
                    style={{ flex: 1, accentColor: b.color }} />
                  <span style={{ fontSize: 11, color: t.muted, fontFamily: mono, minWidth: 60, textAlign: 'right' }}>
                    ${(B.income.monthly * budgetSplit[b.id] / 100).toFixed(0)}
                  </span>
                </div>
              </div>
            ))}
            <div style={{
              marginTop: 8, padding: 10, borderRadius: 10,
              background: splitOk ? t.success + '15' : t.danger + '15',
              color: splitOk ? t.success : t.danger, fontSize: 12, fontWeight: 600,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              fontFamily: mono, letterSpacing: 0.3,
            }}>
              <span>TOTAL · {splitTotal}%</span>
              <span>{splitOk ? '✓ ADDS UP TO 100%' : `OFF BY ${splitTotal - 100}%`}</span>
            </div>
          </Section>
        </div>

        <div>
          <Section title="Income sources" subtitle="2 streams · $3,551.64 / mo">
            {B.income.streams.map((s, i) => (
              <div key={s.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 0', borderBottom: i < B.income.streams.length - 1 ? `1px solid ${t.border}` : 'none',
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: t.muted, marginTop: 2, fontFamily: mono }}>{s.schedule}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 14, fontFamily: mono, fontWeight: 700 }}>${s.amount.toFixed(2)}</span>
                  <button style={{
                    padding: '4px 10px', background: 'transparent', border: `1px solid ${t.border}`,
                    borderRadius: 999, fontSize: 11, fontWeight: 600, cursor: 'pointer', color: t.muted, fontFamily: 'inherit',
                  }}>Edit</button>
                </div>
              </div>
            ))}
            <button style={{
              marginTop: 12, width: '100%', padding: '8px', background: 'transparent',
              border: `1px dashed ${t.border}`, borderRadius: 10, fontSize: 12, fontWeight: 600,
              color: t.muted, cursor: 'pointer', fontFamily: 'inherit',
            }}>+ Add income source</button>
          </Section>

          <Section title="Connected cards" subtitle={`${B.cards.length} cards · ${B.creditCards.length} credit`}>
            {[...B.cards.map((c) => ({ name: c.name, last: '••' + c.id.slice(-4), type: c.type })), ...B.creditCards.map((c) => ({ name: c.name, last: '••' + c.last, type: 'credit' }))].slice(0, 5).map((c, i, arr) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 0', borderBottom: i < arr.length - 1 ? `1px solid ${t.border}` : 'none',
              }}>
                <div style={{
                  width: 32, height: 22, borderRadius: 4,
                  background: c.type === 'credit' ? accent2 : t.accent,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: c.type === 'credit' ? '#3a4500' : '#fff', fontSize: 10, fontWeight: 700,
                }}>{c.type === 'credit' ? 'CC' : 'DB'}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: t.muted, fontFamily: mono }}>{c.last}</div>
                </div>
                <button style={{
                  padding: '4px 10px', background: 'transparent', border: `1px solid ${t.border}`,
                  borderRadius: 999, fontSize: 11, fontWeight: 600, cursor: 'pointer', color: t.muted, fontFamily: 'inherit',
                }}>Manage</button>
              </div>
            ))}
          </Section>

          <Section title="Notifications" subtitle="When should Penny ping you?">
            <Toggle label="Over-budget alert" sub="When a category exceeds its limit" on={notifications.overspend} onChange={(v) => setNotifications({ ...notifications, overspend: v })} />
            <Toggle label="Upcoming bills" sub="3 days before each bill is due" on={notifications.billDue} onChange={(v) => setNotifications({ ...notifications, billDue: v })} />
            <Toggle label="Weekly summary" sub="Sunday morning, your week in numbers" on={notifications.weeklySummary} onChange={(v) => setNotifications({ ...notifications, weeklySummary: v })} />
            <Toggle label="Payday" sub="The morning income hits your account" on={notifications.payday} onChange={(v) => setNotifications({ ...notifications, payday: v })} />
          </Section>

          <Section title="Display" subtitle="How Penny looks">
            <Field label="Theme" value="System default" sub="Light during day, dark at night" />
            <Field label="Accent color" value="Vivid violet" />
            <Field label="Number style" value="Compact ($12.3k)" />
          </Section>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { TabSchedule, TabSpending, TabGoals, TabSettings });
