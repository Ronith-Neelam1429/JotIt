import { jotAsMarkdown, jotAsText } from '@/lib/jot-format';
import type { Jot } from '@/lib/jot-model';

export async function shareJotCopy(jot: Jot) {
  if (!navigator.share) throw new Error('Sharing is not supported in this browser. Export a text file instead.');
  try { await navigator.share({ title: jot.title, text: jotAsText(jot) }); }
  catch (error) { if (!(error instanceof Error && error.name === 'AbortError')) throw error; }
}
export async function exportJot(jot: Jot, format: 'txt' | 'md') {
  const content = format === 'txt' ? jotAsText(jot) : jotAsMarkdown(jot);
  const uri = URL.createObjectURL(new Blob([content], { type: format === 'txt' ? 'text/plain;charset=utf-8' : 'text/markdown;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = uri;
  anchor.download = `${jot.title.replace(/[\\/:*?"<>|]/g, '').slice(0, 70) || 'Jot'}.${format}`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(uri), 1000);
}
