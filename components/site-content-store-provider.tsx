"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";
import { defaultSiteContent, mergeSiteContent, type SiteContent } from "@/lib/site-content-model";

type ContentResponse = {
  ok: boolean;
  content: SiteContent;
};

type SiteContentStoreValue = {
  content: SiteContent;
  loading: boolean;
  refreshContent: () => Promise<void>;
  updateContent: (nextContent: SiteContent) => Promise<SiteContent>;
  resetContent: () => Promise<SiteContent>;
};

const SiteContentStoreContext = createContext<SiteContentStoreValue | null>(null);

async function readJson<T>(response: Response) {
  return (await response.json()) as T;
}

export function SiteContentProvider({
  initialContent,
  children
}: {
  initialContent?: SiteContent;
  children: ReactNode;
}) {
  const initialMergedContent = useMemo(() => mergeSiteContent(initialContent ?? defaultSiteContent), [initialContent]);
  const [content, setContent] = useState<SiteContent>(initialMergedContent);
  const [loading, setLoading] = useState(!initialContent);
  const hasInitialContentRef = useRef(Boolean(initialContent));

  const refreshContent = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/content", {
        method: "GET",
        cache: "no-store"
      });

      if (!response.ok) {
        return;
      }

      const result = await readJson<ContentResponse>(response);
      setContent(mergeSiteContent(result.content));
    } catch {
      return;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialContent) {
      return;
    }

    setContent(initialMergedContent);
    setLoading(false);
    hasInitialContentRef.current = true;
  }, [initialContent, initialMergedContent]);

  useEffect(() => {
    if (hasInitialContentRef.current) {
      hasInitialContentRef.current = false;
      setLoading(false);
      return;
    }

    void refreshContent();
  }, [refreshContent]);

  const updateContent = useCallback(async (nextContent: SiteContent) => {
    const response = await fetch("/api/content", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(nextContent)
    });

    if (!response.ok) {
      throw new Error("Could not update site content.");
    }

    const result = await readJson<ContentResponse>(response);
    const mergedContent = mergeSiteContent(result.content);
    setContent(mergedContent);
    return mergedContent;
  }, []);

  const resetContent = useCallback(async () => {
    const response = await fetch("/api/content", {
      method: "DELETE"
    });

    if (!response.ok) {
      throw new Error("Could not reset site content.");
    }

    const result = await readJson<ContentResponse>(response);
    const mergedContent = mergeSiteContent(result.content);
    setContent(mergedContent);
    return mergedContent;
  }, []);

  const value = useMemo<SiteContentStoreValue>(
    () => ({
      content,
      loading,
      refreshContent,
      updateContent,
      resetContent
    }),
    [content, loading, refreshContent, updateContent, resetContent]
  );

  return <SiteContentStoreContext.Provider value={value}>{children}</SiteContentStoreContext.Provider>;
}

export function useSiteContentStore() {
  const context = useContext(SiteContentStoreContext);

  if (!context) {
    throw new Error("useSiteContentStore must be used within a SiteContentProvider.");
  }

  return context;
}
