import { MarkmapViewElement } from './element';

export * from './element';

// Nothing to register on a server, where importing this must still work.
if (typeof customElements !== 'undefined' && !customElements.get('markmap-view')) {
  customElements.define('markmap-view', MarkmapViewElement);
}

declare global {
  interface HTMLElementTagNameMap {
    'markmap-view': MarkmapViewElement;
  }
}
