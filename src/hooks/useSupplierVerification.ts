"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  supplierVerificationById,
  type SupplierHumanReviewStatus,
} from "@/data/mock/supplierVerificationRegistry";
import { supplierManualReviewById } from "@/data/mock/supplierManualReviewQueue";
import {
  evaluateSupplierInquiryAdmission,
  type SupplierInquiryAdmissionDecision,
} from "@/lib/supplierInquiryAdmission";

const STORAGE_KEY = "water-price-supplier-human-review-v1";
const DUPLICATE_STORAGE_KEY = "water-price-supplier-duplicate-resolution-v1";
const SYSTEM_WRITE_STORAGE_KEY = "water-price-supplier-system-write-v1";
const REVIEW_EVENT = "supplier-verification-review-change";

type ReviewState = Record<string, SupplierHumanReviewStatus>;
type DuplicateState = Record<string, "consolidated">;
export type SupplierSystemWriteRecord = {
  supplierId: string;
  reviewStatus: SupplierHumanReviewStatus;
  duplicateResolution: "not_required" | "pending" | "consolidated";
  admission: SupplierInquiryAdmissionDecision;
  reviewedBy: string;
  writtenAt: string;
};
type SystemWriteState = Record<string, SupplierSystemWriteRecord>;

function readReviewState(): ReviewState {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") as ReviewState;
  } catch {
    return {};
  }
}

function readDuplicateState(): DuplicateState {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(DUPLICATE_STORAGE_KEY) ?? "{}") as DuplicateState;
  } catch {
    return {};
  }
}

function readSystemWriteState(): SystemWriteState {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(SYSTEM_WRITE_STORAGE_KEY) ?? "{}") as SystemWriteState;
  } catch {
    return {};
  }
}

function createSystemWriteRecord(
  supplierId: string,
  reviewStatus: SupplierHumanReviewStatus,
  duplicateResolved: boolean,
): SupplierSystemWriteRecord {
  const writtenAt = new Date().toISOString();
  const manualReview = supplierManualReviewById[supplierId];
  const duplicateRequired = Boolean(
    manualReview && manualReview.duplicateSourceRows.length > 1,
  );
  return {
    supplierId,
    reviewStatus,
    duplicateResolution: duplicateRequired
      ? duplicateResolved
        ? "consolidated"
        : "pending"
      : "not_required",
    admission: evaluateSupplierInquiryAdmission({
      supplierId,
      reviewStatus,
      duplicateResolved,
      checkedAt: writtenAt,
    }),
    reviewedBy: "商务测算组",
    writtenAt,
  };
}

function migrateSystemWriteState(
  reviewState: ReviewState,
  duplicateState: DuplicateState,
): SystemWriteState {
  const current = readSystemWriteState();
  let changed = false;
  const next = { ...current };

  for (const [supplierId, reviewStatus] of Object.entries(reviewState)) {
    const duplicateResolved = duplicateState[supplierId] === "consolidated";
    const existing = current[supplierId];
    if (
      !existing ||
      existing.reviewStatus !== reviewStatus ||
      (duplicateResolved && existing.duplicateResolution !== "consolidated")
    ) {
      next[supplierId] = createSystemWriteRecord(
        supplierId,
        reviewStatus,
        duplicateResolved,
      );
      changed = true;
    }
  }

  if (changed) {
    window.localStorage.setItem(SYSTEM_WRITE_STORAGE_KEY, JSON.stringify(next));
  }
  return next;
}

export function useSupplierVerification() {
  const [reviewState, setReviewState] = useState<ReviewState>({});
  const [duplicateState, setDuplicateState] = useState<DuplicateState>({});
  const [systemWriteState, setSystemWriteState] = useState<SystemWriteState>({});

  useEffect(() => {
    let cancelled = false;
    const sync = async () => {
      const response = await fetch("/api/suppliers", { cache: "no-store" }).catch(() => null);
      const payload = response?.ok
        ? await response.json().catch(() => ({ data: [] })) as { data?: Array<{ id: string; legacy_id?: string | null; review_status?: string; metadata?: { humanReview?: { duplicateResolution?: string } } }> }
        : { data: [] };
      const nextReviewState = Object.fromEntries((payload.data ?? []).flatMap((supplier) => {
        const status: SupplierHumanReviewStatus = supplier.review_status === "approved"
          ? "approved"
          : supplier.review_status === "rejected"
            ? "rejected"
            : "pending";
        return [[supplier.id, status], ...(supplier.legacy_id ? [[supplier.legacy_id, status]] : [])];
      })) as ReviewState;
      const nextDuplicateState = { ...readDuplicateState() };
      (payload.data ?? []).forEach((supplier) => {
        if (supplier.metadata?.humanReview?.duplicateResolution !== "consolidated") return;
        nextDuplicateState[supplier.id] = "consolidated";
        if (supplier.legacy_id) nextDuplicateState[supplier.legacy_id] = "consolidated";
      });
      if (cancelled) return;
      setReviewState(nextReviewState);
      setDuplicateState(nextDuplicateState);
      setSystemWriteState(migrateSystemWriteState(nextReviewState, nextDuplicateState));
    };
    void sync();
    const handleSync = () => void sync();
    window.addEventListener("storage", handleSync);
    window.addEventListener(REVIEW_EVENT, handleSync);
    return () => {
      cancelled = true;
      window.removeEventListener("storage", handleSync);
      window.removeEventListener(REVIEW_EVENT, handleSync);
    };
  }, []);

  const setReviewStatuses = useCallback(async (supplierIds: string[], status: SupplierHumanReviewStatus, notes: string) => {
    const response = await fetch("/api/suppliers/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ supplierIds, decision: status === "pending" ? "pending_review" : status, notes }),
    });
    const payload = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) throw new Error(payload.error || "供应商审核写入失败");
    const next = { ...reviewState };
    supplierIds.forEach((supplierId) => { next[supplierId] = status; });
    const duplicateState = { ...readDuplicateState() };
    if (status === "approved") supplierIds.forEach((supplierId) => { duplicateState[supplierId] = "consolidated"; });
    const writeState = { ...readSystemWriteState() };
    supplierIds.forEach((supplierId) => {
      writeState[supplierId] = createSystemWriteRecord(
        supplierId,
        status,
        readDuplicateState()[supplierId] === "consolidated",
      );
    });
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.localStorage.setItem(DUPLICATE_STORAGE_KEY, JSON.stringify(duplicateState));
    window.localStorage.setItem(SYSTEM_WRITE_STORAGE_KEY, JSON.stringify(writeState));
    setReviewState(next);
    setDuplicateState(duplicateState);
    setSystemWriteState(writeState);
    window.dispatchEvent(new Event(REVIEW_EVENT));
  }, [reviewState]);

  const setReviewStatus = useCallback(
    (supplierId: string, status: SupplierHumanReviewStatus, notes = "供应商资料已由人工复核并记录审核结论") =>
      setReviewStatuses([supplierId], status, notes),
    [setReviewStatuses],
  );

  const resolveDuplicate = useCallback((supplierId: string) => {
    const next = { ...readDuplicateState(), [supplierId]: "consolidated" as const };
    const reviewStatus =
      readReviewState()[supplierId] ??
      supplierVerificationById[supplierId]?.humanReviewStatus ??
      "approved";
    const writeState = {
      ...readSystemWriteState(),
      [supplierId]: createSystemWriteRecord(supplierId, reviewStatus, true),
    };
    window.localStorage.setItem(DUPLICATE_STORAGE_KEY, JSON.stringify(next));
    window.localStorage.setItem(SYSTEM_WRITE_STORAGE_KEY, JSON.stringify(writeState));
    setDuplicateState(next);
    setSystemWriteState(writeState);
    window.dispatchEvent(new Event(REVIEW_EVENT));
  }, []);

  const isDuplicateResolved = useCallback(
    (supplierId: string) => duplicateState[supplierId] === "consolidated",
    [duplicateState],
  );

  const getReviewStatus = useCallback(
    (supplierId: string) => reviewState[supplierId] ?? "pending",
    [reviewState],
  );

  const canCreateInquiry = useCallback(
    (supplierId: string) => {
      return evaluateSupplierInquiryAdmission({
        supplierId,
        reviewStatus: getReviewStatus(supplierId),
        duplicateResolved: duplicateState[supplierId] === "consolidated",
      }).allowed;
    },
    [duplicateState, getReviewStatus],
  );

  const getInquiryAdmission = useCallback(
    (supplierId: string) =>
      evaluateSupplierInquiryAdmission({
        supplierId,
        reviewStatus: getReviewStatus(supplierId),
        duplicateResolved: duplicateState[supplierId] === "consolidated",
      }),
    [duplicateState, getReviewStatus],
  );

  const getSystemWriteRecord = useCallback(
    (supplierId: string) => systemWriteState[supplierId],
    [systemWriteState],
  );

  return useMemo(
    () => ({
      reviewState,
      duplicateState,
      systemWriteState,
      getReviewStatus,
      setReviewStatus,
      setReviewStatuses,
      resolveDuplicate,
      isDuplicateResolved,
      canCreateInquiry,
      getInquiryAdmission,
      getSystemWriteRecord,
    }),
    [
      reviewState,
      duplicateState,
      systemWriteState,
      getReviewStatus,
      setReviewStatus,
      setReviewStatuses,
      resolveDuplicate,
      isDuplicateResolved,
      canCreateInquiry,
      getInquiryAdmission,
      getSystemWriteRecord,
    ],
  );
}
