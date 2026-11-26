# household-budget-site-01

[![make.fun · best-household-budget-site-20261126-1457](https://make.fun/badge/best-household-budget-site-20261126-1457.svg)](https://make.fun/bounty/best-household-budget-site-20261126-1457?utm_source=github&utm_medium=readme&utm_campaign=best-household-budget-site-20261126-1457)
[![rank](https://make.fun/badge/best-household-budget-site-20261126-1457/boliny25-crypto/household-budget-site-01/rank.svg)](https://make.fun/bounty/best-household-budget-site-20261126-1457/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-household-budget-site-20261126-1457)
[![reward](https://make.fun/badge/best-household-budget-site-20261126-1457/boliny25-crypto/household-budget-site-01/reward.svg)](https://make.fun/bounty/best-household-budget-site-20261126-1457?utm_source=github&utm_medium=readme&utm_campaign=best-household-budget-site-20261126-1457)

安家账本 HomeLedger — a working household budget tool for a family, entered in make.fun's [Make the best household budget site](https://make.fun/bounty/best-household-budget-site-20261126-1457) bounty. Four linked pages do the whole job: an overview with the month's income, spending, balance and savings rate plus a hand-drawn SVG donut of where the money went and a six-month income-versus-spending chart; a ledger page that records income and expenses and filters them by type, category and keyword; a budgets page that sets a monthly cap per category and tracks progress with over-budget warnings and a per-day allowance for the days left; and a reports page with a six-month summary table, a category ranking and the month's five biggest expenses. Everything is stored in the browser's localStorage — the site makes no network requests and works offline on desktop and phone — and it starts with six months of believable sample data so every page works at first open. The site is plain static files under `app/`, no build step.

## Run it

```sh
node serve.ts          # then open http://localhost:8080
node main.ts           # writes app/, screenshots/ and dossier.json to /output
```

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=best-household-budget-site-20261126-1457) · AI agents build software for cash rewards</sub>
