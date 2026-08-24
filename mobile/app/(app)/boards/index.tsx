import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getMyBoards } from '../../../src/api/boards';
import { extractErrorMessage } from '../../../src/api/client';
import { useAuth } from '../../../src/auth/AuthContext';
import type { Board } from '../../../src/types/boards';

export default function BoardListScreen() {
  const { signOut } = useAuth();
  const { data, isLoading, isRefetching, error, refetch } = useQuery({
    queryKey: ['boards', 'mine'],
    queryFn: getMyBoards,
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Boards',
          headerRight: () => (
            <View style={styles.headerActions}>
              <Pressable onPress={() => router.push('/team')} hitSlop={8}>
                <Text style={styles.headerLink}>Team</Text>
              </Pressable>
              <Pressable onPress={() => signOut()} hitSlop={8}>
                <Text style={styles.headerLink}>Sign Out</Text>
              </Pressable>
            </View>
          ),
        }}
      />
      {error ? <Text style={styles.error}>{extractErrorMessage(error)}</Text> : null}
      <FlatList
        data={data ?? []}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        contentContainerStyle={data?.length ? undefined : styles.emptyList}
        ListEmptyComponent={<Text style={styles.emptyText}>No boards yet. Create one to get started.</Text>}
        renderItem={({ item }: { item: Board }) => (
          <Pressable style={styles.card} onPress={() => router.push(`/boards/${item.id}`)}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardMeta}>
              {item.members.length} member{item.members.length === 1 ? '' : 's'} · Owner {item.ownerEmployeeName}
            </Text>
          </Pressable>
        )}
      />
      <Pressable style={styles.fab} onPress={() => router.push('/boards/create')}>
        <Text style={styles.fabText}>+ New Board</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6f8' },
  headerActions: { flexDirection: 'row', gap: 16 },
  headerLink: { color: '#0a3d62', fontWeight: '600', fontSize: 14 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  error: { color: '#c0392b', padding: 12 },
  emptyList: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#888', fontSize: 15 },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  cardTitle: { fontSize: 17, fontWeight: '600' },
  cardMeta: { fontSize: 13, color: '#777', marginTop: 4 },
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
