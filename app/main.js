// HomeLedger entry: a tiny hash router over the four views.
//
// Routes: #/ overview, #/ledger, #/budgets, #/reports. The current month is
// shared by every view and remembered across visits, so flipping between
// pages never loses the month you were looking at.

import { store, uiState, monthKey } from './data.js';
import { viewOverview, viewLedger, viewBudgets, viewReports } from './views.js';

store.load();

const saved = uiState.load();
export const ctx = {
  month: saved.month || monthKey(new Date()),
  save() { uiState.save({ month: this.month }); },
};

const routes = {
  overview: viewOverview,
  ledger: viewLedger,
  budgets: viewBudgets,
  reports: viewReports,
};

function routeName() {
  const name = location.hash.replace('#/', '').replace('#', '');
  return routes[name] ? name : 'overview';
}

function render() {
  const name = routeName();
  document.querySelectorAll('#tabs a').forEach((a) => {
    a.classList.toggle('on', a.dataset.route === name);
  });
  routes[name](document.querySelector('#app'), ctx);
}

window.addEventListener('hashchange', render);
render();
