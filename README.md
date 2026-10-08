# Salary Cap Knapsack

An interactive look at NBA roster building as the classic **knapsack problem**.

## The idea

In the knapsack problem you have a bag that holds a limited weight and a pile of items, each with
a weight and a value. The goal is to pack the most total value without going over. NBA front
offices face the same puzzle every summer:

| Knapsack     | NBA                                                     |
| ------------ | ------------------------------------------------------- |
| Bag capacity | The 2026-27 salary cap ($165.0M), tax line or an apron  |
| Item weight  | A player's 2026-27 salary                               |
| Item value   | A player's 2025-26 production (WS, VORP, BPM or PER)    |

The app solves for the best possible 13-man roster, shows it, and then lets you try to build your
own.

## Features

- **Best roster on load:** the optimal roster for the chosen metric and budget.
- **Value metric:** switch between Win Shares, VORP, Box Plus/Minus and PER.
- **Budget:** the salary cap, luxury tax, first apron or second apron.
- **Build your own:** drag players from a searchable, sortable pool onto your roster. Drop a player
  onto someone to swap them, or use the + and × buttons. Use "Clear all" to start from scratch.
- **Knapsack bar:** your payroll as salary-sized blocks against the cap, tax and apron lines. It
  turns red once you're over budget.
- **Scoreboard:** your roster's total value next to the best possible total.
- **Lock and re-optimize:** lock the players you want to keep, and the solver fills the remaining
  spots optimally around them.

### Roster rules

Exactly 13 players, with at least 4 guards, 4 forwards and 2 centers. Only players who logged 500+
minutes last season are included, so rookies are left out.

## Run it

```sh
cd web
npm install
npm run dev        # http://localhost:5173
```

`npm run build` produces a fully static site in `web/dist` that can be hosted anywhere.

## Refresh the data

```sh
venv/Scripts/python.exe scripts/fetch_data.py
```

This scrapes 2026-27 salaries and 2025-26 advanced stats from Basketball-Reference, plus NBA.com
player IDs for headshots, and writes `web/src/data/players.json`. Cap figures are hard-coded in
the script. Salaries change with trades and signings, so rerun it every so often.

## How it works

With only a budget, the knapsack problem has a textbook dynamic-programming solution. The roster
rules (exact size and position minimums) turn it into a multi-constraint knapsack, which the app
solves as an integer linear program instead:

- `web/src/solver.ts` builds the model and solves it in the browser with
  [HiGHS](https://highs.dev) compiled to WebAssembly. The model has one yes/no variable per player,
  plus constraints for salary ≤ budget, exactly 13 players, the position minimums, and locked
  players. Before solving, it drops players who can never make the optimal roster: anyone with 13+
  cheaper, better players at the same position.
- `web/src/solver.worker.ts` runs solves in a Web Worker so the page stays responsive. Results are
  cached per metric, budget and set of locked players.

## Project layout

```
scripts/fetch_data.py       data scraper (Python, stdlib only)
web/src/data/players.json   generated player data
web/src/solver.ts           knapsack / ILP model
web/src/solver.worker.ts    runs the solver off the main thread
web/src/components/         intro, knapsack bar, roster board, player pool
```

## Caveats

Value is last season's stat summed across the roster. That ignores fit, aging, injuries, and the
fact that five players share one ball. BPM and PER are per-minute rates, so summing them treats a
bench player's minutes the same as a starter's.

## Credits

Salaries and stats from [Basketball-Reference](https://www.basketball-reference.com). 2026-27 cap
figures from the [NBA](https://www.nba.com/news/nba-salary-cap-2026-27-season). Headshots from
NBA.com.
