#!/usr/bin/env python3
"""Fail-closed AMD64 PE import-table audit (not Windows 10 GUI acceptance)."""
from __future__ import annotations
import argparse
import json
import re
import struct
from pathlib import Path

class PEImportError(ValueError):
    pass

def imports(data: bytes) -> tuple[str, ...]:
    def u16(at):
        if at < 0 or at + 2 > len(data):
            raise PEImportError("Truncated PE word")
        return struct.unpack_from("<H", data, at)[0]
    def u32(at):
        if at < 0 or at + 4 > len(data):
            raise PEImportError("Truncated PE dword")
        return struct.unpack_from("<I", data, at)[0]
    if len(data) < 0x40 or data[:2] != b"MZ":
        raise PEImportError("Not a DOS/PE binary")
    pe = u32(0x3c)
    if pe < 0x40 or pe+24 > len(data) or data[pe:pe+4] != b"PE\0\0":
        raise PEImportError("Invalid PE header")
    if u16(pe+4) != 0x8664:
        raise PEImportError("Not AMD64")
    sections, optional_size, optional = u16(pe+6), u16(pe+20), pe+24
    if u16(optional) != 0x20b or optional_size < 128 or optional+optional_size > len(data):
        raise PEImportError("Invalid PE32+ optional header")
    if not 1 <= sections <= 96 or optional+optional_size+sections*40 > len(data):
        raise PEImportError("Invalid PE sections")
    if u32(optional+108) < 2:
        raise PEImportError("Missing PE import directory count")
    imports_rva, imports_size = u32(optional+120), u32(optional+124)
    if imports_rva == 0 or imports_size < 20 or imports_size > len(data):
        raise PEImportError("Missing/invalid PE import directory")
    section_table=[]
    for i in range(sections):
        off=optional+optional_size+i*40
        virtual_size,rva,raw_size,raw_off=[u32(off+j) for j in (8,12,16,20)]
        if raw_off > len(data) or raw_size > len(data)-raw_off:
            raise PEImportError("Out-of-bounds PE section raw data")
        section_table.append((rva,max(virtual_size,raw_size),raw_off,raw_size))
    def locate(rva,length):
        for start,span,raw,raw_size in section_table:
            if start <= rva and rva-start <= span-length and rva-start <= raw_size-length:
                return raw+(rva-start)
        raise PEImportError("PE import RVA has no bounded on-disk mapping")
    descriptor=locate(imports_rva,imports_size)
    names=[]
    terminated=False
    for off in range(descriptor,descriptor+imports_size-19,20):
        if data[off:off+20] == b"\0"*20:
            terminated=True
            break
        name_off=locate(u32(off+12),1)
        end=data.find(b"\0",name_off,min(len(data),name_off+256))
        if end < 0:
            raise PEImportError("Unterminated PE DLL import name")
        name=data[name_off:end]
        if not re.fullmatch(rb"[A-Za-z0-9_.-]+\.dll",name,re.IGNORECASE):
            raise PEImportError("Malformed PE DLL import name")
        names.append(name.decode("ascii").upper())
    if not terminated or not names:
        raise PEImportError("Unterminated/empty PE import table")
    return tuple(names)

def assert_portable_crt(data: bytes) -> tuple[str, ...]:
    imported=imports(data)
    external=[name for name in imported if name.startswith(("VCRUNTIME","MSVCP"))]
    if external:
        raise PEImportError("Windows portable depends on externally installed VC runtime: "+", ".join(external))
    return imported

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("binaries",nargs="+",type=Path)
    a=p.parse_args()
    report={p.name:list(assert_portable_crt(p.read_bytes())) for p in a.binaries}
    print(json.dumps({"status":"PASS_PORTABLE_PE_IMPORTS_NOT_GUI","imports":report},sort_keys=True,indent=2))

if __name__=="__main__":
    main()
