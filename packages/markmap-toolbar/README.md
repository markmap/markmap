# markmap-toolbar

Toolbar for [markmap](https://markmap.js.org/).

It embeds a few buttons to communicate with a markmap.

## Installation

```sh
$ npm i markmap-toolbar
```

## Usage

```js
import { Toolbar } from 'markmap-toolbar';

const { el } = Toolbar.create(mm);
el.style.position = 'absolute';
el.style.bottom = '0.5rem';
el.style.right = '0.5rem';
container.append(el);
```
