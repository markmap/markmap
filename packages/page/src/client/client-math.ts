import { mathContent, remarkMath } from '@markmap/plugin-math';
import { defaultContentPlugins } from '@markmap/render';
import { boot } from './boot';

boot({ plugins: [...defaultContentPlugins, mathContent] }, { plugins: [remarkMath] });
