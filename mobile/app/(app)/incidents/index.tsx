import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getMyIncidentReports } from '../../../src/api/incidents';
import { extractErrorMessage } from '../../../src/api/client';
import { useIncidentSync } from '../../../src/offline/useIncidentSync';
import { IncidentSeverityLabels, IncidentStatusLabels, type IncidentReportDto } from '../../../src/types/incidents';
import { colors } from '../../../src/theme/colors';

type Row =
  | { kind: 'pending'; localId: string; title: string; severityLabel: string; location: string; hasError: boolean }
  | { kind: 'synced'; report: IncidentReportDto };

export default function IncidentListScreen() {
  const { data, isLoading, isRefetching, error, refetch } = useQuery({
    queryKey: ['incidents', 'mine'],
    queryFn: getMyIncidentReports,
  });
  const { queue, isSyncing, flush } = useIncidentSync();

  const rows: Row[] = [
    ...queue.map((q) => ({
      kind: 'pending' as const,
      localId: q.localId,
      title: q.request.title,
      severityLabel: IncidentSeverityLabels[q.request.severity],
      location: q.request.location,
      hasError: !!q.lastError,
    })),
    ...(data ?? []).map((report) => ({ kind: 'synced' as const, report })),
  ];

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Incidents & Near Miss' }} />

      {queue.length > 0 && (
        <Pressable style={styles.syncBanner} onPress={() => void flush()} disabled={isSyncing}>
          {isSyncing ? (
            <ActivityIndicator size="small" color={colors.ink900} />
          ) : (
            <Text style={styles.syncBannerText}>
              {queue.length} report{queue.length === 1 ? '' : 's'} waiting to sync — tap to retry now
            </Text>
          )}
        </Pressable>
      )}

      {error ? <Text style={styles.error}>{extractErrorMessage(error)}</Text> : null}

      <FlatList
        data={rows}
        keyExtractor={(row) => (row.kind === 'synced' ? row.report.id : row.localId)}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              void refetch();
              void flush();
            }}
          />
        }
        contentContainerStyle={rows.length ? undefined : styles.emptyList}
        ListEmptyComponent={<Text style={styles.emptyText}>No incidents reported yet.</Text>}
        renderItem={({ item }) =>
          item.kind === 'pending' ? (
            <View style={[styles.card, styles.pendingCard]}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardMeta}>
                {item.location} · {item.severityLabel}
              </Text>
              <Text style={styles.pendingBadge}>{item.hasError ? 'Sync failed — will retry' : 'Waiting to sync'}</Text>
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.report.title}</Text>
              <Text style={styles.cardMeta}>
                {item.report.location} · {IncidentSeverityLabels[item.report.severity]}
              </Text>
              <Text style={styles.statusBadge}>{IncidentStatusLabels[item.report.status]}</Text>
            </View>
          )
        }
      />

      <Pressable style={styles.fab} onPress={() => router.push('/incidents/create')}>
        <Text style={styles.fabText}>+ Report Incident</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  error: { color: colors.error, padding: 12 },
  emptyList: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#888', fontSize: 15 },
  syncBanner: {
    backgroundColor: colors.gold300,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  syncBannerText: { color: colors.ink900, fontWeight: '600', fontSize: 13 },
  card: {
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  pendingCard: { borderWidth: 1, borderColor: colors.gold500, borderStyle: 'dashed' },
  cardTitle: { fontSize: 17, fontWeight: '600' },
  cardMeta: { fontSize: 13, color: '#777', marginTop: 4 },
  statusBadge: { marginTop: 8, alignSelf: 'flex-start', fontSize: 12, fontWeight: '600', color: colors.ink900 },
  pendingBadge: { marginTop: 8, alignSelf: 'flex-start', fontSize: 12, fontWeight: '600', color: colors.gold700 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    backgroundColor: colors.ink900,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 28,
  },
  fabText: { color: '#fff', fontWeight: '600' },
});
