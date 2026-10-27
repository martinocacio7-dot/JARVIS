#!/usr/bin/env python3
"""Fetch pinned Vosk Spanish model data; no code from the mirror is executed."""
import argparse, hashlib, json, shutil, tempfile, urllib.request, zipfile
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument("--output", required=True)
args = parser.parse_args()
manifest = json.loads((ROOT / "android/wake-model.json").read_text())
output = Path(args.output).resolve()
cache = ROOT / "android/.gradle/wake-model"
cache.mkdir(parents=True, exist_ok=True)
archive = cache / "source.zip"
def digest(path):
    with path.open("rb") as f:
        value = hashlib.sha256()
        while chunk := f.read(1024 * 1024):
            value.update(chunk)
        return value.hexdigest()
if not archive.exists() or digest(archive) != manifest["archive_sha256"]:
    temporary = cache / "source.zip.tmp"
    try:
        with urllib.request.urlopen(manifest["mirror_url"], timeout=90) as response, temporary.open("wb") as f:
            size = 0
            while chunk := response.read(1024 * 1024):
                size += len(chunk)
                if size > 150 * 1024 * 1024:
                    raise ValueError("Model archive exceeds expected size")
                f.write(chunk)
        if digest(temporary) != manifest["archive_sha256"]:
            raise ValueError("Model source archive checksum mismatch")
        temporary.replace(archive)
    finally:
        temporary.unlink(missing_ok=True)
output.parent.mkdir(parents=True, exist_ok=True)
with tempfile.TemporaryDirectory(dir=output.parent, prefix="wake-assets-") as temp:
    prepared = Path(temp)
    model = prepared / "wake-model"
    with zipfile.ZipFile(archive) as z:
        for name, expected in manifest["files"].items():
            relative = Path(name)
            if relative.is_absolute() or ".." in relative.parts:
                raise ValueError("Invalid model path")
            content = z.read(manifest["archive_prefix"] + name)
            if hashlib.sha256(content).hexdigest() != expected:
                raise ValueError("Model file checksum mismatch: " + name)
            target = model / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(content)
    (prepared / "wake-model-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    if output.exists():
        shutil.rmtree(output)
    shutil.copytree(prepared, output)
print("Verified Spanish wake model assets prepared:", output)
