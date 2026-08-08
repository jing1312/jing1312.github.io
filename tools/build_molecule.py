"""Fetch artemisinin 3D structure from PubChem and emit a compact JSON for the WebGL scene.

PubChem CID 68827 = artemisinin (青蒿素).
Output: site/data/molecule.json  {atoms:[{el,x,y,z}], bonds:[[i,j,order]], meta:{...}}
Coordinates are centred on the centroid and scaled so the max radius == 1.0,
so the renderer can size it with a single multiplier.
"""

from __future__ import annotations

import json
import math
import urllib.request
from pathlib import Path

CID = 68827
SDF_URL = (
    f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/{CID}"
    "/record/SDF?record_type=3d"
)


def fetch_sdf(url: str = SDF_URL) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "biomni-site-builder/1.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        if r.status != 200:
            raise RuntimeError(f"PubChem returned HTTP {r.status}")
        return r.read().decode("utf-8")


def parse_sdf_v2000(sdf: str) -> tuple[list[dict], list[list[int]]]:
    """Parse the first molecule of a V2000 SDF. Fixed-width counts line per spec."""
    lines = sdf.splitlines()
    counts = lines[3]
    if "V2000" not in counts:
        raise ValueError(f"expected V2000 connection table, got: {counts!r}")
    n_atoms = int(counts[0:3])
    n_bonds = int(counts[3:6])

    atoms: list[dict] = []
    for ln in lines[4 : 4 + n_atoms]:
        # xxxxxxxxxxyyyyyyyyyyzzzzzzzzzz aaa ...
        x, y, z = float(ln[0:10]), float(ln[10:20]), float(ln[20:30])
        el = ln[31:34].strip()
        atoms.append({"el": el, "x": x, "y": y, "z": z})

    bonds: list[list[int]] = []
    for ln in lines[4 + n_atoms : 4 + n_atoms + n_bonds]:
        i, j, order = int(ln[0:3]) - 1, int(ln[3:6]) - 1, int(ln[6:9])
        bonds.append([i, j, order])

    return atoms, bonds


def normalise(atoms: list[dict]) -> tuple[list[dict], float]:
    """Centre on centroid, scale so max |r| == 1."""
    cx = sum(a["x"] for a in atoms) / len(atoms)
    cy = sum(a["y"] for a in atoms) / len(atoms)
    cz = sum(a["z"] for a in atoms) / len(atoms)
    out = [{"el": a["el"], "x": a["x"] - cx, "y": a["y"] - cy, "z": a["z"] - cz} for a in atoms]
    rmax = max(math.sqrt(a["x"] ** 2 + a["y"] ** 2 + a["z"] ** 2) for a in out)
    for a in out:
        a["x"] = round(a["x"] / rmax, 5)
        a["y"] = round(a["y"] / rmax, 5)
        a["z"] = round(a["z"] / rmax, 5)
    return out, rmax


def build(out_path: Path) -> dict:
    sdf = fetch_sdf()
    atoms_raw, bonds = parse_sdf_v2000(sdf)
    atoms, rmax = normalise(atoms_raw)

    formula: dict[str, int] = {}
    for a in atoms:
        formula[a["el"]] = formula.get(a["el"], 0) + 1

    payload = {
        "meta": {
            "name": "artemisinin",
            "name_zh": "青蒿素",
            "source": "PubChem PUG-REST",
            "cid": CID,
            "record_type": "3d",
            "n_atoms": len(atoms),
            "n_bonds": len(bonds),
            "formula_heavy_atoms": formula,
            "original_max_radius_angstrom": round(rmax, 4),
            "note": "coordinates centred on centroid and scaled to unit max radius",
        },
        "atoms": atoms,
        "bonds": bonds,
    }
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
    return payload


if __name__ == "__main__":
    p = Path(__file__).resolve().parents[1] / "site" / "data" / "molecule.json"
    d = build(p)
    print(f"wrote {p}  ({p.stat().st_size} bytes)")
    print(f"  atoms={d['meta']['n_atoms']}  bonds={d['meta']['n_bonds']}")
    print(f"  heavy-atom composition={d['meta']['formula_heavy_atoms']}")
    print(f"  original max radius={d['meta']['original_max_radius_angstrom']} A")
    print(f"  bond order histogram={ {o: sum(1 for b in d['bonds'] if b[2] == o) for o in sorted({b[2] for b in d['bonds']}) } }")
