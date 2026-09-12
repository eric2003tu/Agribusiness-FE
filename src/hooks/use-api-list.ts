import { useCallback, useEffect, useState } from "react";
import { apiRequest, apiErrorMessage, ApiError, type ApiPage } from "@/lib/api/client";

/**
 * Loads one real API list endpoint (cursor-paginated) into local state, with
 * a `loadMore` that follows the response's `next` URL as-is (per the guide's
 * pagination convention) and a `reload` for after a create/update/delete.
 */
export function useApiList<T>(fetchFirstPage: () => Promise<ApiPage<T>>, deps: unknown[]) {
  const [items, setItems] = useState<T[]>([]);
  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    return fetchFirstPage()
      .then((page) => {
        setItems(page.results);
        setNextUrl(page.next);
      })
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? (apiErrorMessage(err.body) ?? err.message) : "Could not reach the server.");
        setItems([]);
        setNextUrl(null);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    void load();
  }, [load]);

  const loadMore = useCallback(async () => {
    if (!nextUrl) return;
    try {
      const page = await apiRequest<ApiPage<T>>(nextUrl);
      setItems((prev) => [...prev, ...page.results]);
      setNextUrl(page.next);
    } catch {
      /* keep the current list if "load more" itself fails */
    }
  }, [nextUrl]);

  return { items, loading, error, hasMore: Boolean(nextUrl), loadMore, reload: load };
}
