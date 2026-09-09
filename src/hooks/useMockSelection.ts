"use client";

import { useCallback, useMemo, useState } from "react";

export function useMockSelection(initialIds: string[] = []) {
  const [selectedIds, setSelectedIds] = useState<string[]>(initialIds);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const toggle = useCallback((id: string, checked?: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      const shouldSelect = checked ?? !next.has(id);
      if (shouldSelect) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return Array.from(next);
    });
  }, []);

  const clear = useCallback(() => setSelectedIds([]), []);

  const selectMany = useCallback((ids: string[]) => {
    setSelectedIds((current) => Array.from(new Set([...current, ...ids])));
  }, []);

  return {
    selectedIds,
    selectedSet,
    selectedCount: selectedIds.length,
    hasSelection: selectedIds.length > 0,
    toggle,
    clear,
    selectMany,
  };
}
