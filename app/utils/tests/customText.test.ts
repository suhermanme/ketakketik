import { describe, expect, it } from 'vitest';
import { loadCustomText } from '../customText';
const file = (text: string, name = 'lesson.txt', size = text.length) => ({ name, size, text: async () => text });

describe('custom text files', () => {
  it('preserves words, punctuation and case while normalizing document whitespace', async () => {
    expect(await loadCustomText(file('\uFEFFHello, world!\r\n\tA new paragraph.  '))).toBe('Hello, world! A new paragraph.');
  });
  it('rejects empty, binary and unreadable text', async () => {
    for (const text of ['', ' \n\t ', 'binary\0data', '\uFFFD']) {
      await expect(loadCustomText(file(text))).rejects.toThrow();
    }
  });
  it('rejects unsupported files and overly large lessons', async () => {
    await expect(loadCustomText(file('document', 'document.pdf'))).rejects.toThrow('plain text');
    await expect(loadCustomText(file('hello', 'lesson.txt', 1024 * 1024 + 1))).rejects.toThrow('1 MB');
    await expect(loadCustomText(file('a'.repeat(20001)))).rejects.toThrow('20,000');
  });
});
