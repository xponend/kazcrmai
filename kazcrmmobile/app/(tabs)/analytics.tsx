import { useState, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, RefreshControl, Dimensions, TouchableOpacity } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { PieChart, BarChart } from "react-native-chart-kit";
import { getAnalytics, aiDigest, type DigestResponse } from "../../api/client";

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

const DIGEST_WINDOWS = [
  { label: "24ч", hours: 24 },
  { label: "7д", hours: 24 * 7 },
  { label: "30д", hours: 24 * 30 },
];

export default function AnalyticsScreen() {
  const [data, setData] = useState<any>(null);
  const [digest, setDigest] = useState<DigestResponse | null>(null);
  const [digestLoading, setDigestLoading] = useState(false);
  const [digestHours, setDigestHours] = useState(24);
  const [digestUnavailable, setDigestUnavailable] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const res = await getAnalytics();
      setData(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadDigest = useCallback(async (hours: number) => {
    setDigestLoading(true);
    setDigestUnavailable(false);
    try {
      const { data } = await aiDigest(hours);
      setDigest(data);
    } catch (err: any) {
      // 403 (operator role) or 404 (legacy server) — silently hide the panel.
      if (err.response?.status === 403 || err.response?.status === 404) {
        setDigestUnavailable(true);
      } else {
        console.error("digest error:", err);
      }
    } finally {
      setDigestLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      loadDigest(digestHours);
    }, [digestHours, loadDigest])
  );

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
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await Promise.all([load(), loadDigest(digestHours)]);
            setRefreshing(false);
          }}
        />
      }
    >
      {/* AI Digest */}
      {!digestUnavailable && (
        <View style={styles.digestCard}>
          <View style={styles.digestHeader}>
            <Ionicons name="sparkles" size={18} color="#7c3aed" />
            <Text style={styles.digestTitle}>ИИ-дайджест</Text>
            <View style={styles.digestWindows}>
              {DIGEST_WINDOWS.map((w) => (
                <TouchableOpacity
                  key={w.hours}
                  style={[styles.windowChip, digestHours === w.hours && styles.windowChipActive]}
                  onPress={() => setDigestHours(w.hours)}
                >
                  <Text
                    style={[styles.windowChipText, digestHours === w.hours && { color: "#fff" }]}
                  >
                    {w.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          {digestLoading && <Text style={styles.digestMuted}>Анализируем…</Text>}
          {!digestLoading && digest && (
            <>
              {digest.headline ? (
                <Text style={styles.digestHeadline}>{digest.headline}</Text>
              ) : (
                <Text style={styles.digestMuted}>ИИ временно недоступен — показаны только метрики.</Text>
              )}
              <View style={styles.digestStatsRow}>
                <View style={styles.digestStat}>
                  <Text style={styles.digestStatVal}>{digest.totalTickets}</Text>
                  <Text style={styles.digestStatLbl}>Всего</Text>
                </View>
                <View style={styles.digestStat}>
                  <Text style={styles.digestStatVal}>{digest.newTickets}</Text>
                  <Text style={styles.digestStatLbl}>Новые</Text>
                </View>
                <View style={styles.digestStat}>
                  <Text style={styles.digestStatVal}>{digest.resolvedTickets}</Text>
                  <Text style={styles.digestStatLbl}>Решено</Text>
                </View>
                <View style={styles.digestStat}>
                  <Text style={styles.digestStatVal}>{Math.round(digest.avgResolutionMins)}м</Text>
                  <Text style={styles.digestStatLbl}>Ср. время</Text>
                </View>
              </View>
              {digest.insights.length > 0 && (
                <View style={styles.digestSection}>
                  <Text style={styles.digestLabel}>Инсайты</Text>
                  {digest.insights.map((s, i) => (
                    <Text key={i} style={styles.digestPoint}>• {s}</Text>
                  ))}
                </View>
              )}
              {digest.recommendations.length > 0 && (
                <View style={styles.digestSection}>
                  <Text style={styles.digestLabel}>Рекомендации</Text>
                  {digest.recommendations.map((s, i) => (
                    <Text key={i} style={styles.digestRec}>→ {s}</Text>
                  ))}
                </View>
              )}
            </>
          )}
        </View>
      )}

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
  // AI digest
  digestCard: { backgroundColor: "#f5f3ff", borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: "#e9d5ff" },
  digestHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  digestTitle: { fontSize: 14, fontWeight: "700", color: "#7c3aed", flex: 1 },
  digestWindows: { flexDirection: "row", gap: 4 },
  windowChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: "#e9d5ff" },
  windowChipActive: { backgroundColor: "#7c3aed", borderColor: "#7c3aed" },
  windowChipText: { fontSize: 11, color: "#7c3aed", fontWeight: "600" },
  digestMuted: { fontSize: 12, color: "#9ca3af", fontStyle: "italic" },
  digestHeadline: { fontSize: 14, fontWeight: "700", color: "#111827", marginBottom: 10, lineHeight: 19 },
  digestStatsRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  digestStat: { flex: 1, backgroundColor: "#fff", borderRadius: 8, padding: 8, alignItems: "center" },
  digestStatVal: { fontSize: 16, fontWeight: "800", color: "#7c3aed" },
  digestStatLbl: { fontSize: 10, color: "#6b7280", marginTop: 2 },
  digestSection: { marginTop: 8 },
  digestLabel: { fontSize: 11, fontWeight: "700", color: "#7c3aed", textTransform: "uppercase", marginBottom: 4 },
  digestPoint: { fontSize: 12, color: "#374151", marginVertical: 2, lineHeight: 17 },
  digestRec: { fontSize: 12, color: "#0f766e", marginVertical: 2, lineHeight: 17, fontWeight: "500" },
});
