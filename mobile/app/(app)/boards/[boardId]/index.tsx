import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getBoard } from '../../../../src/api/boards';
import { getBoardTasks } from '../../../../src/api/tasks';
import { extractErrorMessage } from '../../../../src/api/client';
import { useBoardLiveUpdates } from '../../../../src/realtime/useBoardLiveUpdates';
import { BoardTaskStatus, BoardTaskStatusLabels, type BoardTask } from '../../../../src/types/boards';

const STATUS_ORDER: BoardTaskStatus[] = [BoardTaskStatus.Todo, BoardTaskStatus.InProgress, BoardTaskStatus.Done];

export default function BoardDetailScreen() {
  const { boardId } = useLocalSearchParams<{ boardId: string }>();

  useBoardLiveUpdates(boardId);

  const board = useQuery({ queryKey: ['boards', boardId], queryFn: () => getBoard(boardId) });
  const tasks = useQuery({ queryKey: ['boards', boardId, 'tasks'], queryFn: () => getBoardTasks(boardId) });

  if (board.isLoading || tasks.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (board.error || tasks.error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{extractErrorMessage(board.error ?? tasks.error)}</Text>
      </View>
    );
  }

  const grouped = STATUS_ORDER.map((status) => ({
    status,
    items: (tasks.data ?? []).filter((task) => task.status === status),
  }));

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{board.data?.name}</Text>
        {board.data?.description ? <Text style={styles.description}>{board.data.description}</Text> : null}

        {grouped.map((group) => (
          <View key={group.status} style={styles.section}>
            <Text style={styles.sectionTitle}>
              {BoardTaskStatusLabels[group.status]} ({group.items.length})
            </Text>
            {group.items.length === 0 ? (
              <Text style={styles.emptyText}>Nothing here.</Text>
            ) : (
              group.items.map((task: BoardTask) => (
                <Pressable
                  key={task.id}
                  style={styles.taskCard}
                  onPress={() => router.push(`/boards/${boardId}/tasks/${task.id}`)}
                >
                  <Text style={styles.taskTitle}>{task.title}</Text>
                  <Text style={styles.taskMeta}>
                    {task.assigneeEmployeeName ?? 'Unassigned'}
                    {task.dueDate ? ` · due ${task.dueDate}` : ''}
                  </Text>
                </Pressable>
              ))
            )}
          </View>
        ))}
      </ScrollView>

      <Pressable style={styles.fab} onPress={() => router.push(`/boards/${boardId}/create-task`)}>
        <Text style={styles.fabText}>+ New Task</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6f8' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  error: { color: '#c0392b' },
  content: { padding: 16, paddingBottom: 100 },
  title: { fontSize: 22, fontWeight: '700' },
  description: { color: '#666', marginTop: 4 },
  section: { marginTop: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#555', marginBottom: 8, textTransform: 'uppercase' },
  emptyText: { color: '#999', fontStyle: 'italic' },
  taskCard: { backgroundColor: '#fff', padding: 14, borderRadius: 8, marginBottom: 8 },
  taskTitle: { fontSize: 15, fontWeight: '600' },
  taskMeta: { fontSize: 12, color: '#888', marginTop: 4 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    backgroundColor: '#0a3d62',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 28,
  },
  fabText: { color: '#fff', fontWeight: '600' },
});
