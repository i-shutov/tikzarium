#!/usr/bin/env python3
"""CI-only: record actual SHA-verified staged Mesa binary imports.

No package install, download, changes to DLL or user desktop. PE import tables
show required DLL names; an import-inventory success is NOT an OpenGL GUI PASS.
"""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from qa_windows_crt import imports, PEImportError

MESA = ("opengl32.dll", "libgallium_wgl.dll")


def inspect(root: Path) -> dict:
    if not root.is_dir():
        raise ValueError("MESA_STAGING_DIRECTORY_MISSING")
    staged = {}
    available = {p.name.lower() for p in root.glob("*.dll") if p.is_file()}
    for name in MESA:
        path = root / name
        if not path.is_file():
            raise ValueError(f"MESA_STAGED_CORE_MISSING:{name}")
        body = path.read_bytes()
        deps = sorted(set(imports(body)))
        staged[name] = {
            "sha256": hashlib.sha256(body).hexdigest(),
            "imports": deps,
            "imports_present_among_staged_dll": sorted(
                d for d in deps if d.lower() in available),
            "imports_not_staged_here": sorted(
                d for d in deps if d.lower() not in available),
        }
    return {
        "status":"PE_IMPORT_INVENTORY_ONLY_NOT_NATIVE_GUI_PASS",
        "source":"actual_exact_sha_staged_mesa_binary_imports",
        "staged_dll_count":len(available),
        "staged_dll_names":sorted(available),
        "dll":staged,
        "note":"Imports not staged may be supplied by Windows or other runtime; this inventory is diagnostic, not an automatic proof of missing OS DLLs."
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dll-root", type=Path, required=True)
    ap.add_argument("--output", type=Path, required=True)
    args = ap.parse_args()
    result=inspect(args.dll_root)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result,indent=2,sort_keys=True)+"\n",encoding="utf-8")
    print("STAGED_MESA_PE_IMPORT_INVENTORY_ONLY_NOT_GUI_PASS")
    for name, facts in result["dll"].items():
        print(name, "imports_not_staged_here=", ",".join(facts["imports_not_staged_here"]))


if __name__ == "__main__":
    main()
