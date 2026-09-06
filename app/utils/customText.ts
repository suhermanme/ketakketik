/** Normalize document whitespace into spaces for the single-line typing model. */
export async function loadCustomText(file: Pick<File, 'name' | 'size' | 'text'>): Promise<string> {
  if (!file.name.toLowerCase().endsWith('.txt')) throw new Error('Choose a plain text (.txt) file.');
  if (file.size > 1024 * 1024) throw new Error('Choose a text file smaller than 1 MB.');
  const raw = await file.text();
  if (/[\u0000-\u0008\u000E-\u001F\uFFFD]/.test(raw)) throw new Error('This file is not readable UTF-8 text. Save it as UTF-8 and try again.');
  const text = raw.replace(/^\uFEFF/, '').replace(/\s+/g, ' ').trim();
  if (!text) throw new Error('This file is empty. Choose a file containing text.');
  if (text.length > 20000) throw new Error('Choose an excerpt of up to 20,000 characters.');
  return text;
}
