import {
  defineComponent,
  h,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  type DefineComponent,
  type PropType,
} from 'vue';
import { createMindmap } from 'markmap-embed';
import type {
  MindmapEmbed,
  MindmapEmbedOptions,
  MindmapUpdateOptions,
} from 'markmap-embed';

type MindmapUpdateResult = Parameters<
  NonNullable<MindmapEmbedOptions['onUpdate']>
>[0];
type MindmapNodeEvent = Parameters<
  NonNullable<MindmapEmbedOptions['onNodeClick']>
>[0];

export interface MarkmapExpose {
  getEmbed(): MindmapEmbed | undefined;
}

export interface MarkmapProps {
  content?: string;
  transformer?: MindmapEmbedOptions['transformer'];
  parserOptions?: MindmapUpdateOptions['parserOptions'];
  viewOptions?: MindmapUpdateOptions['viewOptions'];
  theme?: MindmapEmbedOptions['theme'];
  autoFit?: boolean;
  autoResize?: MindmapEmbedOptions['autoResize'];
}

export const Markmap = defineComponent({
  name: 'Markmap',
  props: {
    content: {
      type: String,
      default: '',
    },
    transformer: Object as PropType<MindmapEmbedOptions['transformer']>,
    parserOptions: Object as PropType<MindmapUpdateOptions['parserOptions']>,
    viewOptions: Object as PropType<MindmapUpdateOptions['viewOptions']>,
    theme: Object as PropType<MindmapEmbedOptions['theme']>,
    autoFit: Boolean,
    autoResize: [Boolean, Object] as PropType<
      MindmapEmbedOptions['autoResize']
    >,
  },
  emits: {
    ready: (embed: MindmapEmbed) => {
      void embed;
      return true;
    },
    update: (result: MindmapUpdateResult) => {
      void result;
      return true;
    },
    error: (error: unknown) => {
      void error;
      return true;
    },
    destroy: (embed: MindmapEmbed) => {
      void embed;
      return true;
    },
    nodeClick: (event: MindmapNodeEvent) => {
      void event;
      return true;
    },
    nodeToggle: (event: MindmapNodeEvent) => {
      void event;
      return true;
    },
  },
  setup(props, { attrs, emit, expose }) {
    const container = ref<HTMLElement>();
    const embed = ref<MindmapEmbed>();
    let controller: AbortController | undefined;
    let mounted = false;
    let renderedContent = props.content || '';
    let latestContent = renderedContent;

    async function updateContent(content: string) {
      if (!embed.value || content === renderedContent) return;
      renderedContent = content;
      try {
        await embed.value.update(content);
      } catch (error) {
        emit('error', error);
      }
    }

    expose({
      getEmbed: () => embed.value,
    } satisfies MarkmapExpose);

    watch(
      () => props.content,
      (content) => {
        latestContent = content || '';
        void updateContent(latestContent);
      },
    );

    onMounted(() => {
      if (!container.value) return;
      mounted = true;
      controller = new AbortController();

      createMindmap(container.value, {
        content: renderedContent,
        transformer: props.transformer,
        parserOptions: props.parserOptions,
        viewOptions: props.viewOptions,
        theme: props.theme,
        autoFit: props.autoFit,
        autoResize: props.autoResize,
        signal: controller.signal,
        onUpdate: (result) => emit('update', result),
        onError: (error) => emit('error', error),
        onDestroy: (nextEmbed) => emit('destroy', nextEmbed),
        onNodeClick: (event) => emit('nodeClick', event),
        onNodeToggle: (event) => emit('nodeToggle', event),
      })
        .then((nextEmbed) => {
          if (!mounted) {
            nextEmbed.destroy();
            return;
          }
          embed.value = nextEmbed;
          emit('ready', nextEmbed);
          void updateContent(latestContent);
        })
        .catch((error: unknown) => {
          emit('error', error);
        });
    });

    onBeforeUnmount(() => {
      mounted = false;
      controller?.abort();
      embed.value = undefined;
    });

    return () => h('div', { ...attrs, ref: container });
  },
}) as DefineComponent<MarkmapProps>;

export default Markmap;
