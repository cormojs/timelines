type FontFaceLike = { family: string; status: string };
type FontFaceSetLike = Iterable<FontFaceLike> | null | undefined;

const NOOP = (): void => {};
const POLL_INTERVAL_MS = 100;

const normalizeFamily = (value: unknown): string =>
  String(value || '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .toLowerCase();

const firstFamily = (stack: unknown): string => normalizeFamily(String(stack || '').split(',')[0]);

// fonts.check() reports unknown families as available. Unicode-range siblings may stay unloaded.
export function isFontReady(fonts: FontFaceSetLike, fontStack: unknown): boolean {
  const family = firstFamily(fontStack);
  if (!fonts || !family) return true;
  try {
    for (const face of fonts) {
      if (normalizeFamily(face.family) === family && face.status === 'loaded') return true;
    }
  } catch {
    return true;
  }
  return false;
}

// WebKit may not fire loadingdone for runtime-injected stylesheets.
export function watchFontLoad(
  fonts: FontFaceSetLike,
  fontStack: unknown,
  onReady: () => void,
  timeoutMs: number,
): () => void {
  if (isFontReady(fonts, fontStack)) return NOOP;

  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    clearInterval(timer);
    clearTimeout(deadline);
    onReady();
  };

  const timer = setInterval(() => {
    if (isFontReady(fonts, fontStack)) finish();
  }, POLL_INTERVAL_MS);
  const deadline = setTimeout(finish, timeoutMs);

  return () => {
    done = true;
    clearInterval(timer);
    clearTimeout(deadline);
  };
}
