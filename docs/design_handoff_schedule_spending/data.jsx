// data.jsx — Brahim's real budget numbers from the project brief
// All values from "A Penny For Our Thoughts.md"

const BUDGET = {
  user: { name: 'Brahim', initials: 'B' },
  income: {
    monthly: 3551.64,
    streams: [
      { id: 'gov_a', name: 'Government · Stream A', amount: 1775.82, schedule: 'Bi-weekly · Thursdays' },
      { id: 'gov_b', name: 'Government · Stream B', amount: 1775.82, schedule: 'Bi-weekly · Thursdays' },
    ],
  },
  allocation: { needs: 0.5, wants: 0.3, savings: 0.2 },
  buckets: {
    needs:   { budget: 1775.82, spent: 1834.41 },   // OVER by $58.59
    wants:   { budget: 1065.49, spent: 274.25 },
    savings: { budget: 710.33,  spent: 305.00 },
  },
  // Recurring expenses by card
  cards: [
    {
      id: 'td_debit', name: 'TD Debit', type: 'debit', total: 556.85,
      items: [
        { name: 'Car Loan',       amount: 199.03, due: 'Jun 6',  freq: 'Bi-weekly Thu' },
        { name: 'Student Loans',  amount: 135.77, due: '1st',    freq: 'Monthly' },
        { name: 'Car Insurance',  amount: 222.05, due: '15th',   freq: 'Monthly' },
      ],
    },
    {
      id: 'ws_debit', name: 'Wealthsimple Debit', type: 'debit', total: 916.56,
      items: [
        { name: 'Rent',           amount: 700.00, due: '1st',   freq: 'Monthly' },
        { name: 'Gym',            amount: 72.00,  due: 'Jul 25', freq: 'Bi-weekly Fri' },
        { name: 'Phone Loan',     amount: 54.00,  due: '23rd',  freq: 'Monthly' },
        { name: 'WiFi',           amount: 50.00,  due: '5th',   freq: 'Monthly' },
        { name: 'PS Plus',        amount: 17.00,  due: '17th',  freq: 'Monthly' },
        { name: 'CAA',            amount: 16.67,  due: '4th',   freq: 'Monthly' },
        { name: 'Apple Music',    amount: 6.89,   due: '2nd',   freq: 'Monthly' },
      ],
    },
    {
      id: 'ws_credit', name: 'Wealthsimple Credit', type: 'credit', total: 361.00,
      items: [
        { name: 'Parking',        amount: 240.00, due: 'Bi-weekly', freq: 'Bi-weekly' },
        { name: 'Gas',            amount: 80.00,  due: 'Bi-weekly', freq: 'Bi-weekly' },
        { name: 'Fizz',           amount: 36.00,  due: '21st',     freq: 'Monthly' },
        { name: 'Amazon Prime',   amount: 5.00,   due: '5th',      freq: 'Monthly' },
      ],
    },
  ],
  loans: [
    { id: 'car',    name: 'Car Loan',      remaining: 15172,   original: 23083,   color: '#5b8def' },
    { id: 'school', name: 'Student Loans', remaining: 9641,    original: 11338,   color: '#22c55e' },
    { id: 'phone',  name: 'Phone Loan',    remaining: 919.44,  original: 1298.07, color: '#f59e0b' },
  ],
  creditCards: [
    { id: 'td_s',  name: 'TD Small',         last: '9602', balance: 828.94, limit: 1000 },
    { id: 'td_b',  name: 'TD Big',           last: '1252', balance: 817.60, limit: 2500 },
    { id: 'ws_cc', name: 'Wealthsimple',     last: '1083', balance: 231.00, limit: 2000 },
  ],
  savingsAccounts: [
    { id: 'cc_pay', name: 'CC Payments', balance: 500,   alloc: 135 },
    { id: 'crypto', name: 'Crypto',      balance: 2000,  alloc: 135 },
    { id: 'fhsa',   name: 'FHSA',        balance: 5000,  alloc: 135 },
    { id: 'tfsa',   name: 'TFSA',        balance: 25000, alloc: 135 },
    { id: 'usd',    name: 'USD Savings', balance: 3000,  alloc: 67.50 },
    { id: 'lbs',    name: 'Life w/ B&S', balance: 1200,  alloc: 67.50 },
  ],
  wishlist: [
    { id: 'mbp',  icon: '◧', name: 'MacBook Pro 14" M5 Pro · Space Black', est: 3899 },
    { id: 'hm',   icon: '◮', name: 'Herman Miller Embody Gaming Chair',     est: 2295 },
    { id: 'amb',  icon: '◐', name: 'Sennheiser AMBEO Soundbar + Sub',       est: 3499 },
    { id: 'seat', icon: '◍', name: 'Valencia Home Theatre Seat',            est: 1899 },
  ],
  // Last 12 months net income vs expenses (synthetic but plausible)
  flow: [
    { m: 'Jun', in: 3551, out: 1820 }, { m: 'Jul', in: 3551, out: 1910 },
    { m: 'Aug', in: 3551, out: 1750 }, { m: 'Sep', in: 3551, out: 1880 },
    { m: 'Oct', in: 3551, out: 1670 }, { m: 'Nov', in: 3551, out: 2090 },
    { m: 'Dec', in: 3551, out: 2310 }, { m: 'Jan', in: 3551, out: 1780 },
    { m: 'Feb', in: 3551, out: 1690 }, { m: 'Mar', in: 3551, out: 1820 },
    { m: 'Apr', in: 3551, out: 1740 }, { m: 'May', in: 3551, out: 1834 },
  ],
  // Daily spend last 14 days (for sparklines/activity)
  spark: [42, 18, 0, 65, 12, 8, 130, 24, 0, 36, 14, 220, 38, 22],
  // Purchases made this period (sum = $274.25, matching wants.spent)
  recent: [
    { name: 'McDonald\'s drive-thru',  amount: 16.37,  when: 'just now',  cat: 'food', card: 'WS Debit' },
    { name: 'Spotify family share',    amount: 6.99,   when: '2h ago',    cat: 'sub',  card: 'WS Credit' },
    { name: 'Tim Hortons',             amount: 8.45,   when: 'Yesterday', cat: 'food', card: 'WS Debit' },
    { name: 'Steam · Hades II',        amount: 36.99,  when: 'Yesterday', cat: 'fun',  card: 'WS Credit' },
    { name: 'Uber Eats',               amount: 24.10,  when: '2d ago',    cat: 'food', card: 'WS Debit' },
    { name: 'Indigo · 2 books',        amount: 41.83,  when: '3d ago',    cat: 'shop', card: 'WS Credit' },
    { name: 'Esso · gas',              amount: 52.40,  when: '3d ago',    cat: 'auto', card: 'WS Credit' },
    { name: 'Costco run',              amount: 87.12,  when: '4d ago',    cat: 'food', card: 'TD Debit' },
  ],
  // Calendar — upcoming 7 days of due items
  upcoming: [
    { date: 'Today',  day: 'Mon', name: 'Apple Music',   amount: 6.89,  card: 'WS Debit',  type: 'sub' },
    { date: 'Tue 27', day: 'Tue', name: 'CAA',           amount: 16.67, card: 'WS Debit',  type: 'sub' },
    { date: 'Wed 28', day: 'Wed', name: 'Gas',           amount: 40.00, card: 'WS Credit', type: 'var' },
    { date: 'Thu 29', day: 'Thu', name: 'Car Loan',      amount: 199.03,card: 'TD Debit',  type: 'loan' },
    { date: 'Fri 30', day: 'Fri', name: 'Gym',           amount: 72.00, card: 'WS Debit',  type: 'sub' },
    { date: 'Sat 31', day: 'Sat', name: 'Parking',       amount: 120.00,card: 'WS Credit', type: 'var' },
    { date: 'Sun 1',  day: 'Sun', name: 'Rent',          amount: 700.00,card: 'WS Debit',  type: 'bill' },
  ],
};

// Derived values
BUDGET.derived = (() => {
  const ccTotal = BUDGET.creditCards.reduce((a, c) => a + c.balance, 0);
  const ccLimit = BUDGET.creditCards.reduce((a, c) => a + c.limit, 0);
  const loanRem = BUDGET.loans.reduce((a, l) => a + l.remaining, 0);
  const savings = BUDGET.savingsAccounts.reduce((a, s) => a + s.balance, 0);
  const assetsInvest = 12500 + 8200 + 18500; // sample-data.csv assets
  const netWorth = savings + assetsInvest - loanRem - ccTotal;
  const needsLeft  = BUDGET.buckets.needs.budget   - BUDGET.buckets.needs.spent;
  const wantsLeft  = BUDGET.buckets.wants.budget   - BUDGET.buckets.wants.spent;
  const saveLeft   = BUDGET.buckets.savings.budget - BUDGET.buckets.savings.spent;
  // Bi-weekly wants budget — the "can I spend this" number
  const biWants    = BUDGET.buckets.wants.budget / 2;
  const wantsSpendable = biWants - 274.25;
  return { ccTotal, ccLimit, loanRem, savings, netWorth, needsLeft, wantsLeft, saveLeft, biWants, wantsSpendable, assetsInvest };
})();

window.BUDGET = BUDGET;

// Number formatters
window.FMT = {
  money: (n, opts = {}) => {
    const { cents = true, sign = false, compact = false } = opts;
    if (n == null || isNaN(n)) return '—';
    const abs = Math.abs(n);
    if (compact && abs >= 1000) {
      const v = abs >= 10000 ? (abs / 1000).toFixed(1) + 'k' : (abs / 1000).toFixed(2) + 'k';
      return (n < 0 ? '−' : sign ? '+' : '') + '$' + v;
    }
    const formatted = abs.toLocaleString('en-US', {
      minimumFractionDigits: cents ? 2 : 0,
      maximumFractionDigits: cents ? 2 : 0,
    });
    return (n < 0 ? '−' : sign ? '+' : '') + '$' + formatted;
  },
  pct: (n, d = 0) => (n * 100).toFixed(d) + '%',
  splitDollars: (n) => {
    // Returns ["$1,775", "82"] so we can style cents differently
    if (n == null || isNaN(n)) return ['—', ''];
    const abs = Math.abs(n);
    const whole = Math.floor(abs);
    const cents = Math.round((abs - whole) * 100).toString().padStart(2, '0');
    return [(n < 0 ? '−' : '') + '$' + whole.toLocaleString('en-US'), cents];
  },
};
