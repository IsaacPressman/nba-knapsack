import { useState, type DragEvent } from "react";
import { METRICS, money } from "../metrics";
import { POSITION_MINIMUMS, ROSTER_SIZE } from "../solver";
import type { MetricKey, Player, PositionGroup } from "../types";
import { Avatar } from "./Avatar";

const GROUPS: { key: PositionGroup; label: string }[] = [
  { key: "G", label: "Guards" },
  { key: "F", label: "Forwards" },
  { key: "C", label: "Centers" },
];

export const DRAG_TYPE = "application/x-nba-player";

interface Props {
  roster: Player[];
  locked: string[];
  metric: MetricKey;
  onAdd: (id: string, replaceId?: string) => void;
  onRemove: (id: string) => void;
  onToggleLock: (id: string) => void;
  onClear: () => void;
}

export function RosterBoard({ roster, locked, metric, onAdd, onRemove, onToggleLock, onClear }: Props) {
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const accept = (e: DragEvent) => {
    if (e.dataTransfer.types.includes(DRAG_TYPE)) e.preventDefault();
  };
  const drop = (e: DragEvent, replaceId?: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDropTarget(null);
    const [source, id] = e.dataTransfer.getData(DRAG_TYPE).split(":");
    if (source === "pool" && id) onAdd(id, replaceId);
  };

  return (
    <section
      className={`roster ${dropTarget === "board" ? "is-drop" : ""}`}
      aria-label="Your roster"
      onDragOver={(e) => {
        accept(e);
        if (dropTarget === null) setDropTarget("board");
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropTarget(null);
      }}
      onDrop={(e) => drop(e)}
    >
      <div className="panel-head">
        <h2>Your roster</h2>
        <div className="panel-head-right">
          <span className={`count ${roster.length === ROSTER_SIZE ? "" : "is-short"}`}>
            {roster.length} of {ROSTER_SIZE} players
          </span>
          <button type="button" className="link-btn" onClick={onClear} disabled={roster.length === 0}>
            Clear all
          </button>
        </div>
      </div>

      {GROUPS.map(({ key, label }) => {
        const players = roster.filter((p) => p.group === key);
        const short = players.length < POSITION_MINIMUMS[key];
        return (
          <div key={key} className="group">
            <h3>
              <span className={`swatch g-${key}`} aria-hidden="true" />
              {label}
              <span className={`group-need ${short ? "is-short" : ""}`}>
                {players.length}, need {POSITION_MINIMUMS[key]}
              </span>
            </h3>
            <ul className="cards">
              {players.map((p) => {
                const isLocked = locked.includes(p.id);
                return (
                  <li
                    key={p.id}
                    className={`card g-${p.group} ${isLocked ? "is-locked" : ""} ${dropTarget === p.id ? "is-swap" : ""}`}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData(DRAG_TYPE, `roster:${p.id}`);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragOver={(e) => {
                      accept(e);
                      e.stopPropagation();
                      if (dropTarget !== p.id) setDropTarget(p.id);
                    }}
                    onDrop={(e) => drop(e, p.id)}
                  >
                    <Avatar player={p} size={44} />
                    <div className="card-main">
                      <span className="card-name">{p.name}</span>
                      <span className="card-meta">
                        {p.team} {p.pos}
                      </span>
                    </div>
                    <div className="card-nums">
                      <span className="num">{money(p.salary)}</span>
                      <span className="num muted">
                        {METRICS[metric].value(p).toFixed(1)} {METRICS[metric].short}
                      </span>
                    </div>
                    <div className="card-actions">
                      <button
                        type="button"
                        className={`icon-btn ${isLocked ? "is-on" : ""}`}
                        aria-pressed={isLocked}
                        aria-label={isLocked ? `Unlock ${p.name}` : `Lock ${p.name}`}
                        title={isLocked ? "Locked: re-optimizing keeps this player" : "Lock to keep when re-optimizing"}
                        onClick={() => onToggleLock(p.id)}
                      >
                        <LockIcon locked={isLocked} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label={`Remove ${p.name}`}
                        title="Remove from roster"
                        onClick={() => onRemove(p.id)}
                      >
                        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                          <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        </svg>
                      </button>
                    </div>
                  </li>
                );
              })}
              {players.length === 0 && <li className="empty">Drag a {label.toLowerCase().slice(0, -1)} here.</li>}
            </ul>
          </div>
        );
      })}
    </section>
  );
}

function LockIcon({ locked }: { locked: boolean }) {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <rect x="3" y="7" width="10" height="7" rx="1.5" fill={locked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" />
      <path
        d={locked ? "M5.5 7V5a2.5 2.5 0 015 0v2" : "M5.5 7V5a2.5 2.5 0 014.9-.7"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
