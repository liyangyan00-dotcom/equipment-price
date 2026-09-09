// One request at a time; timers start only after the preceding request settles.
export function createCollectionPoller(options: {
  load: (full: boolean, signal: AbortSignal) => Promise<boolean>;
  visible: () => boolean;
  onError: (error: unknown) => void;
  intervalMs?: number;
  schedule?: (callback: () => void, delay: number) => ReturnType<typeof setTimeout> | number;
  cancel?: (timer: ReturnType<typeof setTimeout> | number) => void;
}) {
  const schedule = options.schedule ?? setTimeout;
  const cancel = options.cancel ?? clearTimeout;
  let timer: ReturnType<typeof setTimeout> | number | undefined;
  let controller: AbortController | undefined;
  let disposed = false;
  let full = true;
  let active = true;
  let failures = 0;
  let awakened = false;
  const clear = () => { if (timer !== undefined) cancel(timer); timer = undefined; };
  const queue = () => {
    clear();
    if (!disposed && !controller && options.visible() && failures < 5 && (active || full)) {
      timer = schedule(() => { timer = undefined; void run(); }, Math.min(300_000, (options.intervalMs ?? 30_000) * 2 ** failures));
    }
  };
  const run = async () => {
    if (disposed || controller || !options.visible()) return;
    controller = new AbortController();
    const signal = controller.signal;
    const requestedFull = full;
    full = false;
    awakened = false;
    try {
      const nextActive = await options.load(requestedFull, signal);
      if (signal.aborted) { full ||= requestedFull; }
      else { active = nextActive || awakened; failures = 0; }
    } catch (error) {
      full ||= requestedFull;
      if (!signal.aborted) {
        const status = Number((error as { status?: number } | null)?.status);
        failures = status === 401 || status === 403 ? 5 : failures + 1;
        options.onError(error);
        controller.abort();
      }
    } finally {
      controller = undefined;
      queue();
    }
  };
  return {
    start() { void run(); },
    wake() { awakened = true; active = true; queue(); },
    refresh() { failures = 0; full = true; clear(); void run(); },
    visibilityChanged() {
      clear();
      if (!options.visible()) controller?.abort();
      else queue();
    },
    dispose() { disposed = true; clear(); controller?.abort(); },
  };
}
