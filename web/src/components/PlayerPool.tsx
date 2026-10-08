import { useMemo, useState } from "react";
import { METRICS, money } from "../metrics";
import type { MetricKey, Player, PositionGroup } from "../types";
import { Avatar } from "./Avatar";
import { DRAG_TYPE } from "./RosterBoard";

type SortKey = "value" | "perMillion" | "salary";

interface Props {
  players: Player[];
  rosterIds: Set<string>;
  metric: MetricKey;
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
}

export function PlayerPool({ players, rosterIds, metric, onAdd, onRemove }: Props) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<PositionGroup | "all">("all");
  const [sort, setSort] = useState<SortKey>("value");
  const [isDrop, setIsDrop] = useState(false);
  const value = METRICS[metric].value;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const key = (p: Player) =>
      sort === "value" ? value(p) : sort === "perMillion" ? value(p) / (p.salary / 1e6) : p.salary;
    return players
      .filter((p) => !rosterIds.has(p.id))
      .filter((p) => group === "all" || p.group === group)
      .filter((p) => !q || p.name.toLowerCase().includes(q) || p.team.toLowerCase() === q)
      .sort((a, b) => key(b) - key(a));
  }, [players, rosterIds, group, query, sort, value]);

  return (
    <section
      className={`pool ${isDrop ? "is-drop" : ""}`}
      aria-label="Player pool"
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes(DRAG_TYPE)) return;
        e.preventDefault();
        setIsDrop(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDrop(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDrop(false);
        const [source, id] = e.dataTransfer.getData(DRAG_TYPE).split(":");
        if (source === "roster" && id) onRemove(id);
      }}
    >
      <div className="panel-head">
        <h2>Player pool</h2>
        <span className="count">{visible.length} available</span>
      </div>
      <div className="pool-filters">
        <input
          type="search"
          placeholder="Search by name or team (e.g. BOS)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search players"
        />
        <div className="segmented small" role="group" aria-label="Filter by position">
          {(["all", "G", "F", "C"] as const).map((g) => (
            <button key={g} type="button" aria-pressed={group === g} onClick={() => setGroup(g)}>
              {g === "all" ? "All" : g}
            </button>
          ))}
        </div>
        <label className="sort">
          Sort by
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            <option value="value">{METRICS[metric].short}</option>
            <option value="perMillion">{METRICS[metric].short} per $1M</option>
            <option value="salary">Salary</option>
          </select>
        </label>
      </div>

      <div className="pool-head" aria-hidden="true">
        <span>Player</span>
        <span>Salary</span>
        <span>{METRICS[metric].short}</span>
        <span>per $1M</span>
        <span />
      </div>
      <ul className="pool-list">
        {visible.map((p) => (
          <li
            key={p.id}
            className="pool-row"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData(DRAG_TYPE, `pool:${p.id}`);
              e.dataTransfer.effectAllowed = "copy";
            }}
          >
            <div className="pool-player">
              <Avatar player={p} size={32} />
              <div>
                <span className="card-name">{p.name}</span>
                <span className="card-meta">
                  <span className={`pos-dot g-${p.group}`} aria-hidden="true" />
                  {p.team} {p.pos}
                  {p.option && <span className="option"> {p.option} option</span>}
                </span>
              </div>
            </div>
            <span className="num">{money(p.salary)}</span>
            <span className="num">{value(p).toFixed(1)}</span>
            <span className="num muted">{(value(p) / (p.salary / 1e6)).toFixed(2)}</span>
            <button type="button" className="icon-btn add" aria-label={`Add ${p.name}`} title="Add to roster" onClick={() => onAdd(p.id)}>
              <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </li>
        ))}
        {visible.length === 0 && <li className="empty">No players match. Clear the search or switch the position filter.</li>}
      </ul>
    </section>
  );
}
