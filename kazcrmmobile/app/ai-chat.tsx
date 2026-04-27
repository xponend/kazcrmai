import { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { aiChat, type ChatTurn } from "../api/client";

type Message = ChatTurn & { id: string };

const QUICK_PROMPTS = [
  "Сколько открытых критических заявок?",
  "Что случилось за последние 24 часа?",
  "Какие категории чаще всего обращаются?",
  "Перечисли просроченные заявки",
];

export default function AiChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [stats, setStats] = useState<{ total: number; open: number; critical: number } | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const send = async (text?: string) => {
    const message = (text ?? draft).trim();
    if (!message || sending) return;
    setDraft("");
    const userMsg: Message = { id: String(Date.now()), role: "user", content: message };
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);

    try {
      // Pass last 10 turns as history (sanitized).
      const history: ChatTurn[] = messages.slice(-10).map((m) => ({ role: m.role, content: m.content }));
      const { data } = await aiChat(message, history);
      setStats(data.contextStats);
      setMessages((prev) => [
        ...prev,
        { id: String(Date.now() + 1), role: "assistant", content: data.reply },
      ]);
    } catch (err: any) {
      const errorText =
        err.response?.status === 404
          ? "Чат пока недоступен на сервере."
          : err.response?.data?.error ?? "Не удалось получить ответ. Попробуйте позже.";
      setMessages((prev) => [
        ...prev,
        { id: String(Date.now() + 1), role: "assistant", content: errorText },
      ]);
    } finally {
      setSending(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="sparkles" size={20} color="#7c3aed" />
          <Text style={styles.headerTitle}>ИИ-ассистент</Text>
        </View>
        {stats && (
          <Text style={styles.headerStats}>
            {stats.total} заявок · {stats.open} откр. · {stats.critical} крит.
          </Text>
        )}
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.length === 0 && (
          <View style={styles.welcomeCard}>
            <Ionicons name="chatbubbles-outline" size={32} color="#7c3aed" />
            <Text style={styles.welcomeTitle}>Спросите ассистента</Text>
            <Text style={styles.welcomeSub}>
              Я отвечаю на основе свежих данных по заявкам и приоритетам.
            </Text>
            <View style={styles.quickRow}>
              {QUICK_PROMPTS.map((q) => (
                <TouchableOpacity key={q} style={styles.quickChip} onPress={() => send(q)}>
                  <Text style={styles.quickText}>{q}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {messages.map((m) => (
          <View
            key={m.id}
            style={[styles.bubble, m.role === "user" ? styles.userBubble : styles.botBubble]}
          >
            <Text style={[styles.bubbleText, m.role === "user" && { color: "#fff" }]}>
              {m.content}
            </Text>
          </View>
        ))}

        {sending && (
          <View style={[styles.bubble, styles.botBubble]}>
            <ActivityIndicator size="small" color="#7c3aed" />
          </View>
        )}
      </ScrollView>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Спросите про заявки…"
          placeholderTextColor="#9ca3af"
          value={draft}
          onChangeText={setDraft}
          editable={!sending}
          onSubmitEditing={() => send()}
          returnKeyType="send"
          multiline
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!draft.trim() || sending) && { opacity: 0.5 }]}
          onPress={() => send()}
          disabled={!draft.trim() || sending}
        >
          <Ionicons name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    backgroundColor: "#fff",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#7c3aed" },
  headerStats: { fontSize: 11, color: "#6b7280" },
  scroll: { flex: 1 },
  scrollContent: { padding: 14, gap: 8 },
  welcomeCard: {
    backgroundColor: "#f5f3ff",
    borderRadius: 12,
    padding: 18,
    alignItems: "center",
    marginTop: 24,
    borderWidth: 1,
    borderColor: "#e9d5ff",
  },
  welcomeTitle: { fontSize: 16, fontWeight: "700", color: "#7c3aed", marginTop: 8 },
  welcomeSub: { fontSize: 12, color: "#6b7280", marginTop: 4, textAlign: "center" },
  quickRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 16, justifyContent: "center" },
  quickChip: {
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e9d5ff",
  },
  quickText: { fontSize: 11, color: "#7c3aed", fontWeight: "500" },
  bubble: {
    maxWidth: "85%",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
  },
  userBubble: { backgroundColor: "#1e40af", alignSelf: "flex-end", borderBottomRightRadius: 4 },
  botBubble: { backgroundColor: "#fff", alignSelf: "flex-start", borderWidth: 1, borderColor: "#e5e7eb", borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 14, color: "#111827", lineHeight: 19 },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
    maxHeight: 120,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#7c3aed",
    alignItems: "center",
    justifyContent: "center",
  },
});
