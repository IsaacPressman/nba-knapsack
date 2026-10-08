import type { CapFigures } from "../types";
import { money } from "../metrics";
import { ROSTER_SIZE } from "../solver";

export function Intro({ cap }: { cap: CapFigures }) {
  return (
    <header className="intro">
      <h1>The salary cap is a knapsack</h1>
      <p className="lede">
        The knapsack problem is one of the classic puzzles in computer science. You have a bag that can only hold so
        much weight and a pile of items, each with its own weight and value. Which items do you pack to get the most
        value without going over? It has been studied for over a century and shows up everywhere from budgeting to
        cargo loading.
      </p>
      <p className="lede">
        When I learned about it, I realized NBA front offices solve the same puzzle every summer. Player salaries are
        the weights, on-court production is the value, and the {cap.season} salary cap of {money(cap.salaryCap)} is the
        size of the bag. Below is the best {ROSTER_SIZE}-man roster that fits. Then it's your turn: drag players in and
        out and see if you can beat it.
      </p>
    </header>
  );
}
