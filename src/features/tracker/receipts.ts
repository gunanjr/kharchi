import { Directory, File, Paths } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { uuid } from '@/lib/id';

/** Receipts live in the app's private documents folder. The picker is the system file chooser: no storage or camera permission. */
const dir = () => new Directory(Paths.document, 'receipts');

export const isPdf = (uri: string) => /\.pdf$/i.test(uri);

/** Let the user choose an image or PDF and keep a private copy. Returns the stored file's uri, or null if cancelled. */
export async function pickReceipt(): Promise<string | null> {
  const r = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf'], copyToCacheDirectory: true });
  if (r.canceled || !r.assets?.[0]) return null;
  const a = r.assets[0];
  const ext = (a.name.match(/\.[A-Za-z0-9]{2,5}$/)?.[0] ?? (a.mimeType === 'application/pdf' ? '.pdf' : '.jpg')).toLowerCase();
  const d = dir();
  if (!d.exists) d.create();
  const dest = new File(d, `${uuid()}${ext}`);
  new File(a.uri).copy(dest);
  return dest.uri;
}

export function deleteReceipt(uri: string | null | undefined) {
  if (!uri) return;
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    /* already gone */
  }
}
