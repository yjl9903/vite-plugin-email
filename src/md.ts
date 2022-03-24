import MarkdownIt from 'markdown-it';
import { build, mergeConfig, Plugin } from 'vite';
import { debug as createDebug } from 'debug';
// @ts-ignore
import MarkdownItTitle from 'markdown-it-title';

import type { UserConfig } from './types';

export const REPLACER = `<!-- email -->`;

const debug = createDebug('vmail:md');

export interface RenderOption {
  vite: UserConfig;

  template: string;

  frontmatter?: Record<string, any>;
}

export interface RenderOutput {
  content: string;

  subject?: string;
}

export async function render(option: RenderOption): Promise<RenderOutput> {
  const ctx: any = {};
  const output = await build(
    mergeConfig(option.vite, {
      plugins: [
        createMdPlugin(ctx, option.template, option.frontmatter),
        <Plugin>{
          name: 'vmail:index',
          apply: 'build',
          transformIndexHtml(html) {
            return html.replace(/<script[\s\S]*>[\s\S]*<\/script>/g, '');
          }
        }
      ]
    })
  );

  return {
    // @ts-ignore
    content: output.output.find((o) => o.fileName === 'index.html').source,
    subject: ctx.title
  };
}

export function createMarkownIt(
  frontmatter: Record<string, any> = {},
  option = { frontmatter: true }
) {
  const markdown = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true
  }).use(MarkdownItTitle);

  if (option.frontmatter) {
    markdown.inline.ruler.push('frontmatter', (state) => {
      if (state.src.charCodeAt(state.pos) !== 0x7b /* { */) {
        return false;
      }
      if (state.src.charCodeAt(state.pos + 1) !== 0x7b /* { */) {
        return false;
      }
      let pos = state.pos + 2;
      for (; pos + 1 < state.src.length; pos++) {
        if (
          state.src.charCodeAt(pos) === 0x7d /* } */ &&
          state.src.charCodeAt(pos + 1) === 0x7d /* } */
        ) {
          const varName = state.src.slice(state.pos + 2, pos - 1).trim();
          if (varName in frontmatter) {
            state.pending += frontmatter[varName];
            break;
          } else {
            // fail to find varName
            debug(varName);
            throw new Error(`"${varName}" not found when render Markdown`);
          }
        } else {
          const tmp = state.src.slice(state.pos + 2, pos).trim();
          if (/\s/.test(tmp)) {
            return false;
          }
        }
      }
      state.pos = pos + 2;
      return true;
    });
  }

  return markdown;
}

function createMdPlugin(
  ctx: Record<string, string>,
  template: string,
  frontmatter: Record<string, any> = {}
): Plugin {
  const markdown = createMarkownIt(frontmatter);

  return {
    name: 'vmail:md',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace(REPLACER, markdown.render(template, ctx));
    }
  };
}

if (import.meta.vitest) {
  const { it, expect } = import.meta.vitest;

  it('parse md', () => {
    const md = createMarkownIt({ name: 'world', id: '123' });
    expect(md.render('# Hello {{ id }} - {{ name }}\n\nMy id is {{ id }}')).toMatchInlineSnapshot(`
      "<h1>Hello 123 - world</h1>
      <p>My id is 123</p>
      "
    `);
  });

  it('render zh key', () => {
    const md = createMarkownIt({ 姓名: 'world', 编号1: '123' });
    expect(md.render('# Hello {{ 编号1 }} - {{ 姓名 }}\n\nMy id is {{ 编号1 }}'))
      .toMatchInlineSnapshot(`
      "<h1>Hello 123 - world</h1>
      <p>My id is 123</p>
      "
    `);
  });
}
