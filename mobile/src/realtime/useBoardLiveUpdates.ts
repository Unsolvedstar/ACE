import { useEffect } from 'react';
import { HubConnectionBuilder, HttpTransportType, LogLevel } from '@microsoft/signalr';
import { useQueryClient } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import { TOKEN_STORAGE_KEY } from '../api/client';

function getHubBaseUrl(): string {
  return (process.env.EXPO_PUBLIC_API_BASE_URL ?? '').replace(/\/api\/?$/, '');
}

export function useBoardLiveUpdates(boardId: string | null | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!boardId) return;

    const connection = new HubConnectionBuilder()
      .withUrl(`${getHubBaseUrl()}/hubs/board`, {
        accessTokenFactory: () => SecureStore.getItemAsync(TOKEN_STORAGE_KEY).then((token) => token ?? ''),
        transport: HttpTransportType.WebSockets,
        skipNegotiation: true,
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    connection.on('BoardUpdated', (updatedBoardId: string) => {
      if (updatedBoardId !== boardId) return;
      queryClient.invalidateQueries({ queryKey: ['boards', boardId, 'tasks'] });
      queryClient.invalidateQueries({ queryKey: ['boards', boardId, 'weekly-summary'] });
    });

    connection
      .start()
      .then(() => connection.invoke('JoinBoard', boardId))
      .catch(() => {
        // Best-effort: falls back to the existing 30s weekly-summary poll / manual
        // pull-to-refresh on the board list if the socket can't connect on this device.
      });

    return () => {
      connection.invoke('LeaveBoard', boardId).catch(() => {});
      connection.stop();
    };
  }, [boardId, queryClient]);
}
