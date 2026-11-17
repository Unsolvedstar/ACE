import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getMyBoards } from '../../../src/api/boards';
import { getWeeklySummary, getWeeklySummaryPdf } from '../../../src/api/tasks';
import { extractErrorMessage } from '../../../src/api/client';
import { useBoardLiveUpdates } from '../../../src/realtime/useBoardLiveUpdates';
import { WeeklyPerformanceChart } from '../../../src/components/WeeklyPerformanceChart';
import { colors } from '../../../src/theme/colors';

export default function TeamPerformanceScreen() {
  const boards = useQuery({ queryKey: ['boards', 'mine'], queryFn: getMyBoards });
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);

  const activeBoardId = selectedBoardId ?? boards.data?.[0]?.id ?? null;

  useBoardLiveUpdates(activeBoardId);

  const summary = useQuery({
    queryKey: ['boards', activeBoardId, 'weekly-summary'],
    queryFn: () => getWeeklySummary(activeBoardId as string),
    enabled: !!activeBoardId,
    refetchInterval: 30_000,
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      const boardId = activeBoardId as string;
      const bytes = await getWeeklySummaryPdf(boardId);
      const file = new File(Paths.cache, `weekly-summary-${boardId}.pdf`);
      file.write(new Uint8Array(bytes));
      await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', dialogTitle: 'Weekly Performance Summary' });
    },
    onError: (err) => Alert.alert('Export failed', extractErrorMessage(err)),
  });

  if (boards.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!boards.data || boards.data.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>Create a board to see weekly team performance.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Board</Text>
      <View style={styles.boardRow}>
        {boards.data.map((board) => (
          <Pressable
            key={board.id}
            style={[styles.boardChip, board.id === activeBoardId && styles.boardChipActive]}
            onPress={() => setSelectedBoardId(board.id)}
          >
            <Text style={[styles.boardChipText, board.id === activeBoardId && styles.boardChipTextActive]}>
              {board.name}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>This Week</Text>
        <Pressable
          style={[styles.exportButton, exportMutation.isPending && styles.exportButtonDisabled]}
          onPress={() => exportMutation.mutate()}
          disabled={exportMutation.isPending || !activeBoardId}
        >
          {exportMutation.isPending ? (
            <ActivityIndicator size="small" color="#0a3d62" />
          ) : (
            <Text style={styles.exportButtonText}>Export PDF</Text>
          )}
        </Pressable>
      </View>
      {summary.isLoading ? (
        <ActivityIndicator />
      ) : summary.error ? (
        <Text style={styles.error}>{extractErrorMessage(summary.error)}</Text>
      ) : summary.data && summary.data.length > 0 ? (
        <WeeklyPerformanceChart rows={summary.data} />
      ) : (
        <Text style={styles.emptyText}>No board members yet.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.card },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  content: { padding: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#555', marginTop: 16, marginBottom: 10, textTransform: 'uppercase' },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  exportButton: { borderWidth: 1, borderColor: colors.ink900, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  exportButtonDisabled: { opacity: 0.6 },
  exportButtonText: { color: colors.ink900, fontWeight: '600', fontSize: 12 },
  boardRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  boardChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: colors.ink900 },
  boardChipActive: { backgroundColor: colors.ink900 },
  boardChipText: { color: colors.ink900, fontWeight: '600', fontSize: 13 },
  boardChipTextActive: { color: '#fff' },
  emptyText: { color: '#888', fontStyle: 'italic' },
  error: { color: colors.error },
});
