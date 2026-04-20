# MWD Keystone Planner Exporter

Install this folder into your retail WoW addons directory:
- `_retail_\Interface\AddOns\MWDKeystonePlannerExporter`

Commands:
- `/mwdkp status`
- `/mwdkp export`
- `/mwdkp clear`

Export format:
```text
MWDKP1
character=Example-Realm
created=2026-03-24T04:00:00Z
run=Ara-Kara, City of Echoes|10|12|2|2026-03-24T04:10:00Z
```

Notes:
- The addon records the dungeon name, starting key level, resulting key level, and level delta for each completed run.
- Final key level capture is best effort. The addon prefers the in-game system message when it can read it and otherwise falls back to `start level + reported upgrade levels` from the completion event.
- Paste the exported text into `/mwd-kp-keys command:<export>` in Discord.
