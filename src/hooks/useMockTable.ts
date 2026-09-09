"use client";

import { useMemo, useState } from "react";

export function useMockTable<T extends { id?: string }>(rows: T[], pageSize = 8) {
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");

  const filteredRows = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) {
      return rows;
    }

    return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(keyword));
  }, [query, rows]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pagedRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggle = (id: string) => {
    setSelected((items) =>
      items.includes(id) ? items.filter((item) => item !== id) : [...items, id]
    );
  };

  const toggleAll = () => {
    const ids = pagedRows.map((row, index) => row.id ?? String(index));
    setSelected((items) => (ids.every((id) => items.includes(id)) ? [] : ids));
  };

  const reset = () => {
    setQuery("");
    setPage(1);
    setSelected([]);
  };

  return {
    query,
    setQuery,
    selected,
    setSelected,
    toggle,
    toggleAll,
    page: currentPage,
    setPage,
    pageCount,
    rows: pagedRows,
    filteredRows,
    reset,
  };
}
