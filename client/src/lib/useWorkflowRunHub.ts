import { useEffect, useRef } from "react";
import { HubConnection, HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { TOKEN_STORAGE_KEY, apiClient } from "../api/client";

function hubUrl(): string {
  const apiBaseUrl = apiClient.defaults.baseURL ?? "/api";
  return `${apiBaseUrl.replace(/\/api\/?$/, "")}/hubs/workflow`;
}

interface RunUpdatedPayload {
  runId: string;
  status: string;
}

interface StepUpdatedPayload {
  runId: string;
  stepId: string;
  nodeId: string;
  status: string;
}

/** Joins the given workflow run's SignalR group and calls the callbacks whenever the server
 * broadcasts a run or step status change - used to silently refetch/refresh the canvas instead
 * of tracking a live document diff, same convenience-layer philosophy as useBoardHub. */
export function useWorkflowRunHub(
  runId: string | undefined,
  onRunUpdated: (status: string) => void,
  onStepUpdated: (nodeId: string, status: string) => void,
) {
  const runCallbackRef = useRef(onRunUpdated);
  runCallbackRef.current = onRunUpdated;
  const stepCallbackRef = useRef(onStepUpdated);
  stepCallbackRef.current = onStepUpdated;

  useEffect(() => {
    if (!runId) return;

    const connection: HubConnection = new HubConnectionBuilder()
      .withUrl(hubUrl(), { accessTokenFactory: () => localStorage.getItem(TOKEN_STORAGE_KEY) ?? "" })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    connection.on("RunUpdated", (payload: RunUpdatedPayload) => runCallbackRef.current(payload.status));
    connection.on("StepUpdated", (payload: StepUpdatedPayload) =>
      stepCallbackRef.current(payload.nodeId, payload.status),
    );

    let isDisposed = false;
    connection
      .start()
      .then(() => {
        if (!isDisposed) return connection.invoke("JoinRun", runId);
      })
      .catch(() => {
        // Realtime is a convenience layer; the page still works via its own explicit refetches.
      });

    return () => {
      isDisposed = true;
      connection.stop();
    };
  }, [runId]);
}
