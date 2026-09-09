"use client";

import { useCallback, useEffect } from "react";

const message = "存在未保存修改，确定放弃并离开吗？";

export function useUnsavedSettings(dirty: boolean, busy = false) {
  const confirmLeave = useCallback(() => !busy && (!dirty || window.confirm(message)), [busy, dirty]);

  useEffect(() => {
    if (!dirty && !busy) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const click = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(link instanceof HTMLAnchorElement) || link.hasAttribute("download") || (link.target && link.target !== "_self")) return;
      const target = new URL(link.href, window.location.href);
      if (target.protocol !== "http:" && target.protocol !== "https:") return;
      if (link.getAttribute("href")?.startsWith("#")) return;
      if (!confirmLeave()) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", click, true);
    };
  }, [busy, dirty, confirmLeave]);

  return confirmLeave;
}
