import { useState, useCallback } from "react";
import { View, FlatList, Text, TextInput, StyleSheet, RefreshControl } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getClients } from "../../api/client";

export default function ClientsScreen() {
  const [clients, setClients] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await getClients(search || undefined);
      setClients(data.clients);
    } catch (err) {
      console.error(err);
    }
  }, [search]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={styles.container}>
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color="#9ca3af" />
        <TextInput style={styles.searchInput} placeholder="Поиск клиентов..." value={search} onChangeText={setSearch} placeholderTextColor="#9ca3af" />
      </View>

      <FlatList
        data={clients}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              {item.company && <Text style={styles.company}>{item.company}</Text>}
              <Text style={styles.meta}>{item.email} · {item.phone}</Text>
            </View>
            <View style={styles.stats}>
              <Text style={styles.statNum}>{item.totalTickets || 0}</Text>
              <Text style={styles.statLabel}>заявок</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  searchWrap: { flexDirection: "row", alignItems: "center", margin: 12, paddingHorizontal: 14, backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#e5e7eb", gap: 8 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 15, color: "#111827" },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 10, gap: 12, elevation: 1, shadowOpacity: 0.04, shadowRadius: 6 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#dbeafe", justifyContent: "center", alignItems: "center" },
  avatarText: { fontSize: 18, fontWeight: "700", color: "#1e40af" },
  name: { fontSize: 15, fontWeight: "600", color: "#111827" },
  company: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  meta: { fontSize: 11, color: "#9ca3af", marginTop: 3 },
  stats: { alignItems: "center" },
  statNum: { fontSize: 18, fontWeight: "700", color: "#1e40af" },
  statLabel: { fontSize: 10, color: "#9ca3af" },
});
