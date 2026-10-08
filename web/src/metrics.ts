import type { CapacityKey, MetricKey, Player } from "./types";

export const METRICS: Record<MetricKey, { label: string; short: string; about: string; value: (p: Player) => number }> = {
  ws: {
    label: "Win Shares",
    short: "WS",
    about: "Estimated wins a player contributed last season. Counting stat, so minutes played matter.",
    value: (p) => p.ws,
  },
  vorp: {
    label: "Value over replacement",
    short: "VORP",
    about: "Points per 100 possessions above a replacement-level player, scaled by playing time.",
    value: (p) => p.vorp,
  },
  bpm: {
    label: "Box plus/minus",
    short: "BPM",
    about: "Per-100-possession impact versus an average player. A rate stat, so bench minutes count as much as starter minutes.",
    value: (p) => p.bpm,
  },
  per: {
    label: "Player efficiency rating",
    short: "PER",
    about: "Per-minute production where league average is 15. A rate stat that favours offense.",
    value: (p) => p.per,
  },
};

export const CAPACITIES: Record<CapacityKey, { label: string; short: string }> = {
  salaryCap: { label: "Salary cap", short: "Cap" },
  luxuryTax: { label: "Luxury tax", short: "Tax" },
  firstApron: { label: "First apron", short: "1st apron" },
  secondApron: { label: "Second apron", short: "2nd apron" },
};

export const money = (n: number, digits = 1) => `$${(n / 1e6).toFixed(digits)}M`;

export const headshot = (p: Player) =>
  p.nbaId ? `https://cdn.nba.com/headshots/nba/latest/260x190/${p.nbaId}.png` : null;

export const initials = (name: string) =>
  name
    .split(" ")
    .filter((w) => /^[A-Z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join("");
