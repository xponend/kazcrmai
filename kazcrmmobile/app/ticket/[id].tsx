import { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getTicket, updateTicket } from "../../api/client";
import { AiAnalysis, PriorityBadge, StatusBadge } from "../../components/CrmComponents";

const NEXT_STATUS: Record<string, string> = {
  new: "in_progress",
  in_progress: "resolved",
  resolved: "closed",
};

const STATUS_ACTION: Record<string, string> = {
  new: "Взять в работу",
  in_progress: "Отметить решённой",
  resolved: "Закрыть заявку",
};

export default function TicketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [ticket, setTicket] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const { data } = await getTicket(id);
      setTicket(data.ticket);
      setHistory(data.history);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const changeStatus = async () => {
    const next = NEXT_STATUS[ticket.status];
    if (!next) return;
    try {
      await updateTicket(id, { status: next });
      await load();
    } catch (err: any) {
      Alert.alert("Ошибка", err.response?.data?.error || "Не удалось обновить");
    }
  };

  if (loading || !ticket) {
    return <View style={styles.center}><Text style={{ color: "#9ca3af" }}>Загрузка...</Text></View>;
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{ticket.title}</Text>
        <View style={styles.badges}>
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
        </View>
      </View>

      {/* Description */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Описание</Text>
        <Text style={styles.description}>{ticket.description}</Text>
      </View>

      {/* Client info */}
      <View style={styles.infoRow}>
        <Ionicons name="business-outline" size={16} color="#6b7280" />
        <Text style={styles.infoText}>{ticket.clientId?.name} · {ticket.clientId?.company}</Text>
      </View>
      <View style={styles.infoRow}>
        <Ionicons name="person-outline" size={16} color="#6b7280" />
        <Text style={styles.infoText}>Исполнитель: {ticket.assigneeId?.name || "Не назначен"}</Text>
      </View>
      <View style={styles.infoRow}>
        <Ionicons name="calendar-outline" size={16} color="#6b7280" />
        <Text style={styles.infoText}>Создана: {new Date(ticket.createdAt).toLocaleString("ru-RU")}</Text>
      </View>

      {/* AI Analysis */}
      <AiAnalysis ticket={ticket} />

      {/* Status action button */}
      {NEXT_STATUS[ticket.status] && (
        <TouchableOpacity style={styles.actionBtn} onPress={changeStatus}>
          <Ionicons name="arrow-forward-circle" size={20} color="#fff" />
          <Text style={styles.actionText}>{STATUS_ACTION[ticket.status]}</Text>
        </TouchableOpacity>
      )}

      {/* History timeline */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>История</Text>
        {history.map((h, i) => (
          <View key={h._id || i} style={styles.historyItem}>
            <View style={styles.historyDot} />
            <View style={styles.historyContent}>
              <Text style={styles.historyAction}>
                {h.action === "created" && "Заявка создана"}
                {h.action === "status_changed" && `Статус: ${h.oldValue} → ${h.newValue}`}
                {h.action === "assigned" && "Назначен исполнитель"}
                {h.action === "ai_processed" && "ИИ-анализ выполнен"}
                {h.action === "priority_changed" && `Приоритет: ${h.oldValue} → ${h.newValue}`}
              </Text>
              {h.comment && <Text style={styles.historyComment}>{h.comment}</Text>}
              <Text style={styles.historyTime}>
                {new Date(h.createdAt).toLocaleString("ru-RU")}
                {h.performedBy?.name ? ` · ${h.performedBy.name}` : ""}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc", padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { marginBottom: 16 },
  title: { fontSize: 20, fontWeight: "700", color: "#111827", marginBottom: 8 },
  badges: { flexDirection: "row", gap: 8 },
  section: { marginVertical: 12 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#374151", marginBottom: 8 },
  description: { fontSize: 15, color: "#4b5563", lineHeight: 22 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6 },
  infoText: { fontSize: 13, color: "#6b7280" },
  actionBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#1e40af", padding: 16, borderRadius: 12, marginVertical: 12 },
  actionText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  historyItem: { flexDirection: "row", marginBottom: 14, gap: 12 },
  historyDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#1e40af", marginTop: 4 },
  historyContent: { flex: 1 },
  historyAction: { fontSize: 13, fontWeight: "600", color: "#111827" },
  historyComment: { fontSize: 12, color: "#6b7280", marginTop: 3, lineHeight: 17 },
  historyTime: { fontSize: 11, color: "#9ca3af", marginTop: 3 },
});
