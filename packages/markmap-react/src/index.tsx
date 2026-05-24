import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type HTMLAttributes,
} from 'react';
import { createMindmap } from 'markmap-embed';
import type { MindmapEmbed, MindmapEmbedOptions } from 'markmap-embed';

export interface MarkmapProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'onError'>,
    Omit<MindmapEmbedOptions, 'signal'> {
  onReady?: (embed: MindmapEmbed) => void;
  onError?: (error: unknown) => void;
}

export interface MarkmapHandle {
  getEmbed(): MindmapEmbed | undefined;
}

export const Markmap = forwardRef<MarkmapHandle, MarkmapProps>(
  (
    {
      content = '',
      transformer,
      parserOptions,
      viewOptions,
      autoFit,
      autoResize,
      onReady,
      onUpdate,
      onError,
      onDestroy,
      ...containerProps
    },
    ref,
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const embedRef = useRef<MindmapEmbed>();

    useImperativeHandle(ref, () => ({
      getEmbed: () => embedRef.current,
    }));

    useEffect(() => {
      if (!containerRef.current) return;
      const controller = new AbortController();
      let mounted = true;

      createMindmap(containerRef.current, {
        content,
        transformer,
        parserOptions,
        viewOptions,
        autoFit,
        autoResize,
        signal: controller.signal,
        onUpdate,
        onDestroy,
      })
        .then((embed) => {
          if (!mounted) {
            embed.destroy();
            return;
          }
          embedRef.current = embed;
          onReady?.(embed);
        })
        .catch((error: unknown) => {
          if (mounted) onError?.(error);
        });

      return () => {
        mounted = false;
        controller.abort();
        embedRef.current = undefined;
      };
    }, []);

    useEffect(() => {
      if (!embedRef.current) return;
      embedRef.current.update(content).catch((error: unknown) => {
        onError?.(error);
      });
    }, [content]);

    return <div {...containerProps} ref={containerRef} />;
  },
);

Markmap.displayName = 'Markmap';

export default Markmap;
