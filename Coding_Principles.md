# Coding Principles for A Penny For Our Thoughts

This document defines the foundational principles, patterns, and standards that guide all development on the A Penny For Our Thoughts financial dashboard application. These principles ensure code quality, maintainability, security, and optimal user experience.

## 1. Code Quality & Readability

### 1.1 Naming Conventions
- **JavaScript files and variables:** Use `camelCase` (e.g., `openAddCreditCard`, `savingsAvailable`)
- **HTML ids and classes:** Use `kebab-case` (e.g., `#modal-overlay`, `.stat-card`)
- **CSS custom properties (variables):** Use `--kebab-case` (e.g., `--color-accent`, `--spacing-unit`)
- **Function names:** Start with action verb (e.g., `render*`, `open*`, `toggle*`, `validate*`, `calculate*`)
- **Constants:** Use `UPPER_SNAKE_CASE` (e.g., `DEFAULT_STATE`, `MAX_ITEMS`)
- **Boolean variables/functions:** Prefix with `is`, `has`, `can`, `should` (e.g., `isVisible`, `hasError`)

### 1.2 Code Organization
- **Maximum function length:** 50 lines for single-responsibility functions; complex logic should be decomposed
- **Maximum lines per file:** Maintain files under 1000 lines; refactor large files into logical sections
- **Function groups:** Organize related functions together with section comments: `// --- CRUD Operations ---`
- **Parameter order:** Required parameters first, then optional parameters with defaults
- **Vertical spacing:** Separate logical sections with blank lines; group related statements together

### 1.3 Comments & Documentation
- **Function headers:** Every function must have a JSDoc-style comment block with description, parameters, and return type
- **Complex logic:** Add inline comments explaining *why* not *what*; the code should show what it does
- **TODO/FIXME markers:** Use format `// TODO: [description]` or `// FIXME: [description]` for future work
- **Module headers:** Each file should have a header comment with: Module Name, Date, Creator, Summary, Key Functions
- **Avoid redundant comments:** Comments explaining obvious code (e.g., `i++  // increment i`) are noise

### 1.4 DRY Principle (Don't Repeat Yourself)
- Extract repeated code patterns into helper functions
- Use template literals for dynamic strings instead of concatenation
- Leverage `Array.map()`, `Array.filter()`, `Array.find()` instead of manual loops
- Create reusable modal/form generation functions (e.g., `mField()` for consistent form elements)
- Share validation logic across similar operations (add, edit, delete)

## 2. Architecture & State Management

### 2.1 Single Source of Truth
- **State object:** All application data lives in the `state` object in memory
- **State shape:** Defined in `DEFAULT_STATE` at initialization
- **Immutability approach:** Never mutate state directly; always create new objects/arrays for complex updates
- **State consistency:** After any state modification, call `saveToStorage()` immediately, then call relevant render function(s)
- **Forward compatibility:** When adding new state properties, include checks in `loadFromStorage()` to initialize missing properties with defaults

### 2.2 Data Persistence
- **Storage key:** Use `penny_state_v2` for main application state, `penny_theme` for theme preference
- **Save strategy:** Every mutation calls `saveToStorage()` to prevent data loss; state is the authority over localStorage
- **Load strategy:** `loadFromStorage()` runs at app initialization and merges persisted state with DEFAULT_STATE defaults
- **Backup approach:** Keep DEFAULT_STATE as fallback; if localStorage is corrupted, app falls back to defaults and user can re-enter data

### 2.3 Functional Rendering
- **Render functions:** Each major section has a dedicated `render*()` function (e.g., `renderIncome()`, `renderWants()`)
- **Idempotent rendering:** Render functions can be called multiple times with same result; they clear and rebuild DOM sections
- **Data flow:** State → Render function → DOM (never update DOM directly; always go through render functions)
- **Minimal re-renders:** Only call render functions for sections that actually changed to maintain performance
- **Chart updates:** Destroy existing Chart instances and recreate them when data changes to avoid conflicts

### 2.4 ID Generation & Management
- **ID function:** Use `genId()` to create stable, unique identifiers for all data items
- **Format:** IDs should be simple strings or numbers; avoid complex objects or function references
- **Stability:** IDs must persist across sessions and never change for the same item
- **Lookup:** Use `Array.find(item => item.id === targetId)` for reliable item retrieval

## 3. User Interface & Interaction

### 3.1 Modal System
- **Modal pattern:** Use centralized `#modal-overlay` with `openModal(title, bodyHTML, onSaveCallback)` function
- **Form generation:** Build modal forms with `mField(label, id, type, value, placeholder, extraAttrs)` helper for consistency
- **Modal closure:** Clicking outside modal or Cancel button closes it; clicking Save triggers `onSaveCallback`
- **Validation:** Perform validation in `onSaveCallback` before saving state; show user-friendly error messages
- **Accessibility:** Modal should include focus trap and keyboard support (Escape to close)

### 3.2 Button & Control Patterns
- **Action buttons:** Use onclick handlers with clear function names: `onclick="toggleBudgetMode('needs')"`
- **Confirmation dialogs:** For destructive actions (delete), use `confirm()` with clear, specific message
- **Loading states:** Disable buttons and show spinner during async operations
- **Touch targets:** Ensure minimum 44px height for buttons/inputs on mobile (540px breakpoint and below)
- **Visual feedback:** Hover states, active states, and disabled states should be visually distinct

### 3.3 Forms & Input Validation
- **Input validation:** Validate on blur for individual fields, on submit for entire form
- **Error display:** Show inline error messages next to invalid fields, not in alerts
- **Field grouping:** Organize related inputs together; use fieldset for logical grouping
- **Default values:** Pre-fill forms with current values during edit operations
- **Required indicators:** Clearly mark required fields with asterisk or "required" label

### 3.4 Layout & Spacing
- **CSS variables:** Use project CSS variables for colors, spacing, fonts (`--color-*`, `--spacing-*`)
- **Consistency:** Maintain consistent spacing between sections using standard margin/padding values
- **Alignment:** Use flexbox for flexible layouts; use CSS Grid for complex multi-item layouts
- **Overflow handling:** Ensure long text truncates gracefully or wraps appropriately

## 4. Responsive Design & Mobile

### 4.1 Breakpoints & Layouts
- **1024px (tablets):** 3-column grids; full header; all sidebar content visible
- **768px (tablets):** 2-column grids; header slightly optimized; hide non-critical metadata
- **540px (phones):** 1-column layout; single row for critical stats; hide optional columns
- **380px (small phones):** Extra-tight spacing; truncate less-important text; stack everything vertically
- **Mobile-first approach:** Start with 380px layout, progressively enhance for larger screens

### 4.2 Touch-Friendly Design
- **Minimum touch target:** 44px height/width for all buttons and interactive elements on mobile
- **Spacing:** Increase spacing between interactive elements on touch devices to avoid mis-taps
- **Gesture support:** Swipe for navigation/dismiss where appropriate; avoid hover-dependent functionality
- **Zoom:** Allow pinch-to-zoom on mobile; do not disable with `user-scalable=no`

### 4.3 Performance on Mobile
- **Image optimization:** Serve appropriately-sized images; use srcset for responsive images
- **Script efficiency:** Minimize JavaScript bundle size; lazy-load non-critical scripts
- **Chart performance:** Use Chart.js efficiently; limit number of data points in charts on mobile
- **Network awareness:** Handle slow connections gracefully; show loading states for async operations

## 5. Theming & Styling

### 5.1 Dark/Light Theme Support
- **CSS variables:** Theme colors defined as CSS custom properties (--color-bg, --color-text, etc.)
- **Theme switching:** Toggle via button in header; persisted in localStorage under `penny_theme`
- **Color palette:** Dark theme (default) and light theme with accessible contrast ratios
- **Smooth transitions:** Apply `transition: all 0.3s ease` globally when switching themes
- **Icon support:** Use Unicode emoji or SVG icons that are visible in both themes

### 5.2 Color & Contrast
- **Contrast ratio:** Minimum 4.5:1 for text on background (WCAG AA standard)
- **Color meaning:** Don't rely solely on color to convey meaning; use text/icons/patterns
- **Semantic colors:** Use consistent colors for status: green (success), red (danger), orange (warning), blue (info)
- **Accessibility:** Test designs with color blindness simulators; provide text alternatives

## 6. Security & Privacy

### 6.1 Data Protection
- **Local storage only:** Financial data stored only in browser's localStorage; no cloud transmission without explicit user action
- **No sensitive data in console:** Avoid logging passwords, tokens, or sensitive amounts in development
- **Input sanitization:** Escape user input in HTML to prevent XSS attacks
- **Numeric validation:** Validate all amounts as non-negative numbers; prevent negative budgets

### 6.2 User Privacy
- **Data minimization:** Only collect/store data necessary for application function
- **No tracking:** Do not use analytics that track user behavior without explicit consent
- **Clear data handling:** Document how data is stored, used, and can be deleted
- **Local control:** Provide UI for users to export, backup, or delete all their data

## 7. Error Handling & Validation

### 7.1 Exception Handling
- **Try-catch blocks:** Wrap risky operations (localStorage access, JSON parsing) in try-catch
- **Graceful degradation:** If operation fails, log error and show user-friendly message
- **Error recovery:** Provide path to recover from errors (retry, clear data, restore from backup)
- **No silent failures:** Always inform user if something went wrong; never fail silently

### 7.2 Input Validation
- **Type checking:** Validate data types (number, string) before using
- **Range validation:** Check numeric inputs are within acceptable ranges (positive amounts, percentages 0-100)
- **Format validation:** Email, date, and URL formats validated before storing
- **Required fields:** Prevent empty required fields from being saved
- **Consistent validation:** Same validation rules applied everywhere same data is entered

### 7.3 Console Errors
- **No console errors:** Application should run without console errors in production
- **Dev warnings:** Warning messages for recoverable issues; errors for critical problems
- **Debugging info:** During development, log intermediate values to debug complex logic

## 8. Testing & Quality Assurance

### 8.1 Manual Testing Checklist
- **Theme toggle:** Verify light/dark theme switches correctly and persists across sessions
- **Mobile responsiveness:** Test at 380px, 540px, 768px, 1024px breakpoints
- **Form interactions:** Test add, edit, delete operations for each data type
- **Data persistence:** Verify state saves to localStorage and reloads correctly on page refresh
- **Error cases:** Test with empty inputs, invalid data, extreme values
- **Browser compatibility:** Test in latest versions of Chrome, Firefox, Safari, Edge

### 8.2 Code Review Focus Areas
- **State consistency:** Verify state modifications followed by `saveToStorage()` and render call
- **Function single-responsibility:** Each function does one thing; complex logic decomposed
- **Naming clarity:** Function and variable names make code intent obvious
- **Comment quality:** Comments explain *why*, not what; no redundant comments
- **Performance:** No unnecessary re-renders; efficient data structure usage

## 9. Performance Optimization

### 9.1 Rendering Efficiency
- **Selective rendering:** Only call render functions for modified sections, not entire app
- **Chart optimization:** Reuse Chart instances when possible; destroy and recreate only when data structure changes
- **DOM manipulation:** Use efficient DOM methods; batch multiple DOM changes together
- **Event delegation:** Use event delegation for dynamic content rather than individual listeners

### 9.2 Memory Management
- **Chart cleanup:** Destroy Chart.js instances before removing from DOM to prevent memory leaks
- **Event listener cleanup:** Remove event listeners when elements are removed from DOM
- **Large data sets:** Consider pagination or virtualization for lists with 100+ items
- **Avoid global variables:** Keep scope tight; minimize global state beyond main `state` object

### 9.3 Load Time
- **Lazy loading:** Load charts and non-critical features after initial page load
- **Minification:** Minify CSS and JavaScript in production builds
- **Asset caching:** Leverage browser caching for static resources
- **Critical path:** Load essential HTML and styles before JavaScript

## 10. Git & Version Control

### 10.1 Commit Practices
- **Atomic commits:** Each commit represents one logical change (add feature, fix bug, refactor)
- **Clear messages:** Commit message format: `[Type] Brief description` (e.g., `[Feature] Add credit card CRUD`)
- **Frequency:** Commit frequently; avoid large monolithic commits
- **Testing before commit:** Verify feature works and no console errors before committing

### 10.2 Branch Strategy
- **Feature branches:** Create branch for each feature: `feature/credit-card-management`
- **Bug fix branches:** Create branch for fixes: `fix/wants-tracker-calculation`
- **Branch naming:** Use lowercase with hyphens, descriptive names (not `fix-stuff`)
- **Pull requests:** Use PRs for code review before merging to main

## 11. Documentation & Handoff

### 11.1 Project Documentation
- **README.md:** Overview, setup instructions, feature list, technology stack
- **Penny_Project_Guide.md:** Detailed feature descriptions, state schema, architecture notes
- **CLAUDE.md:** AI assistant instructions and coding style guidelines
- **Coding_Principles.md:** (This file) Standards and best practices
- **Inline comments:** Complex logic documented in code

### 11.2 Handoff Information
- **State schema:** Complete definition of all state properties and their structures
- **File organization:** Clear explanation of which file handles which responsibility
- **API documentation:** If using external APIs, document endpoints, parameters, response formats
- **Known limitations:** Document any workarounds, hacks, or deferred improvements

## 12. Project-Specific Standards

### 12.1 File Structure
- **dashboard.html:** HTML structure, layout, all section markup, modal template
- **app.js:** All application logic, state management, CRUD operations, rendering
- **styles.css:** All visual styling, responsive breakpoints, theme variables
- **Penny_Project_Guide.md:** Feature documentation, state schema, architecture reference
- **No build step:** This is vanilla JavaScript; no compilation or bundling required

### 12.2 Data Operations (CRUD)
- **Create:** Open modal with form fields using `mField()`, validate on save, call `saveToStorage()`, re-render
- **Read:** Use `Array.find()` or `Array.filter()` to retrieve items by ID or criteria
- **Update:** Modify item in state array, call `saveToStorage()`, re-render affected section
- **Delete:** Show confirmation dialog, filter item from array, call `saveToStorage()`, re-render

### 12.3 External Dependencies
- **Chart.js 4.4.1:** Loaded from Cloudflare CDN; used for wants tracker (doughnut) and credit cards (bar) charts
- **No other dependencies:** All other functionality built with vanilla JavaScript, HTML, CSS
- **Compatibility:** Target modern browsers (Chrome, Firefox, Safari, Edge latest versions)

---

**Last Updated:** May 12, 2026  
**Status:** Active Development Principles Document
