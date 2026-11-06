"""PE import-table negative regression: synthetic headers are NOT native GUI proof."""
import struct
import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from qa_windows_crt import PEImportError, assert_portable_crt, imports

def fake_pe(dll=b"KERNEL32.dll"):
    b=bytearray(0x800)
    b[:2]=b"MZ"
    struct.pack_into("<I",b,0x3c,0x80)
    b[0x80:0x84]=b"PE\0\0"
    struct.pack_into("<H",b,0x84,0x8664)
    struct.pack_into("<H",b,0x86,1)
    struct.pack_into("<H",b,0x94,240)
    struct.pack_into("<H",b,0x98,0x20b)
    struct.pack_into("<I",b,0x98+108,16)
    struct.pack_into("<II",b,0x98+120,0x2000,40)
    section=0x98+240
    b[section:section+8]=b".idata\0\0"
    struct.pack_into("<IIII",b,section+8,0x200,0x2000,0x200,0x400)
    struct.pack_into("<I",b,0x400+12,0x2040)
    b[0x440:0x440+len(dll)]=dll
    b[0x440+len(dll)]=0
    return bytes(b)

class WindowsCRT(unittest.TestCase):
    def test_static_imports_accept_dynamic_vcruntime_rejected(self):
        self.assertEqual(assert_portable_crt(fake_pe()),("KERNEL32.DLL",))
        for dll in (b"VCRUNTIME140.dll",b"VCRUNTIME140_1.dll",b"MSVCP140.dll"):
            with self.subTest(dll=dll),self.assertRaisesRegex(PEImportError,"externally installed VC runtime"):
                assert_portable_crt(fake_pe(dll))
    def test_malformed_tables_fail_closed(self):
        data=bytearray(fake_pe())
        for pos,value in [(0x98+120,0x77770000),(0x400+12,0xffff0000),(0x98+124,24)]:
            changed=bytearray(data)
            struct.pack_into("<I",changed,pos,value)
            with self.subTest(pos=hex(pos)),self.assertRaises(PEImportError):
                imports(bytes(changed))
        changed=bytearray(data)
        changed[0x440:0x640]=b"A"*0x200
        with self.assertRaisesRegex(PEImportError,"Unterminated"):
            imports(bytes(changed))
        with self.assertRaises(PEImportError):
            imports(b"not a PE")
if __name__=="__main__":
    unittest.main()
