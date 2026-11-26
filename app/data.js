// HomeLedger data layer: categories, the local store, seed data and sums.
//
// Everything lives in the browser's localStorage under one key. Nothing is
// fetched and nothing leaves the machine. On the very first run the store
// seeds itself with a believable sample household (two incomes, rent, a
// child in primary school) covering the last six months, so every page has
// real figures to show; from then on the visitor's own entries take over.

export const EXPENSE_CATEGORIES = [
  { id: 'housing', name: '住房', color: '#4e6e5d' },
  { id: 'groceries', name: '食材日用', color: '#7fb069' },
  { id: 'dining', name: '餐饮外食', color: '#e4572e' },
  { id: 'transport', name: '交通出行', color: '#3d7ea6' },
  { id: 'child', name: '孩子教育', color: '#9b5de5' },
  { id: 'health', name: '医疗健康', color: '#d1495b' },
  { id: 'shopping', name: '购物服饰', color: '#e0a458' },
  { id: 'fun', name: '休闲娱乐', color: '#4cc9f0' },
  { id: 'bills', name: '水电通信', color: '#8d99ae' },
  { id: 'other', name: '其他支出', color: '#6c757d' },
];

export const INCOME_CATEGORIES = [
  { id: 'salary', name: '工资', color: '#1e7a5a' },
  { id: 'bonus', name: '奖金补贴', color: '#588157' },
  { id: 'side', name: '副业收入', color: '#84a98c' },
  { id: 'other-in', name: '其他收入', color: '#a3b18a' },
];

export function categoryOf(type, id) {
  const list = type === 'in' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  return list.find((c) => c.id === id) || list[list.length - 1];
}

export function fmtYuan(n) {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(Math.round(n));
  return sign + '¥' + String(abs).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function monthKey(date) {
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
}

export function monthLabel(key) {
  const [y, m] = key.split('-');
  return y + ' 年 ' + Number(m) + ' 月';
}

export function shiftMonth(key, delta) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return monthKey(d);
}

export function lastMonthKeys(endKey, count) {
  const keys = [];
  for (let i = count - 1; i >= 0; i--) keys.push(shiftMonth(endKey, -i));
  return keys;
}

/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */

const STORE_KEY = 'homeledger-v1';
const UI_KEY = 'homeledger-ui';

export const store = {
  data: null,

  load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        this.data = JSON.parse(raw);
        return this.data;
      }
    } catch (e) { /* corrupted storage falls through to a fresh seed */ }
    this.data = seedData();
    this.save();
    return this.data;
  },

  save() {
    localStorage.setItem(STORE_KEY, JSON.stringify(this.data));
  },

  reset() {
    localStorage.removeItem(STORE_KEY);
    return this.load();
  },

  addTx(tx) {
    tx.id = 't' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
    this.data.txs.push(tx);
    this.save();
    return tx;
  },

  deleteTx(id) {
    this.data.txs = this.data.txs.filter((t) => t.id !== id);
    this.save();
  },

  setBudget(catId, amount) {
    if (amount > 0) this.data.budgets[catId] = Math.round(amount);
    else delete this.data.budgets[catId];
    this.save();
  },

  budgetOf(catId) {
    return this.data.budgets[catId] || 0;
  },
};

export const uiState = {
  load() {
    try { return JSON.parse(localStorage.getItem(UI_KEY)) || {}; } catch (e) { return {}; }
  },
  save(patch) {
    localStorage.setItem(UI_KEY, JSON.stringify({ ...this.load(), ...patch }));
  },
};

/* ------------------------------------------------------------------ */
/* Sums                                                                */
/* ------------------------------------------------------------------ */

export function txsInMonth(data, key) {
  return data.txs
    .filter((t) => t.date.startsWith(key))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export function totalsOf(txs) {
  let income = 0, expense = 0;
  for (const t of txs) {
    if (t.type === 'in') income += t.amount; else expense += t.amount;
  }
  return { income, expense, balance: income - expense };
}

export function expenseByCategory(data, key) {
  const sums = new Map();
  for (const t of txsInMonth(data, key)) {
    if (t.type !== 'out') continue;
    sums.set(t.cat, (sums.get(t.cat) || 0) + t.amount);
  }
  return EXPENSE_CATEGORIES
    .map((c) => ({ ...c, total: sums.get(c.id) || 0 }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);
}

export function monthlySummaries(data, endKey, count) {
  return lastMonthKeys(endKey, count).map((key) => {
    const t = totalsOf(txsInMonth(data, key));
    return { key, ...t, rate: t.income > 0 ? (t.balance / t.income) * 100 : 0 };
  });
}

/* ------------------------------------------------------------------ */
/* Seed data — a deterministic sample household, five months back      */
/* ------------------------------------------------------------------ */

function lcg(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function seedData() {
  const rnd = lcg(20261126);
  const txs = [];
  let seq = 0;
  const push = (date, type, cat, amount, note) => {
    txs.push({ id: 'seed' + (++seq), date, type, cat, amount, note });
  };
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const between = (lo, hi) => Math.round(lo + rnd() * (hi - lo));

  const now = new Date();
  const months = lastMonthKeys(monthKey(now), 6);
  for (const key of months) {
    const [y, m] = key.split('-').map(Number);
    const days = new Date(y, m, 0).getDate();
    const isCurrent = key === monthKey(now);
    const lastDay = isCurrent ? now.getDate() : days;
    const at = (day) => key + '-' + String(Math.min(day, days)).padStart(2, '0');

    // Income: two salaries, an occasional bonus or side job.
    push(at(10), 'in', 'salary', 12600, '工资（我）');
    push(at(15), 'in', 'salary', 8900, '工资（爱人）');
    if (rnd() < 0.5) push(at(between(5, 25)), 'in', 'side', between(300, 1500), pick(['周末兼职', '二手闲置卖出', '设计私活']));
    if (m === 9) push(at(28), 'in', 'bonus', 3000, '季度绩效奖金');

    // Fixed costs.
    push(at(1), 'out', 'housing', 3600, '房租');
    push(at(6), 'out', 'bills', between(180, 320), '电费＋燃气');
    push(at(6), 'out', 'bills', between(60, 110), '水费');
    push(at(20), 'out', 'bills', 199, '宽带＋两部手机话费');

    // Everyday spending, spread over the days that have already passed.
    const shopDays = between(10, 14);
    for (let i = 0; i < shopDays; i++) {
      const d = between(1, lastDay);
      push(at(d), 'out', 'groceries', between(45, 260), pick(['超市采购', '菜市场', '生鲜配送', '日用品补货', '粮油调料']));
    }
    const dineDays = between(4, 8);
    for (let i = 0; i < dineDays; i++) {
      const d = between(1, lastDay);
      push(at(d), 'out', 'dining', between(38, 320), pick(['工作日午餐', '周末家庭聚餐', '面馆', '奶茶咖啡', '朋友小聚']));
    }
    const trips = between(12, 20);
    for (let i = 0; i < trips; i++) {
      const d = between(1, lastDay);
      push(at(d), 'out', 'transport', between(6, 60), pick(['地铁', '公交', '打车', '共享单车', '加油']));
    }
    push(at(between(1, lastDay)), 'out', 'transport', between(200, 420), '油费／停车月卡');

    // Child, health, shopping, fun — a few each month.
    push(at(between(2, 20)), 'out', 'child', between(600, 1600), pick(['课外班学费', '绘本和文具', '学校餐费', '儿童服装']));
    if (rnd() < 0.7) push(at(between(1, lastDay)), 'out', 'health', between(60, 680), pick(['药店', '牙科检查', '体检', '眼镜']));
    const shops = between(2, 5);
    for (let i = 0; i < shops; i++) {
      push(at(between(1, lastDay)), 'out', 'shopping', between(80, 900), pick(['换季衣服', '家电小件', '护肤品', '家居用品', '鞋子']));
    }
    const funs = between(2, 4);
    for (let i = 0; i < funs; i++) {
      push(at(between(1, lastDay)), 'out', 'fun', between(40, 500), pick(['电影', '视频会员', '周末郊游', '书籍', '运动场馆']));
    }
  }

  return {
    txs,
    budgets: {
      housing: 3600, groceries: 2600, dining: 1500, transport: 900,
      child: 1800, health: 800, shopping: 1500, fun: 800, bills: 700, other: 500,
    },
  };
}
