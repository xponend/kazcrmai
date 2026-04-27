import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

// Priority colors
const PRIORITY_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  critical: { color: "#dc2626", bg: "#fef2f2", label: "Критический" },
  high: { color: "#ea580c", bg: "#fff7ed", label: "Высокий" },
  medium: { color: "#ca8a04", bg: "#fefce8", label: "Средний" },
  low: { color: "#16a34a", bg: "#f0fdf4", label: "Низкий" },
};

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  new: { color: "#3b82f6", label: "Новая" },
  in_progress: { color: "#f59e0b", label: "В работе" },
  resolved: { color: "#22c55e", label: "Решена" },
  closed: { color: "#6b7280", label: "Закрыта" },
};

// --- PriorityBadge ---
export function PriorityBadge({ priority }: { priority: string }) {
  const cfg = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.medium;
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <View style={[styles.dot, { backgroundColor: cfg.color }]} />
      <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

// --- StatusBadge ---
export function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.new;
  return (
    <View style={[styles.badge, { backgroundColor: cfg.color + "15" }]}>
      <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

// --- TicketCard ---
type TicketCardProps = {
  ticket: any;
  onPress: () => void;
};

export function TicketCard({ ticket, onPress }: TicketCardProps) {
  const priorityCfg = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.medium;
  return (
    <TouchableOpacity style={[styles.card, { borderLeftColor: priorityCfg.color }]} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={1}>{ticket.title}</Text>
        <PriorityBadge priority={ticket.priority} />
      </View>
      <Text style={styles.cardDesc} numberOfLines={2}>{ticket.description}</Text>
      <View style={styles.cardFooter}>
        <StatusBadge status={ticket.status} />
        <Text style={styles.cardMeta}>
          {ticket.clientId?.name || "Клиент"}
        </Text>
        <Text style={styles.cardTime}>
          {new Date(ticket.createdAt).toLocaleDateString("ru-RU")}
        </Text>
      </View>
      {ticket.aiCategory && (
        <View style={styles.aiTag}>
          <Ionicons name="sparkles" size={12} color="#7c3aed" />
          <Text style={styles.aiTagText}>ИИ: {ticket.aiCategory}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// --- AiAnalysis panel ---
type AiAnalysisProps = {
  ticket: any;
  aiResult?: any;
};

export function AiAnalysis({ ticket, aiResult }: AiAnalysisProps) {
  if (!ticket.aiCategory && !aiResult) return null;

  const data = aiResult || {
    classification: { category: ticket.aiCategory, confidence: ticket.aiConfidence },
    priority: { priority: ticket.priority, score: ticket.aiScore },
    routing: { assigneeName: ticket.assigneeId?.name },
  };

  return (
    <View style={styles.aiPanel}>
      <View style={styles.aiHeader}>
        <Ionicons name="sparkles" size={18} color="#7c3aed" />
        <Text style={styles.aiTitle}>ИИ-анализ</Text>
        {ticket.aiProcessedAt && (
          <Text style={styles.aiTime}>
            {new Date(ticket.aiProcessedAt).toLocaleTimeString("ru-RU")}
          </Text>
        )}
      </View>

      <View style={styles.aiRow}>
        <Text style={styles.aiLabel}>Категория</Text>
        <View style={styles.aiValue}>
          <Text style={styles.aiValueText}>{data.classification?.category || ticket.aiCategory}</Text>
          {(data.classification?.confidence || ticket.aiConfidence) && (
            <Text style={styles.aiConfidence}>
              {Math.round((data.classification?.confidence || ticket.aiConfidence) * 100)}%
            </Text>
          )}
        </View>
      </View>

      <View style={styles.aiRow}>
        <Text style={styles.aiLabel}>Приоритет</Text>
        <View style={styles.aiValue}>
          <PriorityBadge priority={data.priority?.priority || ticket.priority} />
          {(data.priority?.score || ticket.aiScore) && (
            <Text style={styles.aiScore}>{data.priority?.score || ticket.aiScore}/100</Text>
          )}
        </View>
      </View>

      <View style={styles.aiRow}>
        <Text style={styles.aiLabel}>Назначен</Text>
        <Text style={styles.aiValueText}>
          {data.routing?.assigneeName || ticket.assigneeId?.name || "—"}
        </Text>
      </View>

      {ticket.aiReason && (
        <Text style={styles.aiReason}>{ticket.aiReason}</Text>
      )}
    </View>
  );
}

// --- AI Assist panel (suggest-reply / summarize / similar) ---
import { useState } from "react";
import {
  aiSuggestReply,
  aiSummarizeTicket,
  aiSimilarTickets,
  type ReplySuggestion,
  type TicketSummary,
} from "../api/client";

type AssistTab = "reply" | "summary" | "similar" | null;

export function AiAssist({ ticketId }: { ticketId: string }) {
  const [tab, setTab] = useState<AssistTab>(null);
  const [loading, setLoading] = useState(false);
  const [replies, setReplies] = useState<ReplySuggestion[] | null>(null);
  const [summary, setSummary] = useState<TicketSummary | null>(null);
  const [similar, setSimilar] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const open = async (next: AssistTab) => {
    if (next === null || tab === next) {
      setTab(null);
      return;
    }
    setError(null);
    setTab(next);
    if (next === "reply" && replies === null) {
      setLoading(true);
      try {
        const { data } = await aiSuggestReply(ticketId);
        setReplies(data.suggestions);
      } catch (e: any) {
        setError(e.response?.data?.error ?? "Не удалось получить ответы");
      } finally {
        setLoading(false);
      }
    } else if (next === "summary" && summary === null) {
      setLoading(true);
      try {
        const { data } = await aiSummarizeTicket(ticketId);
        setSummary(data);
      } catch (e: any) {
        setError(e.response?.data?.error ?? "Не удалось получить саммари");
      } finally {
        setLoading(false);
      }
    } else if (next === "similar" && similar === null) {
      setLoading(true);
      try {
        const { data } = await aiSimilarTickets(ticketId);
        setSimilar(data.similar);
      } catch (e: any) {
        setError(e.response?.data?.error ?? "Не удалось найти похожие");
      } finally {
        setLoading(false);
      }
    }
  };

  const TONE_LABEL: Record<string, string> = {
    neutral: "Нейтральный",
    apologetic: "Извинения",
    actionable: "Действия",
  };

  return (
    <View style={styles.assistPanel}>
      <View style={styles.assistRow}>
        <TouchableOpacity
          style={[styles.assistBtn, tab === "reply" && styles.assistBtnActive]}
          onPress={() => open("reply")}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={16} color={tab === "reply" ? "#fff" : "#7c3aed"} />
          <Text style={[styles.assistBtnText, tab === "reply" && { color: "#fff" }]}>Ответ</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.assistBtn, tab === "summary" && styles.assistBtnActive]}
          onPress={() => open("summary")}
        >
          <Ionicons name="document-text-outline" size={16} color={tab === "summary" ? "#fff" : "#7c3aed"} />
          <Text style={[styles.assistBtnText, tab === "summary" && { color: "#fff" }]}>Саммари</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.assistBtn, tab === "similar" && styles.assistBtnActive]}
          onPress={() => open("similar")}
        >
          <Ionicons name="git-compare-outline" size={16} color={tab === "similar" ? "#fff" : "#7c3aed"} />
          <Text style={[styles.assistBtnText, tab === "similar" && { color: "#fff" }]}>Похожие</Text>
        </TouchableOpacity>
      </View>

      {tab && (
        <View style={styles.assistContent}>
          {loading && <Text style={styles.assistLoading}>Генерируется…</Text>}
          {error && <Text style={styles.assistError}>{error}</Text>}
          {!loading && !error && tab === "reply" &&
            replies?.map((r, i) => (
              <View key={i} style={styles.assistReply}>
                <Text style={styles.assistReplyTone}>{TONE_LABEL[r.tone] ?? r.tone}</Text>
                <Text style={styles.assistReplyBody}>{r.body}</Text>
              </View>
            ))}
          {!loading && !error && tab === "summary" && summary && (
            <View>
              <Text style={styles.assistSummary}>{summary.summary}</Text>
              {summary.keyPoints.map((p, i) => (
                <Text key={i} style={styles.assistPoint}>• {p}</Text>
              ))}
            </View>
          )}
          {!loading && !error && tab === "similar" && similar && (
            <View>
              {similar.length === 0 ? (
                <Text style={styles.assistEmpty}>Похожих заявок не найдено</Text>
              ) : (
                similar.map((t) => (
                  <View key={t._id} style={styles.assistSimilar}>
                    <Text style={styles.assistSimilarTitle}>{t.title}</Text>
                    <Text style={styles.assistSimilarMeta}>
                      [{t.aiCategory ?? t.category ?? "—"}] · {t.status}
                    </Text>
                  </View>
                ))
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Badge
  badge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  badgeText: { fontSize: 11, fontWeight: "600" },
  // Card
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 10, borderLeftWidth: 4, elevation: 2, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  cardTitle: { fontSize: 15, fontWeight: "600", color: "#111827", flex: 1, marginRight: 8 },
  cardDesc: { fontSize: 13, color: "#6b7280", lineHeight: 18, marginBottom: 10 },
  cardFooter: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardMeta: { fontSize: 11, color: "#9ca3af", flex: 1 },
  cardTime: { fontSize: 11, color: "#9ca3af" },
  aiTag: { flexDirection: "row", alignItems: "center", marginTop: 8, gap: 4 },
  aiTagText: { fontSize: 11, color: "#7c3aed", fontWeight: "500" },
  // AI Panel
  aiPanel: { backgroundColor: "#f5f3ff", borderRadius: 12, padding: 16, marginVertical: 12, borderWidth: 1, borderColor: "#e9d5ff" },
  aiHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14 },
  aiTitle: { fontSize: 16, fontWeight: "700", color: "#7c3aed", flex: 1 },
  aiTime: { fontSize: 11, color: "#a78bfa" },
  aiRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#e9d5ff" },
  aiLabel: { fontSize: 13, color: "#6b7280", fontWeight: "500" },
  aiValue: { flexDirection: "row", alignItems: "center", gap: 8 },
  aiValueText: { fontSize: 13, fontWeight: "600", color: "#111827" },
  aiConfidence: { fontSize: 11, color: "#7c3aed", fontWeight: "600" },
  aiScore: { fontSize: 12, color: "#6b7280" },
  aiReason: { fontSize: 12, color: "#6b7280", marginTop: 10, lineHeight: 17, fontStyle: "italic" },
  // AI Assist
  assistPanel: { marginVertical: 12 },
  assistRow: { flexDirection: "row", gap: 8 },
  assistBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#fff", borderColor: "#e9d5ff", borderWidth: 1, borderRadius: 10, paddingVertical: 10 },
  assistBtnActive: { backgroundColor: "#7c3aed", borderColor: "#7c3aed" },
  assistBtnText: { fontSize: 12, color: "#7c3aed", fontWeight: "600" },
  assistContent: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginTop: 10, borderWidth: 1, borderColor: "#e5e7eb" },
  assistLoading: { color: "#7c3aed", fontSize: 13, fontStyle: "italic" },
  assistError: { color: "#dc2626", fontSize: 13 },
  assistEmpty: { color: "#9ca3af", fontSize: 13, fontStyle: "italic" },
  assistReply: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  assistReplyTone: { fontSize: 11, fontWeight: "700", color: "#7c3aed", marginBottom: 4, textTransform: "uppercase" },
  assistReplyBody: { fontSize: 13, color: "#374151", lineHeight: 19 },
  assistSummary: { fontSize: 14, fontWeight: "600", color: "#111827", marginBottom: 8, lineHeight: 19 },
  assistPoint: { fontSize: 12, color: "#4b5563", marginVertical: 2, lineHeight: 17 },
  assistSimilar: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  assistSimilarTitle: { fontSize: 13, color: "#111827", marginBottom: 3 },
  assistSimilarMeta: { fontSize: 11, color: "#9ca3af" },
});
