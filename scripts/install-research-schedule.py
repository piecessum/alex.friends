#!/usr/bin/env python3
"""Install a per-user macOS schedule. --preview writes the plist in .cache only."""
import os
import pathlib
import plistlib
import shutil
import subprocess
import sys

root = pathlib.Path(__file__).resolve().parent.parent
cache = root / ".cache"
cache.mkdir(exist_ok=True)
node = shutil.which("node")
if not node:
    raise SystemExit("Node.js is required")
label = "friends.alex.research"
config = {
    "Label": label,
    "ProgramArguments": [os.path.realpath(node), "--import", "tsx", str(root / "scripts/research-local.ts"), "--publish"],
    "WorkingDirectory": str(root),
    "EnvironmentVariables": {"PATH": os.pathsep.join([str(pathlib.Path(node).parent), "/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin", "/usr/sbin", "/sbin"])},
    "StartCalendarInterval": [{"Weekday": day, "Hour": hour, "Minute": 5} for day in range(1, 7) for hour in (8, 9)],
    "RunAtLoad": False,
    "ProcessType": "Background",
    "StandardOutPath": str(cache / "research-schedule.log"),
    "StandardErrorPath": str(cache / "research-schedule-error.log"),
}
preview = cache / f"{label}.plist"
preview.write_bytes(plistlib.dumps(config))
subprocess.run(["plutil", "-lint", str(preview)], check=True)
if "--preview" in sys.argv:
    print(f"Preview: {preview}")
    raise SystemExit(0)

dest = pathlib.Path.home() / "Library/LaunchAgents" / preview.name
dest.parent.mkdir(parents=True, exist_ok=True)
domain = f"gui/{os.getuid()}"
subprocess.run(["launchctl", "bootout", f"{domain}/{label}"], capture_output=True)
dest.write_bytes(preview.read_bytes())
subprocess.run(["launchctl", "bootstrap", domain, str(dest)], check=True)
print(f"Installed {label}: Mon–Sat 08:05, retry 09:05, in the Mac's local timezone.")
