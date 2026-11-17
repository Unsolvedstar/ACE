import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { useNetworkState } from "expo-network";
import { useQueryClient } from "@tanstack/react-query";
import { uploadIncidentPhoto } from "../api/attachments";
import { submitIncidentReport } from "../api/incidents";
import {
  getQueuedIncidents,
  markQueuedIncidentError,
  removeQueuedIncident,
  type QueuedIncidentReport,
} from "./incidentQueue";

/**
 * Drains the locally-queued incident reports (see incidentQueue.ts) whenever the device
 * regains connectivity or the app comes back to the foreground, so a report filed with zero
 * signal reaches the server without the worker having to do anything else.
 */
export function useIncidentSync() {
  const queryClient = useQueryClient();
  const network = useNetworkState();
  const [queue, setQueue] = useState<QueuedIncidentReport[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const flushingRef = useRef(false);

  const refreshQueue = useCallback(async () => {
    setQueue(await getQueuedIncidents());
  }, []);

  const flush = useCallback(async () => {
    if (flushingRef.current) return;
    flushingRef.current = true;
    setIsSyncing(true);
    try {
      const pending = await getQueuedIncidents();
      for (const item of pending) {
        try {
          const created = await submitIncidentReport(item.request);
          if (item.photoUri) {
            try {
              await uploadIncidentPhoto(created.id, {
                uri: item.photoUri,
                name: item.photoName ?? "photo.jpg",
                type: item.photoType ?? "image/jpeg",
              });
            } catch {
              // The report itself made it to the server - a failed photo upload just means no
              // photo, which isn't worth re-queuing (and re-submitting) the whole report over.
            }
          }
          await removeQueuedIncident(item.localId);
        } catch (err) {
          await markQueuedIncidentError(item.localId, err instanceof Error ? err.message : "Sync failed");
          // Stop at the first still-failing item: if this one failed because we're still
          // offline, every later item would fail the same way right now.
          break;
        }
      }
    } finally {
      await refreshQueue();
      await queryClient.invalidateQueries({ queryKey: ["incidents", "mine"] });
      flushingRef.current = false;
      setIsSyncing(false);
    }
  }, [queryClient, refreshQueue]);

  useEffect(() => {
    void refreshQueue();
  }, [refreshQueue]);

  useEffect(() => {
    if (network.isConnected) {
      void flush();
    }
    // Only re-run when connectivity itself changes, not on every `flush` identity change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [network.isConnected]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void flush();
    });
    return () => subscription.remove();
  }, [flush]);

  return { queue, isSyncing, flush, refreshQueue };
}
