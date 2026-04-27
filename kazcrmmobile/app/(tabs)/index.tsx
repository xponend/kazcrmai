import { useState, useCallback } from "react";
import { View, FlatList, TouchableOpacity, Text, StyleSheet, RefreshControl } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getTickets } from "../../api/client";
import { TicketCard } from "../../components/CrmComponents";

const FILTERS = [
  { key: "all", label: "Все" },
  { key: "new", label: "Новые" },
  { key: "in_progress", label: "В работе" },
  { key: "resolved", label: "Решённые" },
];

export default function TicketsScreen() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const load = async () => {
    try {
      const params: Record<string, string> = {};
      if (filter !== "all") params.status = filter;
      const { data } = await getTickets(params);
      setTickets(data.tickets);
    } catch (err) {
      console.error(err);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, [filter]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      {/* Filter chips */}
      <View style={styles.filters}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.chip, filter === f.key && styles.chipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.chipText, filter === f.key && styles.chipTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={tickets}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <TicketCard ticket={item} onPress={() => router.push(`/ticket/${item._id}`)} />
        )}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1e40af" />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="ticket-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>Нет заявок</Text>
          </View>
        }
      />

      {/* FAB — create ticket */}
      <TouchableOpacity style={styles.fab} onPress={() => router.push("/ticket/create")}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  filters: { flexDirection: "row", padding: 12, gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb" },
  chipActive: { backgroundColor: "#1e40af", borderColor: "#1e40af" },
  chipText: { fontSize: 13, color: "#6b7280", fontWeight: "500" },
  chipTextActive: { color: "#fff" },
  list: { padding: 12 },
  empty: { alignItems: "center", paddingTop: 60 },
  emptyText: { color: "#9ca3af", marginTop: 12, fontSize: 15 },
  fab: { position: "absolute", bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: "#1e40af", justifyContent: "center", alignItems: "center", elevation: 6, shadowColor: "#1e40af", shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
});
