export type PositionGroup = "G" | "F" | "C";

export interface Player {
  id: string;
  nbaId: number | null;
  name: string;
  team: string;
  pos: string;
  group: PositionGroup;
  age: number | null;
  salary: number;
  option: "player" | "team" | null;
  games: number;
  minutes: number;
  ws: number;
  vorp: number;
  bpm: number;
  per: number;
}

export interface CapFigures {
  season: string;
  statsSeason: string;
  salaryCap: number;
  luxuryTax: number;
  firstApron: number;
  secondApron: number;
  minimumSalary: number;
}

export type MetricKey = "ws" | "vorp" | "bpm" | "per";

export type CapacityKey = "salaryCap" | "luxuryTax" | "firstApron" | "secondApron";
