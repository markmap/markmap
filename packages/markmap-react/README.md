# markmap-react

![NPM](https://img.shields.io/npm/v/markmap-react.svg)
![License](https://img.shields.io/npm/l/markmap-react.svg)
![Downloads](https://img.shields.io/npm/dt/markmap-react.svg)

React adapter for embeddable Markmap views.

## Install

```sh
npm install markmap-react
```

## Usage

```tsx
import { useRef, useState } from 'react';
import { Markmap, type MarkmapHandle } from 'markmap-react';

export function MindmapPanel() {
  const ref = useRef<MarkmapHandle>(null);
  const [content, setContent] = useState('# Strategy\n\n- Market\n- Product');

  return (
    <Markmap
      ref={ref}
      content={content}
      autoFit
      autoResize
      className="mindmap"
      onReady={(embed) => console.log(embed.element)}
      onError={(error) => console.error(error)}
    />
  );
}
```

The component creates and destroys the embed with React lifecycle. Use `ref.current?.getEmbed()` when the host app needs direct access.
