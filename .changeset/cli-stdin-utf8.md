---
'@markmap/cli': patch
---

The CLI no longer turns non-ASCII characters read from stdin into `�` when a character is split between input chunks.
