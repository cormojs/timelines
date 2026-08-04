// Browser-side reader for the packaged .timeline format (zip with
// timeline.json + assets/ + notes/ + manifest.json). Mirrors
// electron/timelinePackage.cts; keep the two in sync.
import { unzipSync, strFromU8 } from 'fflate';
import { parseTimelinePackageManifestJson } from './json';

export const PACKAGE_FORMAT_VERSION = 1;

// Zip local-file-header magic; bare timelines start with '{'
export const isZipBuffer = (buf: Uint8Array | null | undefined): boolean =>
  Boolean(buf && buf.length >= 2 && buf[0] === 0x50 && buf[1] === 0x4b);

const sanitizeEntryPath = (name: string): string | null => {
  const parts = String(name || '')
    .split(/[/\\]/)
    .filter((p) => p && p !== '.');
  if (parts.length === 0) return null;
  if (parts.some((p) => p === '..' || /^[a-zA-Z]:$/.test(p))) return null;
  return parts.join('/');
};

export function readPackage(buf: Uint8Array | ArrayBuffer): {
  timelineJson: string;
  manifest: ReturnType<typeof parseTimelinePackageManifestJson> | null;
  assets: Record<string, Uint8Array>;
  notes: Record<string, string>;
} {
  const entries = unzipSync(buf instanceof Uint8Array ? buf : new Uint8Array(buf));
  const timelineRaw = entries['timeline.json'];
  if (!timelineRaw) throw new Error('Package is missing timeline.json');

  let manifest = null;
  if (entries['manifest.json']) {
    try {
      manifest = parseTimelinePackageManifestJson(strFromU8(entries['manifest.json']));
    } catch {
      /* ignore */
    }
  }

  const assets: Record<string, Uint8Array> = {};
  const notes: Record<string, string> = {};
  for (const [name, data] of Object.entries(entries)) {
    if (name.endsWith('/')) continue; // directory entry
    if (name.startsWith('assets/')) {
      const rel = sanitizeEntryPath(name.slice('assets/'.length));
      if (rel) assets[rel] = data;
    } else if (name.startsWith('notes/')) {
      const rel = sanitizeEntryPath(name.slice('notes/'.length));
      if (rel) notes[rel] = strFromU8(data);
    }
  }
  return { timelineJson: strFromU8(timelineRaw), manifest, assets, notes };
}
