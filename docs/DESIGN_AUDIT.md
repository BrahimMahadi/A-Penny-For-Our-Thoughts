# Design Audit — Current State vs. Bloomberg-Style Vision

## Current Design Assessment

### ✅ What's Working Well
- **Color Scheme**: Dark theme (navy/purple/teal) and light theme implemented
- **Grid System**: Responsive 4/3/2-column grids for different layouts
- **Component Library**: Consistent card, button, input, chip styles
- **Spacing**: Good default padding/margins with consistent 8px base unit
- **Responsive**: Mobile breakpoints at 1024px, 768px, 540px, 380px
- **Accessibility**: Proper border-color focus states, good color contrast mostly

### ⚠️ Areas for Bloomberg-Style Enhancement

| Area | Current | Bloomberg-Style Goal | Impact |
|------|---------|----------------------|--------|
| **Typography** | 'Segoe UI' system font | Professional serif + clean sans-serif | Medium — more sophisticated feel |
| **Visual Hierarchy** | Even importance for all cards | KPIs prominent at top | High — answers "Am I on track?" first |
| **Layout** | Standard grid layout | Information-dense metrics bar | Medium — better scannability |
| **Data Visualization** | Basic Chart.js styling | Professional charts with clear labels | Medium — increased clarity |
| **Spacing** | Consistent but neutral | Intentional white space + density | Low — refinement |
| **Color Depth** | Flat colors | More subtle grays, better contrast | Low — polish |
| **Form UX** | Basic input styling | Professional form fields with clear states | Medium — better interaction |

---

## Design Direction: Bloomberg Terminal-Inspired

### Target Aesthetic
- **Professional**: Data-focused, serious about numbers, business-oriented
- **Information-Dense**: More metrics visible at once, less wasted space
- **High Contrast**: Text readable on any background, accessibility priority
- **Sophisticated**: Refined typography, subtle shading, intentional spacing
- **Metric-Focused**: KPIs and key numbers emphasized over other information

### Reference Inspirations
- **Bloomberg Terminal**: Dense, professional, metric-heavy
- **Stripe Dashboard**: Clean modern design with professional typography
- **TradingView**: Chart-focused interface, clear data visualization

---

## Typography Plan

### Current: System Default
- Font: 'Segoe UI', system-ui, sans-serif
- No distinction between headers and body text
- Limited visual hierarchy

### New System (Bloomberg-Inspired)

#### Display Font (Headlines, Large Numbers)
- **Recommendation**: Georgia, Garamond, or serif display font
- **Why**: Professional, trustworthy, Bloomberg-like
- **Fallback**: serif (system serif)
- **Use Cases**: Large metric numbers, section headings, emphasis

#### Body Font (Text, Labels, UI)
- **Recommendation**: Keep clean sans-serif but upgrade
- **Candidate**: -apple-system, BlinkMacSystemFont, Segoe UI, system-ui
- **Why**: Modern, readable, clean
- **Use Cases**: Card text, labels, input fields, descriptions

#### Type Scale
```
h1 (Large metrics):  32px, serif, 800 weight
h2 (Section titles): 24px, serif, 700 weight
h3 (Card values):    26px, serif, 800 weight
h4 (Card titles):    12px, sans-serif, 700 weight (uppercase)
body:                14px, sans-serif, 400 weight
small:               12px, sans-serif, 400 weight
label:               13px, sans-serif, 600 weight
```

---

## Color System Refinement

### Current Palette
```
Accent (Primary):    #6c63ff (purple)
Accent2 (Success):   #00d4aa (teal)
Danger (Alert):      #ff4d6d (red)
Warn (Caution):      #ffa63d (orange)
```

### Enhanced Bloomberg Palette
```
Primary Accent:      #6c63ff (keep, good for data)
Success/On-track:    #00d4aa (keep, good for goals)
Warning:             #ffa63d (keep, good for caution)
Danger/Over:         #ff4d6d (keep, good for alert)
Neutral Grays:       More refined scale (dark → light)
```

### Dark Theme Refinement
```
Current → Proposed

--bg:           #0f1117 → #0a0e1a (slightly darker, more professional)
--surface:      #1a1d27 → #1a2332 (card background, slightly warmer)
--surface2:     #22263a → #252f3f (secondary surface, more contrast)
--accent:       #6c63ff (keep)
--accent2:      #00d4aa (keep)
--danger:       #ff4d6d (keep)
--warn:         #ffa63d (keep)
--text:         #e8eaf0 (keep, good contrast)
--muted:        #7b8199 → #8b95ad (slightly lighter for better hierarchy)
--border:       #2e3148 → #3a4456 (more visible, cleaner separations)
```

---

## Layout Reorganization

### Current Dashboard Structure
```
1. Section Title: "Income Overview"
2. Income Stat Cards (4 column grid)
3. Budget Allocation Bar
4. Income Streams (CRUD list)
5. ... more sections follow
```

### Bloomberg-Style Structure (Proposed)

#### Top: Key Metrics Bar (NEW)
- **Prominence**: Large, clearly visible
- **Content**: 4-6 primary KPIs:
  - Total Monthly Income (largest)
  - Needs Budget Remaining
  - Wants Budget Remaining / Spent
  - Savings Progress
  
#### Middle: Visual Analytics
- Budget Allocation Bar (visual split)
- Charts (wants donut, credit utilization, analytics)
- Trend indicators

#### Bottom: Detailed Data
- Lists (income streams, expenses, transactions)
- CRUD forms
- Detailed analytics

### Mobile Adaptation
- Stack metrics vertically, emphasize largest number
- Reduce columns in grids
- Full-width inputs

---

## Chart Styling Upgrades

### Current Chart.js Usage
- 4 active charts (wants donut, CC bar, analytics line, analytics bar)
- Chart.js default styling
- Basic labels and legends

### Proposed Enhancements
- Professional font in charts (match body font)
- Clearer data labels on chart elements
- Better legend positioning (bottom, horizontal)
- Tooltip styling to match theme
- Color consistency with status indicators
- Remove unnecessary gridlines or make them subtle

---

## Form & Input Refinement

### Current Input Styling
```css
border: 1px solid var(--border);
border-radius: 8px;
padding: 8px 12px;
font-size: 13px;
```

### Enhanced Styling (Professional)
```css
/* Add subtle background distinction */
background: var(--surface2);
border: 1px solid var(--border);
border-radius: 6px;
padding: 10px 14px;
font-size: 13px;

/* Focus state: clear visual feedback */
focus: border-color: var(--accent), box-shadow: inset 0 0 0 3px rgba(108, 99, 255, 0.1)

/* Validation states: inline feedback */
:invalid: border-color: var(--danger)
:valid: border-color: var(--accent2)
```

---

## Accessibility & Contrast

### Current State
- Most colors meet WCAG AA (4.5:1) minimum
- Some elements may be close to threshold

### Audit Checklist
- [ ] Text on all backgrounds: 4.5:1 minimum (WCAG AA)
- [ ] Large text (18pt+): 3:1 minimum (WCAG AA)
- [ ] Interactive elements: 3:1 minimum for visual focus
- [ ] Color not sole indicator of status (use text labels too)
- [ ] Touch targets: 44px minimum (mobile)

---

## Implementation Roadmap

### Step 1: Typography System (Week 1, Early)
- [ ] Import professional serif font (Google Fonts optional)
- [ ] Define type scale in CSS variables
- [ ] Update all text elements
- [ ] Test readability across devices

### Step 2: Color Refinement (Week 1)
- [ ] Refine CSS variables for neutral grays
- [ ] Update dark/light theme palettes
- [ ] Test contrast ratios
- [ ] Verify status colors (green/amber/red) are distinct

### Step 3: Layout Reorganization (Week 1-2)
- [ ] Identify top 4-6 KPIs for prominence
- [ ] Redesign metrics bar (larger, emphasized)
- [ ] Reorder dashboard sections
- [ ] Update mobile layout (stack vertically)

### Step 4: Chart & Visualization Upgrades (Week 2)
- [ ] Update Chart.js styling
- [ ] Add data labels
- [ ] Improve legends and tooltips
- [ ] Test both dark and light themes

### Step 5: Form & Input Polish (Week 2)
- [ ] Add focus and validation states
- [ ] Improve placeholder text contrast
- [ ] Test keyboard navigation
- [ ] Mobile input sizing (44px min)

### Step 6: Testing & QA (Week 3)
- [ ] Color contrast verification (WCAG AA)
- [ ] Mobile device testing
- [ ] Theme persistence testing
- [ ] User feedback collection

---

## Before/After Comparison

### Metric Card (Before)
```html
<div class="card accent">
  <div class="card-title">Total Monthly Income</div>
  <div class="card-value" id="disp-income">—</div>
  <div class="card-sub" id="disp-income-sub">from all streams</div>
</div>
```
- Small, equal importance with other cards
- System font, no visual emphasis

### Metric Card (After - Bloomberg-Style)
```html
<div class="card accent kpi-card">
  <div class="card-title">TOTAL MONTHLY INCOME</div>
  <div class="card-value serif">$4,500.00</div>
  <div class="card-sub">from 2 streams</div>
</div>
```
- Larger, emphasized prominently
- Professional serif font for big number
- Clear hierarchy: title → value → detail

---

## Success Criteria

### Phase 0 Complete When:
- ✅ Professional typography system implemented
- ✅ All metrics prominently displayed (KPIs at top)
- ✅ Chart styling upgraded and professional
- ✅ Form inputs clear and professional
- ✅ Color contrast verified (WCAG AA minimum)
- ✅ Mobile layouts tested and optimized
- ✅ User feedback collected and positive
- ✅ No regressions in existing functionality

---

## Design System Variables (Updated)

### CSS Variables to Update
```css
:root {
  /* Typography */
  --font-display:    'Georgia', serif;
  --font-body:       'Segoe UI', system-ui, sans-serif;
  --font-size-base:  14px;
  --font-size-sm:    12px;
  --font-size-lg:    16px;
  --font-size-xl:    20px;
  --font-size-2xl:   26px;
  --font-size-3xl:   32px;
  
  /* Spacing */
  --space-xs:  4px;
  --space-sm:  8px;
  --space-md:  12px;
  --space-lg:  16px;
  --space-xl:  20px;
  --space-2xl: 28px;
  
  /* Colors (refined) */
  --bg:           #0a0e1a;
  --surface:      #1a2332;
  --surface2:     #252f3f;
  --accent:       #6c63ff;
  --accent2:      #00d4aa;
  --danger:       #ff4d6d;
  --warn:         #ffa63d;
  --text:         #e8eaf0;
  --muted:        #8b95ad;
  --border:       #3a4456;
  
  /* Effects */
  --radius:       8px;
  --card-shadow:  0 4px 24px rgba(0,0,0,.35);
  --transition:   background .25s, color .25s, border-color .25s, box-shadow .25s;
}
```

---

**Last Updated**: May 12, 2026  
**Phase**: Phase 0 (Design & Visual Polish)  
**Next Step**: Begin implementing typography and color system updates
