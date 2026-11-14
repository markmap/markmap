import type { CompileContext, Extension as FromMarkdownExtension } from 'mdast-util-from-markdown';
import { splice } from 'micromark-util-chunked';
import { classifyCharacter } from 'micromark-util-classify-character';
import { resolveAll } from 'micromark-util-resolve-all';
import type {
  Code,
  Event,
  Extension,
  Resolver,
  State,
  Token,
  TokenizeContext,
  Tokenizer,
} from 'micromark-util-types';
import type { Root } from 'mdast';
import type { Plugin } from 'unified';

declare module 'micromark-util-types' {
  interface TokenTypeMap {
    mark: 'mark';
    markSequence: 'markSequence';
    markSequenceTemporary: 'markSequenceTemporary';
    markText: 'markText';
  }
}

const EQUALS = 61;
// From `micromark-util-symbol`: what `classifyCharacter` returns for punctuation.
const PUNCTUATION = 2;

/** Whether each `==` sequence can open or close a mark, from its flanking characters. */
const sides = new WeakMap<Token, { open: boolean; close: boolean }>();

/**
 * micromark syntax for `==text==`, modeled on GFM strikethrough: a sequence of exactly two
 * `=` with the same flanking rules as `**`. Because it runs in the tokenizer, escapes
 * (`\=`), character references (`&#61;`) and code spans are never delimiters.
 */
export function markSyntax(): Extension {
  const construct = { name: 'mark', tokenize: tokenizeMark, resolveAll: resolveAllMark };
  return {
    text: { [EQUALS]: construct },
    insideSpan: { null: [construct] },
    attentionMarkers: { null: [EQUALS] },
  };
}

const resolveAllMark: Resolver = (events, context) => {
  for (let index = 0; index < events.length; index += 1) {
    const closer = events[index][1];
    if (
      events[index][0] !== 'enter' ||
      closer.type !== 'markSequenceTemporary' ||
      !sides.get(closer)?.close
    ) {
      continue;
    }
    for (let open = index - 1; open >= 0; open -= 1) {
      const opener = events[open][1];
      if (
        events[open][0] !== 'exit' ||
        opener.type !== 'markSequenceTemporary' ||
        !sides.get(opener)?.open
      ) {
        continue;
      }
      opener.type = 'markSequence';
      closer.type = 'markSequence';
      const mark: Token = { type: 'mark', start: { ...opener.start }, end: { ...closer.end } };
      const text: Token = { type: 'markText', start: { ...opener.end }, end: { ...closer.start } };
      const next: Event[] = [
        ['enter', mark, context],
        ['enter', opener, context],
        ['exit', opener, context],
        ['enter', text, context],
      ];
      const insideSpan = context.parser.constructs.insideSpan.null;
      if (insideSpan) {
        splice(
          next,
          next.length,
          0,
          resolveAll(insideSpan, events.slice(open + 1, index), context),
        );
      }
      splice(next, next.length, 0, [
        ['exit', text, context],
        ['enter', closer, context],
        ['exit', closer, context],
        ['exit', mark, context],
      ]);
      splice(events, open - 1, index - open + 3, next);
      index = open + next.length - 2;
      break;
    }
  }
  // Unpaired sequences are plain text.
  for (const [, token] of events) {
    if (token.type === 'markSequenceTemporary') token.type = 'data';
  }
  return events;
};

const tokenizeMark: Tokenizer = function (this: TokenizeContext, effects, ok, nok) {
  const { previous, events } = this;
  let size = 0;

  const more: State = (code: Code) => {
    if (code === EQUALS) {
      // `===` and longer runs are text.
      if (size > 1) return nok(code);
      effects.consume(code);
      size += 1;
      return more;
    }
    if (size < 2) return nok(code);
    const token = effects.exit('markSequenceTemporary');
    const before = classifyCharacter(previous);
    const after = classifyCharacter(code);
    sides.set(token, {
      open: !after || (after === PUNCTUATION && Boolean(before)),
      close: !before || (before === PUNCTUATION && Boolean(after)),
    });
    return ok(code);
  };

  return (code) => {
    // The middle of a longer run, unless the `=` before was escaped.
    if (previous === EQUALS && events.at(-1)?.[1].type !== 'characterEscape') return nok(code);
    effects.enter('markSequenceTemporary');
    return more(code);
  };
};

export function markFromMarkdown(): FromMarkdownExtension {
  return {
    canContainEols: ['mark'],
    enter: {
      mark(this: CompileContext, token) {
        this.enter({ type: 'mark', children: [] }, token);
      },
    },
    exit: {
      mark(this: CompileContext, token) {
        this.exit(token);
      },
    },
  };
}

/**
 * Turn `==text==` into `mark` nodes. Like `**`, delimiters can wrap other inline nodes
 * (`==a **b**==`) but not cross block boundaries.
 */
export const remarkMark: Plugin<[], Root> = function () {
  // unified calls plugins with the processor as `this`.
  const data = this.data();
  (data.micromarkExtensions ??= []).push(markSyntax());
  (data.fromMarkdownExtensions ??= []).push(markFromMarkdown());
};
