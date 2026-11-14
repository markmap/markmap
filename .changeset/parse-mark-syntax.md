---
'@markmap/parse': patch
---

`==highlight==` is now parsed by a micromark extension, so escaped or encoded `=` (`\=`, `&#61;`, `&equals;`) never opens or closes a highlight. Runs of three or more `=` stay plain text, and delimiters follow the same flanking rules as `**`.
