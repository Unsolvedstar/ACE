import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createBoard } from '../../../src/api/boards';
import { getMyTeam } from '../../../src/api/team';
import { extractErrorMessage } from '../../../src/api/client';
import { colors } from '../../../src/theme/colors';

export default function CreateBoardScreen() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const team = useQuery({ queryKey: ['team', 'mine'], queryFn: getMyTeam });

  const mutation = useMutation({
    mutationFn: () =>
      createBoard({
        name,
        description: description || null,
        siteId: null,
        initialMemberEmployeeIds: Array.from(selectedIds),
      }),
    onSuccess: async (board) => {
      await queryClient.invalidateQueries({ queryKey: ['boards', 'mine'] });
      router.replace(`/boards/${board.id}`);
    },
    onError: (err) => setError(extractErrorMessage(err)),
  });

  function toggleMember(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Board name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Site Safety Q1" />

      <Text style={styles.label}>Description (optional)</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={description}
        onChangeText={setDescription}
        multiline
        placeholder="What is this board for?"
      />

      <Text style={styles.label}>Add members from your team</Text>
      {team.isLoading ? (
        <ActivityIndicator />
      ) : team.data && team.data.length > 0 ? (
        team.data.map((member) => {
          const selected = selectedIds.has(member.id);
          return (
            <Pressable key={member.id} style={styles.memberRow} onPress={() => toggleMember(member.id)}>
              <View style={[styles.checkbox, selected && styles.checkboxChecked]} />
              <View>
                <Text style={styles.memberName}>{member.fullName}</Text>
                <Text style={styles.memberMeta}>{member.jobTitle}</Text>
              </View>
            </Pressable>
          );
        })
      ) : (
        <Text style={styles.emptyText}>No direct reports found. You can add members later.</Text>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        style={[styles.button, (!name || mutation.isPending) && styles.buttonDisabled]}
        disabled={!name || mutation.isPending}
        onPress={() => mutation.mutate()}
      >
        {mutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create Board</Text>}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.card },
  content: { padding: 20 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 16, marginBottom: 6, color: '#333' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  memberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 1.5, borderColor: colors.ink900, marginRight: 12 },
  checkboxChecked: { backgroundColor: colors.ink900 },
  memberName: { fontSize: 15, fontWeight: '500' },
  memberMeta: { fontSize: 12, color: '#888' },
  emptyText: { color: '#888', fontStyle: 'italic' },
  error: { color: colors.error, marginTop: 12 },
  button: { backgroundColor: colors.ink900, borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 24, marginBottom: 40 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
