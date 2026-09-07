import { useState, useEffect, useCallback } from "react";
import { AutonomousStackConfig } from "../types";

export const LOCAL_STORAGE_ARXIV_KEY = "meridian_config_arxiv_generation";
export const LOCAL_STORAGE_X_KEY = "meridian_config_x_posting";

export const DEFAULT_CONFIG: AutonomousStackConfig = {
  arxivGenerationEnabled: true,
  xPostingEnabled: true,
  updatedAt: Date.now(),
};

/**
 * Loads the current autonomous stack configuration from localStorage.
 */
export function getLocalConfig(): AutonomousStackConfig {
  if (typeof window === "undefined") return DEFAULT_CONFIG;

  try {
    const arxivStored = localStorage.getItem(LOCAL_STORAGE_ARXIV_KEY);
    const xStored = localStorage.getItem(LOCAL_STORAGE_X_KEY);

    return {
      arxivGenerationEnabled: arxivStored !== null ? arxivStored === "true" : DEFAULT_CONFIG.arxivGenerationEnabled,
      xPostingEnabled: xStored !== null ? xStored === "true" : DEFAULT_CONFIG.xPostingEnabled,
      updatedAt: Date.now(),
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

/**
 * Saves configuration to localStorage and dispatches a window event for reactivity.
 */
export function saveLocalConfig(updates: Partial<AutonomousStackConfig>): AutonomousStackConfig {
  const current = getLocalConfig();
  const next: AutonomousStackConfig = {
    arxivGenerationEnabled: updates.arxivGenerationEnabled !== undefined ? updates.arxivGenerationEnabled : current.arxivGenerationEnabled,
    xPostingEnabled: updates.xPostingEnabled !== undefined ? updates.xPostingEnabled : current.xPostingEnabled,
    updatedAt: Date.now(),
  };

  try {
    localStorage.setItem(LOCAL_STORAGE_ARXIV_KEY, String(next.arxivGenerationEnabled));
    localStorage.setItem(LOCAL_STORAGE_X_KEY, String(next.xPostingEnabled));
    window.dispatchEvent(new CustomEvent("meridian-config-changed", { detail: next }));
  } catch (err) {
    console.warn("[Config] Failed to save to localStorage:", err);
  }

  return next;
}

/**
 * Fetches server-persisted configuration from the backend API.
 */
export async function fetchServerConfig(): Promise<AutonomousStackConfig> {
  try {
    const res = await fetch("/api/editor-config");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.success) {
      const serverConfig: AutonomousStackConfig = {
        arxivGenerationEnabled: typeof data.arxivGenerationEnabled === "boolean" ? data.arxivGenerationEnabled : true,
        xPostingEnabled: typeof data.xPostingEnabled === "boolean" ? data.xPostingEnabled : true,
        updatedAt: data.updatedAt || Date.now(),
      };
      saveLocalConfig(serverConfig);
      return serverConfig;
    }
  } catch (err) {
    console.debug("[Config] Server config sync skipped, using local config:", err);
  }
  return getLocalConfig();
}

/**
 * Updates configuration both on the server and in local storage.
 */
export async function updateServerConfig(updates: Partial<AutonomousStackConfig>): Promise<AutonomousStackConfig> {
  // First persist locally for instant UI update
  const updatedLocal = saveLocalConfig(updates);

  try {
    const res = await fetch("/api/editor-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.success) {
      return {
        arxivGenerationEnabled: data.arxivGenerationEnabled,
        xPostingEnabled: data.xPostingEnabled,
        updatedAt: data.updatedAt || Date.now(),
      };
    }
  } catch (err) {
    console.warn("[Config] Server update warning (local state active):", err);
  }

  return updatedLocal;
}

/**
 * React hook to observe and update the Autonomous Stack configuration.
 */
export function useEditorConfig() {
  const [config, setConfig] = useState<AutonomousStackConfig>(getLocalConfig);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Initial sync with server
    let mounted = true;
    setIsLoading(true);
    fetchServerConfig()
      .then((cfg) => {
        if (mounted) setConfig(cfg);
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    // Listen to local changes across components
    const handleConfigChange = (e: Event) => {
      const customEvent = e as CustomEvent<AutonomousStackConfig>;
      if (customEvent.detail) {
        setConfig(customEvent.detail);
      } else {
        setConfig(getLocalConfig());
      }
    };

    window.addEventListener("meridian-config-changed", handleConfigChange);
    return () => {
      mounted = false;
      window.removeEventListener("meridian-config-changed", handleConfigChange);
    };
  }, []);

  const updateConfig = useCallback(async (updates: Partial<AutonomousStackConfig>) => {
    // Instant optimistic update
    const next = saveLocalConfig(updates);
    setConfig(next);
    // Background server sync
    await updateServerConfig(updates);
  }, []);

  const setArxivGeneration = useCallback(
    (enabled: boolean) => updateConfig({ arxivGenerationEnabled: enabled }),
    [updateConfig]
  );

  const setXPosting = useCallback(
    (enabled: boolean) => updateConfig({ xPostingEnabled: enabled }),
    [updateConfig]
  );

  const toggleArxivGeneration = useCallback(
    () => updateConfig({ arxivGenerationEnabled: !config.arxivGenerationEnabled }),
    [config.arxivGenerationEnabled, updateConfig]
  );

  const toggleXPosting = useCallback(
    () => updateConfig({ xPostingEnabled: !config.xPostingEnabled }),
    [config.xPostingEnabled, updateConfig]
  );

  return {
    config,
    updateConfig,
    setArxivGeneration,
    setXPosting,
    toggleArxivGeneration,
    toggleXPosting,
    isLoading,
  };
}
