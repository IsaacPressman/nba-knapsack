"""Build web/src/data/players.json from Basketball-Reference and NBA.com.

- 2026-27 salaries: basketball-reference.com/contracts/players.html (column y1)
- 2025-26 advanced stats: basketball-reference.com/leagues/NBA_2026_advanced.html
- NBA.com person IDs (for headshots): nba.com/players

Run:  venv/Scripts/python.exe scripts/fetch_data.py
"""

import html
import json
import re
import time
import unicodedata
import urllib.request
from pathlib import Path

CONTRACTS_URL = "https://www.basketball-reference.com/contracts/players.html"
ADVANCED_URL = "https://www.basketball-reference.com/leagues/NBA_2026_advanced.html"
NBA_PLAYERS_URL = "https://www.nba.com/players"

OUT = Path(__file__).resolve().parent.parent / "web" / "src" / "data" / "players.json"

MIN_MINUTES = 500

# Official 2026-27 figures announced by the NBA.
CAP = {
    "season": "2026-27",
    "statsSeason": "2025-26",
    "salaryCap": 164_961_000,
    "luxuryTax": 200_428_000,
    "firstApron": 209_015_000,
    "secondApron": 221_686_000,
    "minimumSalary": 148_465_000,
}

POSITION_GROUP = {"PG": "G", "SG": "G", "G": "G", "SF": "F", "PF": "F", "F": "F", "C": "C"}

ROW_RE = re.compile(r"<tr\s*>(.*?)</tr>", re.S)
CELL_RE = re.compile(r'<t[dh]([^>]*)>(.*?)</t[dh]>', re.S)
STAT_RE = re.compile(r'data-stat="([^"]+)"')
CSV_ID_RE = re.compile(r'data-append-csv="([^"]+)"')
CSK_RE = re.compile(r'csk="([^"]*)"')
TAG_RE = re.compile(r"<[^>]+>")


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode("utf-8")


def parse_rows(page: str):
    """Yield one dict per data row: {stat: (text, csk, attrs)}."""
    for row in ROW_RE.findall(page):
        cells = {}
        for attrs, inner in CELL_RE.findall(row):
            stat = STAT_RE.search(attrs)
            if not stat:
                continue
            stat = stat.group(1)
            csk = CSK_RE.search(attrs)
            cells[stat] = {
                "text": html.unescape(TAG_RE.sub("", inner)).strip(),
                "csk": csk.group(1) if csk else None,
                "attrs": attrs,
            }
        if cells:
            yield cells


def num(cell, default=None):
    if not cell:
        return default
    raw = cell["csk"] if cell["csk"] not in (None, "") else cell["text"]
    raw = raw.replace("$", "").replace(",", "")
    try:
        return float(raw)
    except ValueError:
        return default


def normalize_name(name: str) -> str:
    name = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    name = re.sub(r"[^a-z ]", "", name.lower())
    name = re.sub(r"\b(jr|sr|ii|iii|iv|v)\b", "", name)
    return " ".join(name.split())


def load_salaries():
    salaries = {}
    for cells in parse_rows(fetch(CONTRACTS_URL)):
        player = cells.get("player")
        if not player:
            continue
        pid = CSV_ID_RE.search(player["attrs"])
        salary = num(cells.get("y1"))
        if not pid or not salary:
            continue
        pid = pid.group(1)
        entry = {
            "name": player["text"],
            "team": cells.get("team_id", {}).get("text", ""),
            "salary": int(salary),
            "option": "player" if "salary-pl" in cells["y1"]["attrs"]
            else "team" if "salary-tm" in cells["y1"]["attrs"] else None,
        }
        # A player listed twice is usually dead money on an old team plus a new
        # deal; keep the larger figure as their cap hit.
        if pid not in salaries or entry["salary"] > salaries[pid]["salary"]:
            salaries[pid] = entry
    return salaries


def load_stats():
    stats = {}
    for cells in parse_rows(fetch(ADVANCED_URL)):
        name = cells.get("name_display")
        if not name:
            continue
        pid = CSV_ID_RE.search(name["attrs"])
        if not pid:
            continue
        pid = pid.group(1)
        # Traded players have a combined "2TM"/"3TM" row first; keep only it.
        if pid in stats:
            continue
        stats[pid] = {
            "pos": cells.get("pos", {}).get("text", ""),
            "age": num(cells.get("age")),
            "games": num(cells.get("games"), 0),
            "minutes": num(cells.get("mp"), 0),
            "ws": num(cells.get("ws"), 0),
            "vorp": num(cells.get("vorp"), 0),
            "bpm": num(cells.get("bpm"), 0),
            "per": num(cells.get("per"), 0),
        }
    return stats


def load_nba_ids():
    page = fetch(NBA_PLAYERS_URL)
    ids = {}
    for pid, last, first in re.findall(
        r'"PERSON_ID":(\d+),"PLAYER_LAST_NAME":"([^"]*)","PLAYER_FIRST_NAME":"([^"]*)"', page
    ):
        ids[normalize_name(f"{first} {last}")] = int(pid)
    return ids


def main():
    salaries = load_salaries()
    time.sleep(3)  # be polite to Basketball-Reference's rate limit
    stats = load_stats()
    try:
        nba_ids = load_nba_ids()
    except Exception as exc:  # headshots are optional
        print(f"warning: could not load NBA.com ids ({exc})")
        nba_ids = {}

    players = []
    for pid, contract in salaries.items():
        s = stats.get(pid)
        if not s or s["minutes"] < MIN_MINUTES:
            continue
        primary = s["pos"].split("-")[0]
        group = POSITION_GROUP.get(primary)
        if not group:
            continue
        players.append({
            "id": pid,
            "nbaId": nba_ids.get(normalize_name(contract["name"])),
            "name": contract["name"],
            "team": contract["team"],
            "pos": s["pos"],
            "group": group,
            "age": s["age"],
            "salary": contract["salary"],
            "option": contract["option"],
            "games": int(s["games"]),
            "minutes": int(s["minutes"]),
            "ws": s["ws"],
            "vorp": s["vorp"],
            "bpm": s["bpm"],
            "per": s["per"],
        })

    players.sort(key=lambda p: -p["salary"])
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"cap": CAP, "players": players}, indent=1), encoding="utf-8")

    missing_ids = sum(1 for p in players if p["nbaId"] is None)
    groups = {g: sum(1 for p in players if p["group"] == g) for g in "GFC"}
    print(f"wrote {len(players)} players to {OUT}")
    print(f"  salaries scraped: {len(salaries)}, stat lines: {len(stats)}")
    print(f"  position groups: {groups}, missing NBA ids: {missing_ids}")


if __name__ == "__main__":
    main()
