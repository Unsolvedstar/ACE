import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getBoard } from '../../../../src/api/boards';
import { createBoardTask } from '../../../../src/api/tasks';
import { extractErrorMessage } from '../../../../src/api/client';

export default function CreateTaskScreen() {
  const { boardId } = useLocalSearchParams<{ boardId: string }>();
  const queryClient = useQueryClient();

  const board = useQuery({ queryKey: ['boards', boardId], queryFn: () => getBoard(boardId) });

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      createBoardTask(boardId, {
        title,
        description: description || null,
        assigneeEmployeeId: assigneeId,
        dueDate: dueDate || null,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['boards', boardId, 'tasks'] });
      router.back();
    },
    onError: (err) => setError(extractErrorMessage(err)),
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Title</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. Inspect conveyor belt" />

      <Text style={styles.label}>Description (optional)</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={description}
        onChangeText={setDescription}
        multiline
        placeholder="Task details"
      />

      <Text style={styles.label}>Due date (optional, YYYY-MM-DD)</Text>
      <TextInput style={styles.input} value={dueDate} onChangeText={setDueDate} placeholder="2026-08-20" />

      <Text style={styles.label}>Assignee</Text>
      {board.isLoading ? (
        <ActivityIndicator />
      ) : (
        <View>
          <Pressable style={styles.memberRow} onPress={() => setAssigneeId(null)}>
            <View style={[styles.radio, assigneeId === null && styles.radioSelected]} />
            <Text style={styles.memberName}>Unassigned</Text>
          </Pressable>
          {board.data?.members.map((member) => (
            <Pressable key={member.employeeId} style={styles.memberRow} onPress={() => setAssigneeId(member.employeeId)}>
              <View style={[styles.radio, assigneeId === member.employeeId && styles.radioSelected]} />
              <Text style={styles.memberName}>{member.employeeName}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        style={[styles.button, (!title || mutation.isPending) && styles.buttonDisabled]}
        disabled={!title || mutation.isPending}
        onPress={() => mutation.mutate()}
      >
        {mutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create Task</Text>}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 16, marginBottom: 6, color: '#333' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  memberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: '#0a3d62', marginRight: 12 },
  radioSelected: { backgroundColor: '#0a3d62' },
  memberName: { fontSize: 15 },
  error: { color: '#c0392b', marginTop: 12 },
  button: { backgroundColor: '#0a3d62', borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 24, marginBottom: 40 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
