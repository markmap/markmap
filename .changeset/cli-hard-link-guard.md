---
'@markmap/cli': patch
---

The CLI now also refuses to overwrite the input or an image it uses when the output is a hard link to that file, not only a symlink.
