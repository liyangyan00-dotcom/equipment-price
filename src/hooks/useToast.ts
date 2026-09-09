"use client";

import { useMockToast } from "@/hooks/useMockToast";

// The application toast bus predates the database integration. Business pages
// use this neutral alias so persistence code does not expose mock terminology.
export function useToast() {
  return useMockToast();
}
