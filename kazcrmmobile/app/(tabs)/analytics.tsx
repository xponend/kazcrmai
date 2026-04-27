import { useState, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, RefreshControl, Dimensions } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { PieChart, BarChart } from "react-native-chart-kit";
import { getAnalytics } from "../../api/client";

const screenWidth = Dimensions.get("window").width - 48;
const COLORS = ["#3b82f6", "#ef4444", "#f59e0b", "#22c55e", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"];

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <View style={[styles.stat, { borderLeftColor: color }]}>   
      <Ionicons name={icon as any} size={20} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function AnalyticsScreen() {
  const [data, setData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const res = await getAnalytics();
      setData(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  if (!data) return <View style={styles.container}><Text style={{ textAlign: "center", marginTop: 40, color: "#9ca3af" }}>Загрузка...</Text></View>;

  const pieData = (data.byCategory || []).map((c: any, i: number) => ({
    name: c._id || "Другое",
    count: c.count,
    color: COLORS[i % COLORS.length],
    legendFontColor: "#6b7280",
    legendFontSize: 11,
  }));

  const barData = {
    labels: (data.operatorLoad || []).map((o: any) => o.name.split(" ")[0]),
    datasets: [{ data: (data.operatorLoad || []).map((o: any) => o.currentLoad) }],
  };

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}>
      {/* KPI cards */}
      <View style={styles.statsRow}>
        <StatCard icon="ticket" label="Всего заявок" value={String(data.totalTickets)} color="#3b82f6" />
        <StatCard icon="alert-circle" label="Открытые" value={String(data.openTickets)} color="#ef4444" />
      </View>
      <View style={styles.statsRow}>
        <StatCard icon="time" label="Ср. обработка" value={`${data.avgProcessingMins} мин`} color="#f59e0b" />
        <StatCard icon="sparkles" label="Точность ИИ" value={`${Math.round(data.aiAccuracy * 100)}%`} color="#8b5cf6" />
      </View>

      {/* Category pie chart */}
      {pieData.length > 0 && (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Заявки по категориям</Text>
          <PieChart
            data={pieData}
            width={screenWidth}
            height={200}
            chartConfig={{ color: () => "#000" }}
            accessor="count"
            backgroundColor="transparent"
            paddingLeft="0"
            absolute
          />
        </View>
      )}

      {/* Operator load bar chart */}
      {barData.labels.length > 0 && (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Нагрузка операторов</Text>
          <BarChart
            data={barData}
            width={screenWidth}
            height={220}
            yAxisLabel=""
            yAxisSuffix=""
            chartConfig={{
              backgroundColor: "#fff",
              backgroundGradientFrom: "#fff",
              backgroundGradientTo: "#fff",
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(30, 64, 175, ${opacity})`,
              labelColor: () => "#6b7280",
              barPercentage: 0.6,
            }}
            style={{ borderRadius: 12 }}
          />
        </View>
      )}

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc", padding: 12 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  stat: { flex: 1, backgroundColor: "#fff", borderRadius: 12, padding: 14, borderLeftWidth: 4, elevation: 1, shadowOpacity: 0.04, shadowRadius: 6, gap: 4 },
  statValue: { fontSize: 22, fontWeight: "800", color: "#111827" },
  statLabel: { fontSize: 11, color: "#9ca3af" },
  chartCard: { backgroundColor: "#fff", borderRadius: 12, padding: 16, marginBottom: 12, elevation: 1, shadowOpacity: 0.04, shadowRadius: 6 },
  chartTitle: { fontSize: 15, fontWeight: "700", color: "#111827", marginBottom: 12 },
});
