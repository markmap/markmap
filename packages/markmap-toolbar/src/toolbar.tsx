import * as React from '@gera2ld/jsx-dom';
import './style.css';

interface IToolbarItem {
  id?: string;
  title?: string;
  content: string;
  onClick?: (e: Event) => void;
}

function renderBrand() {
  return (
    <div className="mm-toolbar-brand">
      <img alt="markmap" src="/favicon.png" />
      <a href="https://markmap.js.org/">markmap</a>
    </div>
  );
}

function renderItem({ title, content, onClick }: IToolbarItem) {
  return (
    <div title={title} innerHTML={content} onClick={onClick} />
  );
}

let promise: any;
function safeCaller(fn) {
  return async (...args: any[]) => {
    if (promise) return;
    promise = fn(...args);
    try {
      await promise;
    } finally {
      promise = null;
    }
  };
}

export class Toolbar {
  private showBrand = true;

  private registry: { [id: string]: IToolbarItem } = {};

  private markmap = null;

  private items: (string | IToolbarItem)[] = ['zoomIn', 'zoomOut', 'fit'];

  static create(mm: any) {
    const toolbar = new Toolbar();
    toolbar.attach(mm);
    return toolbar.render();
  }

  static icon(path: string) {
    return `<svg width="20" height="20" viewBox="0 0 20 20" on:click={onZoomIn}><path fill="none" stroke-width="2" stroke="currentColor" d="${path}"/></svg>`;
  }

  constructor() {
    this.register({
      id: 'zoomIn',
      title: 'Zoom in',
      content: Toolbar.icon('M10 6 v8 M6 10 h8'),
      onClick: this.getHandler(mm => mm.rescale(1.25)),
    });
    this.register({
      id: 'zoomOut',
      title: 'Zoom out',
      content: Toolbar.icon('M6 10 h8'),
      onClick: this.getHandler(mm => mm.rescale(0.8)),
    });
    this.register({
      id: 'fit',
      title: 'Fit window size',
      content: Toolbar.icon('M4 8 h3 v-3 M4 12 h3 v3 M16 8 h-3 v-3 M16 12 h-3 v3'),
      onClick: this.getHandler(mm => mm.fit()),
    });
  }

  setBrand(show: boolean) {
    this.showBrand = show;
  }

  register(data: IToolbarItem & { id: string }) {
    this.registry[data.id] = data;
  }

  getHandler(handle: (mm: any) => void) {
    handle = safeCaller(handle);
    return (e) => {
      if (this.markmap) handle(this.markmap);
    };
  }

  setItems(items: (string | IToolbarItem)[]) {
    this.items = [...items];
  }

  attach(mm: any) {
    this.markmap = mm;
  }

  render() {
    const items = this.items.map((item: string | IToolbarItem): IToolbarItem => {
      if (typeof item === 'string') {
        const data = this.registry[item];
        if (!data) console.warn(`[markmap-toolbar] ${item} not found`);
        return data;
      }
      return item;
    }).filter(Boolean);
    return (
      <div className="mm-toolbar">
        {this.showBrand && renderBrand()}
        {items.map(renderItem)}
      </div>
    );
  }
}
