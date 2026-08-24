import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getBoardTask, changeTaskStatus } from '../../../../../src/api/tasks';
import { getTaskAttachments, uploadTaskProof } from '../../../../../src/api/attachments';
import { extractErrorMessage } from '../../../../../src/api/client';
import { BoardTaskStatus, BoardTaskStatusLabels } from '../../../../../src/types/boards';

const STATUS_OPTIONS: BoardTaskStatus[] = [BoardTaskStatus.Todo, BoardTaskStatus.InProgress, BoardTaskStatus.Done];

export default function TaskDetailScreen() {
  const { boardId, taskId } = useLocalSearchParams<{ boardId: string; taskId: string }>();
  const queryClient = useQueryClient();
  const [statusError, setStatusError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const task = useQuery({ queryKey: ['tasks', taskId], queryFn: () => getBoardTask(boardId, taskId) });
  const attachments = useQuery({ queryKey: ['attachments', taskId], queryFn: () => getTaskAttachments(taskId) });

  const statusMutation = useMutation({
    mutationFn: (status: BoardTaskStatus) => changeTaskStatus(boardId, taskId, status),
    onSuccess: async () => {
      setStatusError(null);
      await queryClient.invalidateQueries({ queryKey: ['tasks', taskId] });
      await queryClient.invalidateQueries({ queryKey: ['boards', boardId, 'tasks'] });
    },
    onError: (err) => setStatusError(extractErrorMessage(err)),
  });

  const uploadMutation = useMutation({
    mutationFn: uploadProof,
    onSuccess: async () => {
      setUploadError(null);
      await queryClient.invalidateQueries({ queryKey: ['attachments', taskId] });
    },
    onError: (err) => setUploadError(extractErrorMessage(err)),
  });

  async function uploadProof() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      throw new Error('Photo library permission is required to attach proof of work.');
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });

    if (result.canceled || result.assets.length === 0) {
      return;
    }

    const asset = result.assets[0];
    return uploadTaskProof(taskId, {
      uri: asset.uri,
      name: asset.fileName ?? `proof-${Date.now()}.jpg`,
      type: asset.mimeType ?? 'image/jpeg',
    });
  }

  if (task.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (task.error || !task.data) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{extractErrorMessage(task.error)}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{task.data.title}</Text>
      {task.data.description ? <Text style={styles.description}>{task.data.description}</Text> : null}
      <Text style={styles.meta}>Assignee: {task.data.assigneeEmployeeName ?? 'Unassigned'}</Text>
      {task.data.dueDate ? <Text style={styles.meta}>Due: {task.data.dueDate}</Text> : null}

      <Text style={styles.sectionTitle}>Status</Text>
      <View style={styles.statusRow}>
        {STATUS_OPTIONS.map((status) => (
          <Pressable
            key={status}
            style={[styles.statusChip, task.data!.status === status && styles.statusChipActive]}
            onPress={() => statusMutation.mutate(status)}
            disabled={statusMutation.isPending}
          >
            <Text style={[styles.statusChipText, task.data!.status === status && styles.statusChipTextActive]}>
              {BoardTaskStatusLabels[status]}
            </Text>
          </Pressable>
        ))}
      </View>
      {statusError ? <Text style={styles.error}>{statusError}</Text> : null}

      <Text style={styles.sectionTitle}>Proof of Work</Text>
      <Pressable
        style={styles.uploadButton}
        onPress={() => uploadMutation.mutate()}
        disabled={uploadMutation.isPending}
      >
        {uploadMutation.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.uploadButtonText}>Add Photo</Text>
        )}
      </Pressable>
      {uploadError ? <Text style={styles.error}>{uploadError}</Text> : null}

      {attachments.isLoading ? (
        <ActivityIndicator style={{ marginTop: 12 }} />
      ) : attachments.data && attachments.data.length > 0 ? (
        attachments.data.map((attachment) => (
          <View key={attachment.id} style={styles.attachmentRow}>
            <Text style={styles.attachmentName}>{attachment.fileName}</Text>
            <Text style={styles.attachmentMeta}>
              {attachment.uploadedByName} · {new Date(attachment.uploadedAtUtc).toLocaleDateString()}
            </Text>
          </View>
        ))
      ) : (
        <Text style={styles.emptyText}>No proof attached yet.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, paddingBottom: 60 },
  title: { fontSize: 22, fontWeight: '700' },
  description: { color: '#555', marginTop: 8 },
  meta: { color: '#888', marginTop: 6, fontSize: 13 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#555', marginTop: 24, marginBottom: 10, textTransform: 'uppercase' },
  statusRow: { flexDirection: 'row', gap: 8 },
  statusChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#0a3d62' },
  statusChipActive: { backgroundColor: '#0a3d62' },
  statusChipText: { color: '#0a3d62', fontWeight: '600', fontSize: 13 },
  statusChipTextActive: { color: '#fff' },
  uploadButton: { backgroundColor: '#0a3d62', borderRadius: 8, paddingVertical: 12, alignItems: 'center', width: 160 },
  uploadButtonText: { color: '#fff', fontWeight: '600' },
  attachmentRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  attachmentName: { fontSize: 14, fontWeight: '500' },
  attachmentMeta: { fontSize: 12, color: '#888', marginTop: 2 },
  emptyText: { color: '#999', fontStyle: 'italic' },
  error: { color: '#c0392b', marginTop: 10 },
});
