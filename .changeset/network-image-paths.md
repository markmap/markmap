---
'@markmap/canvas': patch
'@markmap/cli': patch
---

On Windows, image URLs such as `//cdn.example.com/logo.png` and `\\host\share\logo.png` are no longer read as network shares, which stalled PNG export while Windows tried to reach the host.
