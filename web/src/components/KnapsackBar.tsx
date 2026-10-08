import { CAPACITIES, METRICS, money } from "../metrics";
import type { CapacityKey, CapFigures, MetricKey, Player } from "../types";

const GROUP_ORDER = { G: 0, F: 1, C: 2 };

interface Props {
  cap: CapFigures;
  capacityKey: CapacityKey;
  metric: MetricKey;
  roster: Player[];
  optimalValue: number | null;
}

export function KnapsackBar({ cap, capacityKey, metric, roster, optimalValue }: Props) {
  const capacity = cap[capacityKey];
  const payroll = roster.reduce((s, p) => s + p.salary, 0);
  const value = roster.reduce((s, p) => s + METRICS[metric].value(p), 0);
  const scale = Math.max(cap.secondApron * 1.06, payroll * 1.03);
  const pct = (n: number) => `${(n / scale) * 100}%`;
  const over = payroll > capacity;
  const ordered = [...roster].sort((a, b) => GROUP_ORDER[a.group] - GROUP_ORDER[b.group] || b.salary - a.salary);
  const ratio = optimalValue && optimalValue > 0 ? value / optimalValue : null;

  return (
    <section className="knapsack" aria-label="Payroll against the budget">
      <dl className="stats">
        <div>
          <dt>Payroll</dt>
          <dd>{money(payroll)}</dd>
        </div>
        <div className={over ? "is-over" : undefined}>
          <dt>{over ? `Over the ${CAPACITIES[capacityKey].label.toLowerCase()}` : "Room left"}</dt>
          <dd>{money(Math.abs(capacity - payroll))}</dd>
        </div>
        <div>
          <dt>Your roster</dt>
          <dd>
            {value.toFixed(1)} <span className="dd-unit">{METRICS[metric].short}</span>
          </dd>
          {ratio !== null && (
            <dd className="dd-note">
              {(ratio * 100).toFixed(0)}% of the best
              {over && ", but over budget"}
            </dd>
          )}
        </div>
        <div>
          <dt>Best possible roster</dt>
          <dd>
            {optimalValue === null ? "–" : optimalValue.toFixed(1)}{" "}
            <span className="dd-unit">{METRICS[metric].short}</span>
          </dd>
          <dd className="dd-note">within the {CAPACITIES[capacityKey].label.toLowerCase()}</dd>
        </div>
      </dl>

      <div className="bar-wrap">
        <div className="bar">
          {ordered.map((p) => {
            const width = (p.salary / scale) * 100;
            return (
              <div
                key={p.id}
                className={`segment g-${p.group}`}
                style={{ width: `${width}%` }}
                title={`${p.name}, ${money(p.salary)}`}
              >
                {width > 4.5 && <span>{p.name.split(" ").slice(-1)[0]}</span>}
              </div>
            );
          })}
          {over && (
            <div className="overflow" style={{ left: pct(capacity), width: pct(payroll - capacity) }} aria-hidden="true" />
          )}
        </div>
        {(Object.keys(CAPACITIES) as CapacityKey[]).map((key, i) => (
          <div
            key={key}
            className={`marker ${key === capacityKey ? "is-active" : ""} ${i % 2 ? "below" : "above"}`}
            style={{ left: pct(cap[key]) }}
          >
            <span className="marker-label">
              <span className="marker-name">{CAPACITIES[key].short}</span>{" "}
              <span className="marker-amount">{money(cap[key])}</span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
