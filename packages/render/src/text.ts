import type { FontStyle, Inline, Measurer, Paint, Size, TextRun } from '@markmap/core';

export interface TextLayout extends Size {
  runs: TextRun[];
  lines: number;
}

export interface TextLayoutOptions {
  font: FontStyle;
  fill?: Paint;
  /** Wrap lines longer than this, in px. `0` or less disables wrapping. */
  maxWidth?: number;
  measurer: Measurer;
}

interface Piece {
  text: string;
  font: FontStyle;
}

/** A run of pieces with no break opportunity inside. */
interface Unit {
  pieces: Piece[];
  width: number;
  space: boolean;
  newline: boolean;
}

/** Turn inline content into styled pieces. Styles not supported yet fall back to plain text. */
export function flattenInline(content: readonly Inline[], base: FontStyle): Piece[] {
  const pieces: Piece[] = [];
  const visit = (nodes: readonly Inline[], font: FontStyle) => {
    for (const node of nodes) {
      if (node.type === 'strong') visit(node.children, { ...font, weight: 700 });
      else if (node.type === 'emphasis') visit(node.children, { ...font, style: 'italic' });
      else if (node.type === 'break') pieces.push({ text: '\n', font });
      else if (node.type === 'image' || node.type === 'imageReference')
        pieces.push({ text: node.alt ?? '', font });
      else if ('value' in node) pieces.push({ text: node.value, font });
      else if ('children' in node) visit(node.children as Inline[], font);
    }
  };
  visit(content, base);
  return pieces;
}

const segmenter = new Intl.Segmenter(undefined, { granularity: 'word' });
const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
const CJK = /[\u2e80-\u9fff\uac00-\ud7a3\uf900-\ufaff\uff00-\uffef]/u;
/** Characters that must not start a line. */
const NO_BREAK_BEFORE = /^[\p{Pe}\p{Pf}\p{Po}\u3001\u3002\uff0c\uff01\uff1f]/u;

/** Split pieces into unbreakable units, using word boundaries and CJK rules. */
function toUnits(pieces: Piece[], measurer: Measurer): Unit[] {
  const units: Unit[] = [];
  let current: Unit | undefined;
  let prevSpace = true;
  let prevText = '';

  for (const piece of pieces) {
    for (const lineText of piece.text.split(/(\n)/)) {
      if (lineText === '\n') {
        units.push({ pieces: [], width: 0, space: false, newline: true });
        current = undefined;
        prevSpace = true;
        continue;
      }
      for (const { segment } of segmenter.segment(lineText)) {
        const space = /^\s+$/.test(segment);
        const breakable =
          space ||
          prevSpace ||
          ((CJK.test(segment[0]) || CJK.test(prevText.at(-1) ?? '')) &&
            !NO_BREAK_BEFORE.test(segment));
        const text = space ? ' ' : segment;
        if (!current || breakable || current.space) {
          current = { pieces: [], width: 0, space, newline: false };
          units.push(current);
        }
        const last = current.pieces.at(-1);
        if (last && last.font === piece.font) last.text += text;
        else current.pieces.push({ text, font: piece.font });
        current.width += measurer.measure(text, piece.font);
        prevSpace = space;
        prevText = segment;
      }
    }
  }
  return units;
}

/** Break a unit wider than `maxWidth` into grapheme-sized units. */
function splitUnit(unit: Unit, measurer: Measurer): Unit[] {
  const result: Unit[] = [];
  for (const piece of unit.pieces) {
    for (const { segment } of graphemes.segment(piece.text)) {
      const width = measurer.measure(segment, piece.font);
      result.push({
        pieces: [{ text: segment, font: piece.font }],
        width,
        space: false,
        newline: false,
      });
    }
  }
  return result;
}

/** Lay out inline content into positioned runs, wrapping at `maxWidth`. */
export function layoutText(content: readonly Inline[], options: TextLayoutOptions): TextLayout {
  const { font, fill, measurer } = options;
  const maxWidth = options.maxWidth ?? 0;
  const lines: Unit[][] = [[]];
  let lineWidth = 0;

  const push = (unit: Unit) => {
    const line = lines.at(-1)!;
    if (unit.newline) {
      lines.push([]);
      lineWidth = 0;
      return;
    }
    if (unit.space && !line.length) return;
    if (maxWidth > 0 && !unit.space && line.length && lineWidth + unit.width > maxWidth) {
      while (line.at(-1)?.space) lineWidth -= line.pop()!.width;
      lines.push([]);
      lineWidth = 0;
      if (unit.width > maxWidth) return void splitUnit(unit, measurer).forEach(push);
    } else if (maxWidth > 0 && !line.length && unit.width > maxWidth && unit.pieces.length) {
      const parts = splitUnit(unit, measurer);
      if (parts.length > 1) return void parts.forEach(push);
    }
    lines.at(-1)!.push(unit);
    lineWidth += unit.width;
  };
  for (const unit of toUnits(flattenInline(content, font), measurer)) push(unit);

  const runs: TextRun[] = [];
  let width = 0;
  lines.forEach((line, index) => {
    while (line.at(-1)?.space) line.pop();
    const baseline = index * font.lineHeight + (font.lineHeight + font.size * 0.7) / 2;
    let x = 0;
    for (const piece of line.flatMap((unit) => unit.pieces)) {
      const last = runs.at(-1);
      if (last && last.y === baseline && last.font === piece.font) last.text += piece.text;
      else runs.push({ text: piece.text, x, y: baseline, font: piece.font, ...(fill && { fill }) });
      x += measurer.measure(piece.text, piece.font);
    }
    width = Math.max(width, x);
  });
  return { runs, width, height: lines.length * font.lineHeight, lines: lines.length };
}
