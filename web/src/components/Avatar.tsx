import { useState } from "react";
import { headshot, initials } from "../metrics";
import type { Player } from "../types";

export function Avatar({ player, size }: { player: Player; size: number }) {
  const [failed, setFailed] = useState(false);
  const src = headshot(player);
  return (
    <span className={`avatar g-${player.group}`} style={{ width: size, height: size }} aria-hidden="true">
      {src && !failed ? (
        <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <span className="avatar-initials">{initials(player.name)}</span>
      )}
    </span>
  );
}
