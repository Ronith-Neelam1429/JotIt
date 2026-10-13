import { Marked, type Token } from 'marked';
import type { JotContent } from '@/lib/jot-model';

const markdown = new Marked({ gfm: true, breaks: true });
for (const [name, opening, closing] of [['underline', '<u>', '</u>'], ['highlight', '==', '==']]) {
  markdown.use({ extensions: [{ name, level: 'inline',
    start: (source) => source.indexOf(opening),
    tokenizer(source) {
      if (!source.startsWith(opening)) return;
      const end = source.indexOf(closing, opening.length);
      if (end <= opening.length) return;
      return { type: name, raw: source.slice(0, end + closing.length), tokens: this.lexer.inlineTokens(source.slice(opening.length, end)) };
    },
  }] });
}
export type TextRun = { text: string; bold?: boolean; italic?: boolean; underline?: boolean; highlight?: boolean; href?: string };
export type DocumentBlock = { runs: TextRun[]; level?: number; prefix?: string; checked?: boolean; checkboxIndex?: number; indent?: number };
export function safeLink(value: string): string | null {
  const clean = value.trim();
  if (/[\s<>"'\u0000-\u001f]/.test(clean)) return null;
  try {
    const url = new URL(clean);
    return ['https:', 'http:', 'mailto:'].includes(url.protocol) ? clean : null;
  } catch { return null; }
}
function inlineRuns(tokens: Token[], marks: Omit<TextRun, 'text'> = {}): TextRun[] {
  return tokens.flatMap((token): TextRun[] => {
    const children = 'tokens' in token && Array.isArray(token.tokens) ? token.tokens as Token[] : [];
    if (token.type === 'strong') return inlineRuns(children, { ...marks, bold: true });
    if (token.type === 'em') return inlineRuns(children, { ...marks, italic: true });
    if (token.type === 'underline') return inlineRuns(children, { ...marks, underline: true });
    if (token.type === 'highlight') return inlineRuns(children, { ...marks, highlight: true });
    if (token.type === 'link') return inlineRuns(children, { ...marks, href: safeLink(token.href) ?? undefined });
    if (token.type === 'br') return [{ ...marks, text: '\n' }];
    if (children.length) return inlineRuns(children, marks);
    return [{ ...marks, text: 'text' in token && typeof token.text === 'string' ? token.text : token.raw }];
  });
}
export function documentBlocks(source: string): DocumentBlock[] {
  function blocks(tokens: Token[], indent = 0): DocumentBlock[] {
    return tokens.flatMap((token): DocumentBlock[] => {
      if (token.type === 'space') return [];
      if (token.type === 'list') return token.items.flatMap((item: { tokens: Token[]; task?: boolean; checked?: boolean }, index: number) => {
        const content = blocks(item.tokens.filter((child) => child.type !== 'checkbox'), indent + 1);
        const [first = { runs: [{ text: '' }] }, ...rest] = content;
        return [{ ...first, indent, prefix: item.task ? undefined : token.ordered ? `${Number(token.start) + index}.` : '•',
          ...(item.task ? { checked: Boolean(item.checked), checkboxIndex: 0 } : {}) }, ...rest];
      });
      if (token.type === 'blockquote') return blocks(token.tokens ?? [], indent);
      const tokens = 'tokens' in token && Array.isArray(token.tokens) ? token.tokens as Token[] : [];
      return [{ runs: tokens.length ? inlineRuns(tokens) : [{ text: 'text' in token ? String(token.text) : token.raw }],
        ...(token.type === 'heading' ? { level: Math.min(3, token.depth) } : {}), indent }];
    });
  }
  let checkboxIndex = 0;
  return blocks(markdown.lexer(source)).map((block) => block.checked === undefined ? block : { ...block, checkboxIndex: checkboxIndex++ });
}
export function plainDocument(source: string) {
  return documentBlocks(source).map((block) => `${block.checked === undefined ? block.prefix ? `${block.prefix} ` : '' : block.checked ? '[x] ' : '[ ] '}${block.runs.map((run) => run.href ? `${run.text} (${run.href})` : run.text).join('')}`).join('\n\n');
}
export type FormatAction = 'heading' | 'subheading' | 'bold' | 'italic' | 'underline' | 'bullet' | 'number' | 'checkbox' | 'highlight' | 'link';
export type Selection = { start: number; end: number };
export function formatSelection(source: string, selection: Selection, action: FormatAction, href = '') {
  const start = Math.max(0, Math.min(selection.start, source.length));
  const end = Math.max(start, Math.min(selection.end, source.length));
  const replace = (from: number, to: number, text: string, next: Selection) => ({ text: source.slice(0, from) + text + source.slice(to), selection: next });
  if (['heading', 'subheading', 'bullet', 'number', 'checkbox'].includes(action)) {
    const from = start === 0 ? 0 : source.lastIndexOf('\n', start - 1) + 1;
    const last = end > start && source[end - 1] === '\n' ? end - 1 : end;
    const newline = source.indexOf('\n', last);
    const to = newline === -1 ? source.length : newline;
    const lines = source.slice(from, to).split('\n');
    const prefix = (i: number) => ({ heading: '# ', subheading: '## ', bullet: '- ', number: `${i + 1}. `, checkbox: '- [ ] ' })[action as 'heading'];
    const remove = lines.every((line, i) => line.startsWith(prefix(i)));
    const text = lines.map((line, i) => remove ? line.slice(prefix(i).length)
      : prefix(i) + line.replace(/^(?:#{1,3}\s+|[-*+]\s+(?:\[[ xX]\]\s+)?|\d+\.\s+)/, '')).join('\n');
    return replace(from, to, text, { start: from, end: from + text.length });
  }
  const wrappers: Record<string, [string, string]> = { bold: ['**', '**'], italic: ['*', '*'], underline: ['<u>', '</u>'], highlight: ['==', '=='], link: ['[', `](${href})`] };
  const [open, close] = wrappers[action];
  const selected = source.slice(start, end) || (action === 'link' ? 'link text' : 'text');
  if (source.slice(Math.max(0, start - open.length), start) === open && source.slice(end, end + close.length) === close) {
    return replace(start - open.length, end + close.length, selected, { start: start - open.length, end: end - open.length });
  }
  if (selected.startsWith(open) && selected.endsWith(close) && selected.length > open.length + close.length) {
    const inner = selected.slice(open.length, -close.length);
    return replace(start, end, inner, { start, end: start + inner.length });
  }
  return replace(start, end, open + selected + close, { start: start + open.length, end: start + open.length + selected.length });
}
export function toggleDocumentCheckbox(source: string, index: number) {
  let current = 0;
  return source.replace(/^([ \t]*(?:[-*+]|\d+\.)\s+)\[([ xX])\]/gm, (match, prefix: string, check: string) => current++ === index ? `${prefix}[${check === ' ' ? 'x' : ' '}]` : match);
}
export function jotAsText(jot: JotContent) {
  return `${jot.title}\n\n${jot.kind === 'document' ? plainDocument(jot.documentContent) : jot.entries.map((entry) =>
    `${entry.completed ? '[x]' : '[ ]'} ${entry.text}${entry.quantity ? ` (${entry.quantity})` : ''}${entry.note ? `\n    ${entry.note.replace(/\n/g, '\n    ')}` : ''}`).join('\n')}`;
}
export function jotAsMarkdown(jot: JotContent) {
  const escape = (value: string) => value.replace(/[\\`*_[\]<>#]/g, '\\$&');
  return `# ${escape(jot.title)}\n\n${jot.kind === 'document' ? jot.documentContent : jot.entries.map((entry) =>
    `- [${entry.completed ? 'x' : ' '}] ${escape(entry.text)}${entry.quantity ? ` (${escape(entry.quantity)})` : ''}${entry.note ? `\n  ${escape(entry.note).replace(/\n/g, '\n  ')}` : ''}`).join('\n')}\n`;
}
export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
}
export function documentHtml(source: string) {
  return documentBlocks(source).map((block) => {
    const tag = block.level ? `h${block.level}` : 'p';
    const prefix = block.checked === undefined ? block.prefix ?? '' : block.checked ? '☑' : '☐';
    const html = block.runs.map((run) => {
      let text = escapeHtml(run.text).replace(/\n/g, '<br>');
      if (run.bold) text = `<strong>${text}</strong>`;
      if (run.italic) text = `<em>${text}</em>`;
      if (run.underline) text = `<u>${text}</u>`;
      if (run.highlight) text = `<mark>${text}</mark>`;
      if (run.href) text = `<a href="${escapeHtml(run.href)}">${text}</a>`;
      return text;
    }).join('');
    return `<${tag} style="margin-left:${(block.indent ?? 0) * 16}px">${prefix ? `${prefix} ` : ''}${html}</${tag}>`;
  }).join('\n');
}

export function jotAsHtml(jot: JotContent) {
  const body = jot.kind === 'document' ? documentHtml(jot.documentContent) : jot.entries.map((entry) =>
    `<div class="item"><span class="check">${entry.completed ? '☑' : '☐'}</span><div><p class="${entry.completed ? 'complete' : ''}">${escapeHtml(entry.text)}${entry.quantity ? ` <span class="quantity">${escapeHtml(entry.quantity)}</span>` : ''}</p>${entry.note ? `<p class="note">${escapeHtml(entry.note).replace(/\n/g, '<br>')}</p>` : ''}</div></div>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(jot.title)}</title>
<style>
@page { margin: 44pt; } * { box-sizing: border-box; } body { font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif; color: #203029; font-size: 12pt; line-height: 1.6; overflow-wrap: anywhere; }
header { border-bottom: 2px solid #25634D; margin-bottom: 24pt; padding-bottom: 18pt; } .brand { color: #25634D; font-size: 10pt; letter-spacing: 2pt; font-weight: 700; } h1 { font-size: 27pt; line-height: 1.2; } header h1 { margin: 10pt 0 0; } h2 { font-size: 20pt; } h3 { font-size: 16pt; } h1,h2,h3 { break-after: avoid; } p { margin: 0 0 10pt; } .item { display: flex; gap: 12pt; padding: 10pt 0; border-bottom: 1px solid #e4e8e3; break-inside: avoid; } .item p { margin: 0; white-space: pre-wrap; } .check { color: #25634D; font-size: 16pt; } .quantity { margin-left: 8pt; font-size: 10pt; color: #25634D; } .note { color: #67776e; font-size: 10pt; } .complete { color: #748179; text-decoration: line-through; } mark { background: #F7DE81; } a { color: #25634D; } footer { margin-top: 28pt; padding-top: 10pt; border-top: 1px solid #e4e8e3; color: #748179; font-size: 9pt; }
</style></head><body><header><div class="brand">JOTIT</div><h1>${escapeHtml(jot.title)}</h1></header><main>${body || '<p>This jot is empty.</p>'}</main><footer>A copy from JotIt</footer></body></html>`;
}
