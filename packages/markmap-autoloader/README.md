# markmap-autoloader

![NPM](https://img.shields.io/npm/v/markmap-autoloader.svg)
![License](https://img.shields.io/npm/l/markmap-autoloader.svg)
![Downloads](https://img.shields.io/npm/dt/markmap-autoloader.svg)

Load markmaps automatically in HTML.

## Usage

HTML:

```html
<style>
.markmap > svg {
  width: 100%;
  height: 300px;
}
</style>

<div class="markmap">
- markmap
  - autoloader
  - transformer
  - view
</div>
```

Autoload all `.markmap`:

```html
<script src="https://cdn.jsdelivr.net/npm/markmap-autoloader"></script>
```

Load manually:

```html
<script>
window.markmap = {
  autoLoader: { manual: true },
};
</script>
<script src="https://cdn.jsdelivr.net/npm/markmap-autoloader"></script>
<script>
// Render in 5s
setTimeout(() => {
  markmap.autoLoader.renderAll();
}, 5000);
</script>
```

## API

### markmap.autoLoader.renderAll()

Render all `.markmap`s.

### markmap.autoLoader.renderAllUnder(el)

Render all `.markmap`s under container `el`.

### markmap.autoLoader.render(el)

Render markmap in `el`, which is supposed to have the class name `markmap`.
