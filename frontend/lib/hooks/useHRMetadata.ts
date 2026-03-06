import { useEffect, useState } from "react";
import { getHRMetadata, type HRMetadata } from "@/lib/api/metadata";

/**
 * Hook to fetch HR metadata from the database
 * Caches data in localStorage for faster repeated access
 */
export function useHRMetadata() {
  const [metadata, setMetadata] = useState<HRMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        setLoading(true);

        // Attempt to load from cache
        const cached = localStorage.getItem("hr_metadata");
        const cacheTime = localStorage.getItem("hr_metadata_time");

        // Cache is valid for 1 hour
        if (cached && cacheTime) {
          const age = Date.now() - parseInt(cacheTime, 10);
          if (age < 60 * 60 * 1000) {
            setMetadata(JSON.parse(cached));
            setLoading(false);
            return;
          }
        }

        // Fetch from API
        const response = await getHRMetadata();

        if (response && response.data) {
          setMetadata(response.data);

          // Store in cache
          localStorage.setItem("hr_metadata", JSON.stringify(response.data));
          localStorage.setItem("hr_metadata_time", Date.now().toString());
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to load HR metadata"));
        console.error("Failed to fetch HR metadata:", err);
      } finally {
        setLoading(false);
      }
    };

    void fetchMetadata();
  }, []);

  return { metadata, loading, error };
}

/**
 * Helper to invalidate cache
 */
export function invalidateHRMetadataCache() {
  localStorage.removeItem("hr_metadata");
  localStorage.removeItem("hr_metadata_time");
}
