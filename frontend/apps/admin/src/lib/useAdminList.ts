// SPDX-License-Identifier: AGPL-3.0-or-later
import { errorMessage } from "@pyxie/api-client";
import { useEffect, useState } from "react";

const PAGE_SIZE = 20;

interface Page<T> {
  items: T[];
  total: number;
}

/**
 * Drives an admin list page's fetch-on-page-change state (items, pagination, loading, error).
 *
 * `fetchPage` must be `useCallback`-memoized by the caller against whatever filters it closes over
 * (search, date range, ...) - a change in its identity is what re-triggers the fetch here, alongside
 * `page` itself.
 */
export function useAdminList<T>(fetchPage: (skip: number, limit: number) => Promise<Page<T>>, loadError: string) {
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetchPage((page - 1) * PAGE_SIZE, PAGE_SIZE)
      .then((result) => {
        if (!cancelled) {
          setItems(result.items);
          setTotal(result.total);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(errorMessage(err, loadError));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fetchPage, page, loadError]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return { items, setItems, totalPages, loading, error, page, setPage };
}
