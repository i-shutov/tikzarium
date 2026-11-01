"""Offline adversarial checks for the release dependency-lock auditor."""
import importlib.util
from pathlib import Path
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / "qa_cargo_lock.py"
spec = importlib.util.spec_from_file_location("qa_cargo_lock", SCRIPT)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class LockValidatorTests(unittest.TestCase):
    def setUp(self):
        self.packages = [
            f'[[package]]\nname = "{name}"\nversion = "0.1.0"\n'
            for name in sorted(module.WORKSPACE)
        ]
        self.packages.append(
            '[[package]]\nname = "dependency"\nversion = "1.0.0"\n'
            'source = "registry+https://github.com/rust-lang/crates.io-index"\n'
            'checksum = "' + "a" * 64 + '"\n'
        )

    def blob(self, version=4, packages=None):
        return (f"version = {version}\n\n" +
                "\n".join(self.packages if packages is None else packages)).encode()

    def test_valid_format_and_sha(self):
        result = module.inspect_lock(self.blob())
        self.assertEqual(result["registry_count"], 1)
        self.assertEqual(result["package_count"], 5)
        self.assertEqual(len(result["lock_sha256"]), 64)

    def test_missing_workspace_member_rejected(self):
        with self.assertRaisesRegex(ValueError, "omits"):
            module.inspect_lock(self.blob(packages=self.packages[1:]))

    def test_bad_registry_checksum_rejected(self):
        with self.assertRaisesRegex(ValueError, "SHA-256"):
            module.inspect_lock(self.blob().replace(b"a" * 64, b"garbage"))

    def test_duplicate_package_rejected(self):
        with self.assertRaisesRegex(ValueError, "Duplicate"):
            module.inspect_lock(self.blob(packages=self.packages + [self.packages[0]]))

    def test_unexpected_format_rejected(self):
        with self.assertRaisesRegex(ValueError, "version 4"):
            module.inspect_lock(self.blob(version=3))

    def test_corrupt_toml_rejected(self):
        with self.assertRaisesRegex(ValueError, "Invalid UTF-8"):
            module.inspect_lock(b"[[package]\x00")

    def test_git_blob_and_worktree_must_match_byte_for_byte(self):
        self.assertEqual(module.require_identical_lock(b"line\n", b"line\n"),
                         module.hashlib.sha256(b"line\n").hexdigest())
        with self.assertRaisesRegex(RuntimeError, "CRLF"):
            module.require_identical_lock(b"line\r\n", b"line\n")
        with self.assertRaisesRegex(RuntimeError, "working-tree bytes"):
            module.require_identical_lock(b"changed\n", b"line\n")

    def test_real_repository_lock_present_and_valid(self):
        lock_path = Path(__file__).resolve().parents[2] / "Cargo.lock"
        self.assertTrue(lock_path.is_file(), "Cargo.lock must be tracked in Git")
        result = module.inspect_lock(lock_path.read_bytes())
        self.assertGreater(result["registry_count"], 100)
        self.assertGreater(result["package_count"], result["registry_count"])


if __name__ == "__main__":
    unittest.main()
