// HomeLedger views: overview, ledger, budgets, reports — plus the two
// hand-drawn SVG charts (a donut and grouped bars). Every view renders into
// #app from the store, and every control re-renders the view it lives in.

import {
  EXPENSE_CATEGORIES, INCOME_CATEGORIES, categoryOf, fmtYuan,
  monthLabel, shiftMonth, txsInMonth, totalsOf, expenseByCategory,
  monthlySummaries, store,
} from './data.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

function monthBar(ctx, title) {
  return `<div class="monthbar">
    <h1>${title}</h1><span class="spacer"></span>
    <button class="mnav" data-act="prev" aria-label="上个月">‹ 上月</button>
    <span class="mlabel">${monthLabel(ctx.month)}</span>
    <button class="mnav" data-act="next" aria-label="下个月">下月 ›</button>
  </div>`;
}

function wireMonthBar(root, ctx, rerender) {
  root.querySelector('[data-act="prev"]').addEventListener('click', () => {
    ctx.month = shiftMonth(ctx.month, -1); ctx.save(); rerender();
  });
  root.querySelector('[data-act="next"]').addEventListener('click', () => {
    ctx.month = shiftMonth(ctx.month, 1); ctx.save(); rerender();
  });
}

function statCard(cls, k, v, d) {
  return `<section class="card stat ${cls}"><div class="k">${k}</div>
    <div class="v">${v}</div><div class="d">${d}</div></section>`;
}

/* ------------------------------------------------------------------ */
/* Charts                                                              */
/* ------------------------------------------------------------------ */

// Donut of expense shares, drawn as stroked circle segments.
function donutChart(parts, total) {
  const R = 74, C = 2 * Math.PI * R;
  let offset = 0;
  const segs = parts.map((p) => {
    const frac = total > 0 ? p.total / total : 0;
    const seg = `<circle cx="100" cy="100" r="${R}" fill="none" stroke="${p.color}"
      stroke-width="30" stroke-dasharray="${Math.max(frac * C - 2, 0)} ${C}"
      stroke-dashoffset="${-offset}" transform="rotate(-90 100 100)"/>`;
    offset += frac * C;
    return seg;
  }).join('');
  return `<svg class="chart" viewBox="0 0 200 200" role="img" aria-label="支出分类占比图">
    ${segs}
    <text x="100" y="94" text-anchor="middle" font-size="13" fill="#5c6a63">本月支出</text>
    <text x="100" y="118" text-anchor="middle" font-size="19" font-weight="700" fill="#22302a">${fmtYuan(total)}</text>
  </svg>`;
}

// Grouped bars: income vs expense for the last six months.
function trendChart(rows) {
  const W = 520, H = 230, base = 196, top = 16;
  const max = Math.max(1, ...rows.map((r) => Math.max(r.income, r.expense)));
  const slot = W / rows.length, bw = 22;
  const y = (v) => base - (v / max) * (base - top);
  let s = `<line x1="8" y1="${base}" x2="${W - 4}" y2="${base}" stroke="#e6dfd2"/>`;
  rows.forEach((r, i) => {
    const cx = slot * i + slot / 2;
    s += `<rect x="${cx - bw - 3}" y="${y(r.income)}" width="${bw}" height="${base - y(r.income)}" rx="4" fill="#1e7a5a"/>`;
    s += `<rect x="${cx + 3}" y="${y(r.expense)}" width="${bw}" height="${base - y(r.expense)}" rx="4" fill="#e4572e"/>`;
    s += `<text x="${cx}" y="${base + 20}" text-anchor="middle" font-size="12" fill="#5c6a63">${Number(r.key.split('-')[1])}月</text>`;
  });
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="近六个月收支对比图">${s}</svg>
    <p class="note" style="margin-top:6px"><span style="color:#1e7a5a">■</span> 收入　<span style="color:#e4572e">■</span> 支出</p>`;
}

/* ------------------------------------------------------------------ */
/* Overview                                                            */
/* ------------------------------------------------------------------ */

export function viewOverview(root, ctx) {
  const data = store.data;
  const txs = txsInMonth(data, ctx.month);
  const t = totalsOf(txs);
  const prev = totalsOf(txsInMonth(data, shiftMonth(ctx.month, -1)));
  const parts = expenseByCategory(data, ctx.month);
  const trend = monthlySummaries(data, ctx.month, 6);
  const rate = t.income > 0 ? Math.round((t.balance / t.income) * 100) : 0;
  const diff = t.expense - prev.expense;

  const budgetRows = EXPENSE_CATEGORIES.map((c) => {
    const spent = parts.find((p) => p.id === c.id)?.total || 0;
    const budget = store.budgetOf(c.id);
    return { ...c, spent, budget, ratio: budget > 0 ? spent / budget : 0 };
  }).filter((r) => r.budget > 0).sort((a, b) => b.ratio - a.ratio).slice(0, 4);

  const recent = txs.slice(0, 6).map((tx) => `<tr>
      <td>${tx.date.slice(5)}</td>
      <td><span class="chip">${esc(categoryOf(tx.type, tx.cat).name)}</span></td>
      <td>${esc(tx.note || '')}</td>
      <td class="amt ${tx.type}">${tx.type === 'in' ? '+' : '−'}${fmtYuan(tx.amount)}</td>
    </tr>`).join('');

  root.innerHTML = `
    ${monthBar(ctx, '本月总览')}
    <div class="grid stats">
      ${statCard('in', '收入', fmtYuan(t.income), txs.filter((x) => x.type === 'in').length + ' 笔进账')}
      ${statCard('out', '支出', fmtYuan(t.expense), '比上月' + (diff === 0 ? '持平' : diff > 0 ? '多花 ' + fmtYuan(diff) : '少花 ' + fmtYuan(-diff)))}
      ${statCard('', '结余', fmtYuan(t.balance), t.balance >= 0 ? '这个月攒下了钱' : '这个月花超了')}
      ${statCard('', '储蓄率', rate + '<small>%</small>', '结余占收入的比例')}
    </div>
    <div class="grid two">
      <section class="card"><h2>支出去向</h2><p class="sub">按分类统计本月支出占比</p>
        ${parts.length ? donutChart(parts, t.expense) + `<ul class="legend">${parts.slice(0, 6).map((p) => `
          <li><span class="dot" style="background:${p.color}"></span>${p.name}
          <span class="amt">${fmtYuan(p.total)}</span><span class="pct">${Math.round((p.total / t.expense) * 100)}%</span></li>`).join('')}</ul>`
        : '<p class="empty">本月还没有支出记录，去记账页记一笔吧。</p>'}
      </section>
      <section class="card"><h2>近六个月收支</h2><p class="sub">绿柱是收入，红柱是支出</p>
        ${trendChart(trend)}
        <h2 style="margin-top:14px">预算进度</h2><p class="sub">花得最快的四类</p>
        ${budgetRows.length ? budgetRows.map((r) => budgetBar(r)).join('') : '<p class="empty">还没有设置预算。</p>'}
      </section>
    </div>
    <section class="card" style="margin-top:16px"><h2>最近记录</h2><p class="sub">本月最新六笔</p>
      ${recent ? `<table class="tx"><tbody>${recent}</tbody></table>` : '<p class="empty">暂无记录。</p>'}
    </section>`;
  wireMonthBar(root, ctx, () => viewOverview(root, ctx));
}

function budgetBar(r) {
  const pct = Math.min(100, Math.round(r.ratio * 100));
  const cls = r.ratio > 1 ? 'over' : r.ratio >= 0.85 ? 'near' : '';
  const tip = r.ratio > 1
    ? `<div class="tip bad">已超支 ${fmtYuan(r.spent - r.budget)}，本月剩下的日子悠着点。</div>`
    : `<div class="tip">还剩 ${fmtYuan(r.budget - r.spent)} 可用。</div>`;
  return `<div class="brow"><div class="head"><span class="name">${r.name}</span>
    <span class="nums">已花 <b>${fmtYuan(r.spent)}</b> / 预算 ${fmtYuan(r.budget)}</span></div>
    <div class="bar"><i class="${cls}" style="width:${pct}%"></i></div>${tip}</div>`;
}

/* ------------------------------------------------------------------ */
/* Ledger                                                              */
/* ------------------------------------------------------------------ */

export function viewLedger(root, ctx) {
  const data = store.data;
  const today = new Date().toISOString().slice(0, 10);
  const catOptions = (type, sel) => (type === 'in' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES)
    .map((c) => `<option value="${c.id}" ${c.id === sel ? 'selected' : ''}>${c.name}</option>`).join('');

  root.innerHTML = `
    ${monthBar(ctx, '记账')}
    <section class="card">
      <h2>记一笔</h2><p class="sub">填好点「记下来」，立刻计入本月账本</p>
      <form class="txform" id="txform">
        <label>日期<input type="date" name="date" value="${today}" required></label>
        <label>类型<select name="type" id="f-type">
          <option value="out">支出</option><option value="in">收入</option></select></label>
        <label>分类<select name="cat" id="f-cat">${catOptions('out', 'groceries')}</select></label>
        <label>金额（元）<input type="number" name="amount" min="0.01" step="0.01" placeholder="如 128" required></label>
        <label>备注<input type="text" name="note" placeholder="如 超市采购" maxlength="30"></label>
        <label>成员<input type="text" name="member" placeholder="如 我" maxlength="6"></label>
        <button class="act" type="submit">记下来</button>
      </form>
    </section>
    <section class="card" style="margin-top:16px">
      <h2>${monthLabel(ctx.month)}明细</h2><p class="sub" id="ledsum"></p>
      <div class="filters">
        <select id="q-type"><option value="">全部类型</option><option value="out">只看支出</option><option value="in">只看收入</option></select>
        <select id="q-cat"><option value="">全部分类</option>
          ${[...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].map((c) => `<option value="${c.id}">${c.name}</option>`).join('')}</select>
        <input type="search" id="q-text" placeholder="搜备注，如「超市」">
      </div>
      <div id="ledtable"></div>
    </section>`;

  wireMonthBar(root, ctx, () => viewLedger(root, ctx));

  const form = root.querySelector('#txform');
  form.type.addEventListener('change', () => {
    form.querySelector('#f-cat').innerHTML = catOptions(form.type.value, form.type.value === 'in' ? 'salary' : 'groceries');
  });
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const fd = new FormData(form);
    const amount = Number(fd.get('amount'));
    if (!(amount > 0)) return;
    store.addTx({
      date: String(fd.get('date')), type: String(fd.get('type')),
      cat: String(fd.get('cat')), amount,
      note: String(fd.get('note') || ''), member: String(fd.get('member') || ''),
    });
    ctx.month = String(fd.get('date')).slice(0, 7); ctx.save();
    viewLedger(root, ctx);
  });

  const renderTable = () => {
    const type = root.querySelector('#q-type').value;
    const cat = root.querySelector('#q-cat').value;
    const text = root.querySelector('#q-text').value.trim();
    let txs = txsInMonth(store.data, ctx.month);
    if (type) txs = txs.filter((t) => t.type === type);
    if (cat) txs = txs.filter((t) => t.cat === cat);
    if (text) txs = txs.filter((t) => (t.note || '').includes(text));
    const t = totalsOf(txs);
    root.querySelector('#ledsum').textContent =
      `共 ${txs.length} 笔 · 收入 ${fmtYuan(t.income)} · 支出 ${fmtYuan(t.expense)} · 结余 ${fmtYuan(t.balance)}`;
    root.querySelector('#ledtable').innerHTML = txs.length ? `<table class="tx">
      <thead><tr><th>日期</th><th>分类</th><th>备注</th><th>成员</th><th class="amt">金额</th><th></th></tr></thead>
      <tbody>${txs.map((tx) => `<tr>
        <td>${tx.date.slice(5)}</td>
        <td><span class="chip">${esc(categoryOf(tx.type, tx.cat).name)}</span></td>
        <td>${esc(tx.note || '')}</td><td>${esc(tx.member || '')}</td>
        <td class="amt ${tx.type}">${tx.type === 'in' ? '+' : '−'}${fmtYuan(tx.amount)}</td>
        <td><button class="ghost mini" data-del="${tx.id}">删除</button></td></tr>`).join('')}
      </tbody></table>` : '<p class="empty">没有符合条件的记录。</p>';
    root.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => {
      store.deleteTx(b.dataset.del);
      renderTable();
    }));
  };
  ['#q-type', '#q-cat', '#q-text'].forEach((sel) => {
    root.querySelector(sel).addEventListener('input', renderTable);
  });
  renderTable();
}

/* ------------------------------------------------------------------ */
/* Budgets                                                             */
/* ------------------------------------------------------------------ */

export function viewBudgets(root, ctx) {
  const data = store.data;
  const parts = expenseByCategory(data, ctx.month);
  const spentOf = (id) => parts.find((p) => p.id === id)?.total || 0;
  const totalBudget = EXPENSE_CATEGORIES.reduce((s, c) => s + store.budgetOf(c.id), 0);
  const totalSpent = totalsOf(txsInMonth(data, ctx.month)).expense;
  const [y, m] = ctx.month.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const isNow = ctx.month === new Date().toISOString().slice(0, 7);
  const dayNow = isNow ? new Date().getDate() : daysInMonth;
  const daysLeft = daysInMonth - dayNow;

  root.innerHTML = `
    ${monthBar(ctx, '预算')}
    <div class="grid stats" style="grid-template-columns:repeat(3,1fr)">
      ${statCard('', '预算总额', fmtYuan(totalBudget), '全部分类的月度上限')}
      ${statCard('out', '已支出', fmtYuan(totalSpent), '本月所有支出合计')}
      ${statCard('', '本月还剩', String(daysLeft) + '<small> 天</small>', isNow ? '按预算总额，日均可用 ' + fmtYuan(Math.max(0, (totalBudget - totalSpent) / Math.max(daysLeft, 1))) : '该月已经结束')}
    </div>
    <section class="card"><h2>分类预算</h2>
      <p class="sub">给每一类支出定一个月度上限；改完点「保存」生效，填 0 表示取消这一类的预算。</p>
      ${EXPENSE_CATEGORIES.map((c) => {
        const spent = spentOf(c.id), budget = store.budgetOf(c.id);
        const r = { ...c, spent, budget, ratio: budget > 0 ? spent / budget : 0 };
        return budgetBar(r) + `<div class="bedit">
          <label class="note">月预算（元）<input type="number" min="0" step="10" value="${budget || ''}" placeholder="未设置" data-budget="${c.id}"></label>
          <button class="ghost mini" data-save="${c.id}">保存</button></div>`;
      }).join('')}
    </section>`;
  wireMonthBar(root, ctx, () => viewBudgets(root, ctx));
  root.querySelectorAll('[data-save]').forEach((b) => b.addEventListener('click', () => {
    const input = root.querySelector(`[data-budget="${b.dataset.save}"]`);
    store.setBudget(b.dataset.save, Number(input.value) || 0);
    viewBudgets(root, ctx);
  }));
}

/* ------------------------------------------------------------------ */
/* Reports                                                             */
/* ------------------------------------------------------------------ */

export function viewReports(root, ctx) {
  const data = store.data;
  const rows = monthlySummaries(data, ctx.month, 6);
  const parts = expenseByCategory(data, ctx.month);
  const maxPart = parts.length ? parts[0].total : 1;
  const big = txsInMonth(data, ctx.month)
    .filter((t) => t.type === 'out')
    .sort((a, b) => b.amount - a.amount).slice(0, 5);

  root.innerHTML = `
    ${monthBar(ctx, '报表')}
    <div class="grid twoeven">
      <section class="card"><h2>近六个月汇总</h2><p class="sub">每月收入、支出、结余与储蓄率</p>
        <table class="sum"><thead><tr><th>月份</th><th>收入</th><th>支出</th><th>结余</th><th>储蓄率</th></tr></thead>
        <tbody>${rows.map((r) => `<tr class="${r.key === ctx.month ? 'now' : ''}">
          <td>${monthLabel(r.key)}</td><td>${fmtYuan(r.income)}</td><td>${fmtYuan(r.expense)}</td>
          <td>${fmtYuan(r.balance)}</td><td>${r.income > 0 ? Math.round(r.rate) + '%' : '—'}</td></tr>`).join('')}
        </tbody></table>
        <p class="note" style="margin-top:10px">储蓄率 = 结余 ÷ 收入。一般家庭能长期保持 20% 以上，财务就比较健康。</p>
      </section>
      <section class="card"><h2>本月支出排行</h2><p class="sub">${monthLabel(ctx.month)}按分类从高到低</p>
        ${parts.length ? `<div class="rank">${parts.map((p) => `<div class="r">
          <span>${p.name}</span><span class="track"><i style="width:${Math.round((p.total / maxPart) * 100)}%;background:${p.color}"></i></span>
          <span class="val">${fmtYuan(p.total)}</span></div>`).join('')}</div>` : '<p class="empty">本月暂无支出。</p>'}
        <h2 style="margin-top:18px">本月最大五笔支出</h2>
        ${big.length ? `<table class="tx"><tbody>${big.map((tx) => `<tr>
          <td>${tx.date.slice(5)}</td><td><span class="chip">${esc(categoryOf(tx.type, tx.cat).name)}</span></td>
          <td>${esc(tx.note || '')}</td><td class="amt out">−${fmtYuan(tx.amount)}</td></tr>`).join('')}</tbody></table>`
        : '<p class="empty">暂无。</p>'}
      </section>
    </div>
    <section class="card" style="margin-top:16px"><h2>数据管理</h2>
      <p class="sub">账本只存在这台设备的浏览器里。想重新开始可以用下面按钮恢复成示例数据（会清掉你记的账）。</p>
      <button class="ghost" id="btn-reset">恢复示例数据</button>
    </section>`;
  wireMonthBar(root, ctx, () => viewReports(root, ctx));
  root.querySelector('#btn-reset').addEventListener('click', () => {
    store.reset(); viewReports(root, ctx);
  });
}
