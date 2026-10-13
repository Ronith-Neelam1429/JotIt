import { Share } from 'react-native';
import { jotAsHtml, jotAsMarkdown, jotAsText } from '@/lib/jot-format';
import type { Jot } from '@/lib/jot-model';

export async function shareJotCopy(jot: Jot) {
  await Share.share({ title: jot.title, message: jotAsText(jot) }, { dialogTitle: `Share ${jot.title}`, subject: jot.title });
}
export async function exportJot(jot: Jot, format: 'txt' | 'md' | 'pdf') {
  // Load native export modules only when requested, so older development builds can still open jots.
  const { File, Paths } = await import('expo-file-system');
  const Sharing = await import('expo-sharing');
  if (!await Sharing.isAvailableAsync()) throw new Error('File sharing is not available on this device. Use Share a copy instead.');
  const name = jot.title.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '').trim().replace(/^[. ]+/, '').slice(0, 70) || 'Jot';
  const file = new File(Paths.cache, `${name}-${Date.now()}.${format}`);
  if (format === 'pdf') {
    const Print = await import('expo-print');
    const { uri } = await Print.printToFileAsync({ html: jotAsHtml(jot) });
    const rendered = new File(uri);
    rendered.move(file);
  } else {
    file.write(format === 'txt' ? jotAsText(jot) : jotAsMarkdown(jot));
  }
  await Sharing.shareAsync(file.uri, { mimeType: format === 'pdf' ? 'application/pdf' : format === 'txt' ? 'text/plain' : 'text/markdown', UTI: format === 'pdf' ? 'com.adobe.pdf' : 'public.plain-text', dialogTitle: `Export ${jot.title}` });
}
