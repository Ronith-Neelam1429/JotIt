import test from 'node:test';
import assert from 'node:assert/strict';
import { documentBlocks, documentHtml, formatSelection, safeLink, toggleDocumentCheckbox, jotAsText, jotAsMarkdown } from '../src/lib/jot-format.ts';
import { emptyContent } from '../src/lib/jot-model.ts';

test('focused formatting renders headings, nested emphasis, underline, highlights, lists and links', () => {
  const source = '# Title\n\n**Bold *and italic***, <u>underlined</u>, ==highlighted==, [site](https://example.com)\n\n- [ ] Todo\n- [x] Done\n\n1. One\n2. Two';
  const blocks = documentBlocks(source);
  assert.equal(blocks[0].level, 1);
  const runs = blocks.flatMap((b) => b.runs);
  assert.ok(runs.some((r) => r.bold && r.italic));
  assert.ok(runs.some((r) => r.underline));
  assert.ok(runs.some((r) => r.highlight));
  assert.ok(runs.some((r) => r.href === 'https://example.com'));
  assert.deepEqual(blocks.filter((b) => b.checked !== undefined).map((b) => b.checked), [false, true]);
  assert.deepEqual(blocks.filter((b) => b.checked !== undefined).map((b) => b.runs.map((r) => r.text).join('')), ['Todo', 'Done']);
  assert.ok(blocks.some((b) => b.prefix === '2.'));
});
test('format actions respect selected lines and toggle inline formatting', () => {
  const bold = formatSelection('hello world', { start: 0, end: 5 }, 'bold');
  assert.equal(bold.text, '**hello** world');
  assert.equal(formatSelection(bold.text, bold.selection, 'bold').text, 'hello world');
  assert.equal(formatSelection('a\nb\nc', { start: 0, end: 4 }, 'number').text, '1. a\n2. b\nc');
  assert.equal(toggleDocumentCheckbox('- [ ] One\n- [x] Two', 1), '- [ ] One\n- [ ] Two');
});
test('export never turns raw HTML or unsafe links into active content', () => {
  const html = documentHtml('<script>alert(1)</script>\n\n[bad](javascript:alert)\n\n<img src=x onerror=alert(1)>');
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('<img'));
  assert.ok(!html.includes('href="javascript:'));
  assert.equal(safeLink('javascript:alert(1)'), null);
  assert.equal(safeLink('https://example.com'), 'https://example.com');
});
test('text and Markdown exports include quantity, note and completion but exclude deleted content', () => {
  const jot = { ...emptyContent(), title: 'Shop', entries: [{ id: 'a', text: '*Milk*', completed: true, quantity: '2 L', note: 'Oat', createdAt: 1 }], deletedEntries: [{ text: 'hidden' }] };
  assert.match(jotAsText(jot), /\[x\] \*Milk\* \(2 L\)\n    Oat/);
  assert.ok(jotAsMarkdown(jot).includes('\\*Milk\\*'));
  assert.ok(!jotAsText(jot).includes('hidden'));
});

test('PDF layout escapes titles and notes and leaves private organization and history out', async () => {
  const { jotAsHtml } = await import('../src/lib/jot-format.ts');
  const html = jotAsHtml({ ...emptyContent(), title: '<img src=x>', folder: 'private folder', tags: ['secret'],
    entries: [{ id: 'a', text: 'Milk', note: '<script>x</script>', completed: false, createdAt: 1 }] });
  assert.ok(html.includes('&lt;img src=x&gt;'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('private folder'));
  assert.ok(!html.includes('secret'));
});
