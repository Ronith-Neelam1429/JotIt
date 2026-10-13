import { type JotContent } from '@/lib/jot-model';

export type StarterTemplate = { id: string; title: string; description: string; content: Partial<JotContent> & Pick<JotContent, 'kind' | 'emoji'> };
export const STARTER_TEMPLATES: StarterTemplate[] = [
  { id: 'groceries', title: 'Weekly groceries', description: 'A head start for the next shop.', content: {
    kind: 'list', emoji: '🛒', accent: '#B7D7CF', entries: ['Fruit & vegetables', 'Milk', 'Bread', 'Eggs'].map((text) => ({ id: text, text, completed: false, createdAt: 0 })),
  } },
  { id: 'packing', title: 'Weekend away', description: 'The essentials, ready to check off.', content: {
    kind: 'list', emoji: '✈️', accent: '#B9CBE8', entries: ['Travel documents', 'Phone charger', 'Toiletries', 'Clothes', 'Medication'].map((text) => ({ id: text, text, completed: false, createdAt: 0 })),
  } },
  { id: 'meeting', title: 'Meeting notes', description: 'Give your ideas and next steps a place.', content: {
    kind: 'document', emoji: '💼', accent: '#D8C7E8', documentContent: '# Meeting notes\n\n## Agenda\n- \n\n## Discussion\n\n## Next steps\n- [ ] ',
  } },
  { id: 'reflection', title: 'Daily reflection', description: 'A quiet moment to look back.', content: {
    kind: 'document', emoji: '🌱', accent: '#F3C969', documentContent: '# Today\n\n## A good moment\n\n## What I learned\n\n## Tomorrow\n- [ ] ',
  } },
];
