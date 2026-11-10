import { select } from 'd3-selection';
import type { Markmap } from './markmap';

/**
 * Connects user input to a map, using only its public API. Returns a function that
 * disconnects it again. The map itself listens to no input.
 */
export type Gestures = (mm: Markmap) => () => void;

/** Several sets of gestures as one. */
export function combineGestures(...list: Gestures[]): Gestures {
  return (mm) => {
    const stops = list.map((gestures) => gestures(mm));
    return () => {
      for (const stop of stops) stop();
    };
  };
}

/** Zoom with the wheel or pinch and pan by dragging, as the `zoom` and `pan` options allow. */
export const panZoomGestures: Gestures = (mm) => {
  const selection = select(mm.element);
  mm.zoomBehavior.filter((event: Event) => {
    if (event.type === 'wheel') return !!mm.options.zoom;
    if (event.type === 'dblclick') return false;
    const { button = 0, ctrlKey = false } = event as MouseEvent;
    return !!mm.options.pan && !ctrlKey && !button;
  });
  selection.call(mm.zoomBehavior);
  return () => {
    selection.on('.zoom', null);
  };
};

/**
 * Click a fold anchor to toggle it, or with Ctrl or Cmd to toggle everything below it too.
 * Click a note dot to show its notes. Links open themselves on backends that draw them.
 */
export const pointerGestures: Gestures = (mm) => {
  const element = mm.element as HTMLElement | SVGElement;
  const targetOf = ({ clientX, clientY }: MouseEvent) =>
    mm.hitAt(...mm.layoutPoint(clientX, clientY));

  // Typed as a plain listener: `Element` has no `click` entry in its event map.
  const handleClick = (event: Event) => {
    if (event.defaultPrevented) return;
    const mouse = event as MouseEvent;
    const target = targetOf(mouse);
    if (target?.kind === 'action' && target.action === 'notes') {
      if (target.nodeId === mm.openNoteId) mm.closeNotes();
      else void mm.openNotes(target.nodeId);
    } else if (target?.kind === 'link') {
      // SVG links follow themselves; other backends draw no link elements.
      if (!mm.backend.nativeLinks) {
        element.ownerDocument.defaultView?.open(target.href, '_blank', 'noopener,noreferrer');
      }
    } else if (target?.kind === 'toggle') {
      if (!mouse.ctrlKey && !mouse.metaKey) mm.toggle(target.nodeId);
      else if (mm.foldedIds.has(target.nodeId)) mm.expandAll(target.nodeId);
      else mm.foldAll(target.nodeId);
    }
  };

  /** Show that a target is clickable, whatever the backend draws it with. */
  const handleHover = (event: Event) => {
    const pointer = event as PointerEvent;
    // Dragging pans the view; leave its cursor alone.
    if (pointer.buttons) return;
    const target = targetOf(pointer);
    element.style.cursor = target && target.kind !== 'node' ? 'pointer' : '';
  };

  element.addEventListener('click', handleClick);
  element.addEventListener('pointermove', handleHover);
  return () => {
    element.removeEventListener('click', handleClick);
    element.removeEventListener('pointermove', handleHover);
    element.style.cursor = '';
  };
};

/** What a map uses unless the `gestures` option says otherwise. */
export const defaultGestures: Gestures = combineGestures(panZoomGestures, pointerGestures);
