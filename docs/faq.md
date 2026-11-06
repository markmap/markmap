---
title: FAQ
---

## Why can't I have more than 6 levels of `#`?

Because this is how Markdown works. If you are new to Markdown, I suggest you go through the [Markdown Guide](https://www.markdownguide.org/).

`#` is used to create headings in Markdown. Either in Markdown or HTML we can have at most 6 levels of headings, aka. `<h1>` - `<h6>` in HTML.

In markmap, the concept of headings is weakened, but it is still subject to Markdown syntax. However you can use nested lists to create branches more than 6 levels deep.

## Why is my paragraph not on the map?

Only headings and list items become nodes. A paragraph becomes a [note](guide/writing.md#notes): click the dot beside its branch to read it.

## Why was my HTML dropped?

Labels and notes are structured data, not HTML, which is what makes clean SVG and PNG exports possible, and keeps Markdown from strangers safe to show. The exceptions are [magic comments](guide/magic-comments.md) and a single [`<img>` tag](guide/writing.md#images).

## Which renderer should I use?

SVG, unless your map is very large. Its text can be selected and read by screen readers, and it exports as vectors. Canvas stays smooth with thousands of nodes, but has no accessibility tree yet, so it is never picked for you. In the [editor](/editor) it is under **Options**.

## Do share links upload my document?

No. The document is compressed into the part of the URL after `#`, which browsers never send to a server. It also means a long document makes a long link.
