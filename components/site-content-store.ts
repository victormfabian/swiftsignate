"use client";

import { useCallback, useEffect, useState } from "react";
import { defaultSiteContent, mergeSiteContent, type ContentCard, type SiteContent } from "@/lib/site-content-model";

type ContentResponse = {
  ok: boolean;
  content: SiteContent;
};

async function readJson<T>(response: Response) {
  return (await response.json()) as T;
}

export { defaultSiteContent, mergeSiteContent };
export type { ContentCard, SiteContent };

export function useSiteContentStore() {
  const [content, setContent] = useState<SiteContent>(defaultSiteContent);
  const [loading, setLoading] = useState(true);

  const refreshContent = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/content", {
        method: "GET",
        cache: "no-store"
      });

      if (!response.ok) {
        setContent(defaultSiteContent);
        return;
      }

      const result = await readJson<ContentResponse>(response);
      setContent(mergeSiteContent(result.content));
    } catch {
      setContent(defaultSiteContent);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshContent();
  }, [refreshContent]);

  const updateContent = useCallback(
    async (nextContent: SiteContent) => {
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
      setContent(mergeSiteContent(result.content));
      return result.content;
    },
    []
  );

  const resetContent = useCallback(async () => {
    const response = await fetch("/api/content", {
      method: "DELETE"
    });

    if (!response.ok) {
      throw new Error("Could not reset site content.");
    }

    const result = await readJson<ContentResponse>(response);
    setContent(mergeSiteContent(result.content));
    return result.content;
  }, []);

  return {
    content,
    loading,
    refreshContent,
    updateContent,
    resetContent
  };
}
