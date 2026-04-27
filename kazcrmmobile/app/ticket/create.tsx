import { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { createTicket, getClients, aiPreviewTicket, type AiPreviewResult } from "../../api/client";
import { AiAnalysis } from "../../components/CrmComponents";

type AiStep = { label: string; done: boolean; result?: string };

export default function CreateTicketScreen() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [aiSteps, setAiSteps] = useState<AiStep[]>([]);
  const [aiResult, setAiResult] = useState<any>(null);
  const [createdTicket, setCreatedTicket] = useState<any>(null);
  const [preview, setPreview] = useState<AiPreviewResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewUnavailable, setPreviewUnavailable] = useState(false);
  const router = useRouter();

  useEffect(() => {
    getClients().then(({ data }) => {
      setClients(data.clients);
      if (data.clients.length > 0) setSelectedClient(data.clients[0]._id);
    });
  }, []);

  // Live AI preview: debounced predict-only call as the user types.
  useEffect(() => {
    if (previewUnavailable) return;
    if (title.trim().length < 8 || description.trim().length < 20) {
      setPreview(null);
      return;
    }
    const handle = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const { data } = await aiPreviewTicket({ title, description });
        setPreview(data);
      } catch (err: any) {
        if (err.response?.status === 404) setPreviewUnavailable(true);
      } finally {
        setPreviewLoading(false);
      }
    }, 1500);
    return () => clearTimeout(handle);
  }, [title, description, previewUnavailable]);

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      return Alert.alert("Ошибка", "Заполните тему и описание");
    }
    if (!selectedClient) {
      return Alert.alert("Ошибка", "Выберите клиента");
    }

    setSubmitting(true);
    setAiSteps([
      { label: "Создание заявки...", done: false },
      { label: "Анализ текста обращения...", done: false },
      { label: "Определение категории...", done: false },
      { label: "Оценка приоритетности...", done: false },
      { label: "Назначение исполнителя...", done: false },
    ]);

    // Animate steps
    const animateStep = (index: number) => {
      setTimeout(() => {
        setAiSteps((prev) => prev.map((s, i) => (i === index ? { ...s, done: true } : s)));
      }, index * 400);
    };
    animateStep(0);

    try {
      const { data } = await createTicket({ title, description, clientId: selectedClient });

      // Complete remaining animation steps quickly
      for (let i = 1; i < 5; i++) animateStep(i);

      setTimeout(() => {
        setCreatedTicket(data.ticket);
        setAiResult(data.aiResult);
        setSubmitting(false);
      }, 2200);
    } catch (err: any) {
      setSubmitting(false);
      setAiSteps([]);
      Alert.alert("Ошибка", err.response?.data?.error || "Не удалось создать заявку");
    }
  };

  // After AI processing — show result
  if (createdTicket) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.successHeader}>
          <Ionicons name="checkmark-circle" size={48} color="#22c55e" />
          <Text style={styles.successTitle}>Заявка создана</Text>
          <Text style={styles.successSub}>ИИ-агенты завершили анализ</Text>
        </View>

        <View style={styles.createdCard}>
          <Text style={styles.createdTitle}>{createdTicket.title}</Text>
          <Text style={styles.createdClient}>{createdTicket.clientId?.name}</Text>
        </View>

        <AiAnalysis ticket={createdTicket} aiResult={aiResult} />

        {aiResult && (
          <View style={styles.timingCard}>
            <Ionicons name="flash" size={16} color="#f59e0b" />
            <Text style={styles.timingText}>
              Обработано за {aiResult.processingTimeMs}мс
            </Text>
          </View>
        )}

        <TouchableOpacity style={styles.viewBtn} onPress={() => router.replace(`/ticket/${createdTicket._id}`)}>
          <Text style={styles.viewBtnText}>Открыть заявку</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Вернуться к списку</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      {/* Form */}
      {!submitting && (
        <>
          <Text style={styles.label}>Клиент</Text>
          <View style={styles.clientPicker}>
            {clients.map((c) => (
              <TouchableOpacity
                key={c._id}
                style={[styles.clientChip, selectedClient === c._id && styles.clientChipActive]}
                onPress={() => setSelectedClient(c._id)}
              >
                <Text style={[styles.clientChipText, selectedClient === c._id && { color: "#fff" }]} numberOfLines={1}>
                  {c.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Тема заявки</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Кратко опишите суть обращения" placeholderTextColor="#9ca3af" />

          <Text style={styles.label}>Описание</Text>
          <TextInput style={[styles.input, styles.textarea]} value={description} onChangeText={setDescription} placeholder="Подробное описание проблемы или запроса клиента..." placeholderTextColor="#9ca3af" multiline numberOfLines={6} textAlignVertical="top" />

          {(previewLoading || preview) && !previewUnavailable && (
            <View style={styles.previewCard}>
              <View style={styles.previewHeader}>
                <Ionicons name="sparkles" size={14} color="#7c3aed" />
                <Text style={styles.previewTitle}>ИИ предсказывает</Text>
                {previewLoading && <Text style={styles.previewMuted}>анализирует…</Text>}
              </View>
              {preview && (
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Категория</Text>
                  <Text style={styles.previewValue}>
                    {preview.classification.category}{" "}
                    <Text style={styles.previewMuted}>
                      {Math.round(preview.classification.confidence * 100)}%
                    </Text>
                  </Text>
                </View>
              )}
              {preview && (
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Приоритет</Text>
                  <Text
                    style={[
                      styles.previewValue,
                      preview.priority.priority === "critical" && { color: "#dc2626" },
                      preview.priority.priority === "high" && { color: "#f59e0b" },
                    ]}
                  >
                    {preview.priority.priority}{" "}
                    <Text style={styles.previewMuted}>{preview.priority.score}/100</Text>
                  </Text>
                </View>
              )}
            </View>
          )}

          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
            <Ionicons name="sparkles" size={20} color="#fff" />
            <Text style={styles.submitText}>Создать и запустить ИИ-анализ</Text>
          </TouchableOpacity>
        </>
      )}

      {/* AI processing animation */}
      {submitting && (
        <View style={styles.processingContainer}>
          <ActivityIndicator size="large" color="#7c3aed" style={{ marginBottom: 20 }} />
          <Text style={styles.processingTitle}>ИИ-агенты обрабатывают заявку</Text>

          {aiSteps.map((step, i) => (
            <View key={i} style={styles.stepRow}>
              {step.done ? (
                <Ionicons name="checkmark-circle" size={22} color="#22c55e" />
              ) : (
                <View style={styles.stepPending} />
              )}
              <Text style={[styles.stepText, step.done && styles.stepDone]}>{step.label}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc", padding: 16 },
  label: { fontSize: 14, fontWeight: "600", color: "#374151", marginTop: 16, marginBottom: 6 },
  input: { backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#e5e7eb", padding: 14, fontSize: 15, color: "#111827" },
  textarea: { height: 140 },
  clientPicker: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  clientChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb" },
  clientChipActive: { backgroundColor: "#1e40af", borderColor: "#1e40af" },
  clientChipText: { fontSize: 12, color: "#374151", fontWeight: "500" },
  submitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#7c3aed", padding: 16, borderRadius: 12, marginTop: 24 },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  // Live AI preview
  previewCard: { backgroundColor: "#f5f3ff", borderRadius: 10, padding: 12, marginTop: 12, borderWidth: 1, borderColor: "#e9d5ff" },
  previewHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  previewTitle: { fontSize: 12, fontWeight: "700", color: "#7c3aed", textTransform: "uppercase", flex: 1 },
  previewRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  previewLabel: { fontSize: 12, color: "#6b7280" },
  previewValue: { fontSize: 13, fontWeight: "600", color: "#111827" },
  previewMuted: { fontSize: 11, color: "#9ca3af", fontStyle: "italic", fontWeight: "400" },
  // Processing animation
  processingContainer: { alignItems: "center", paddingTop: 40 },
  processingTitle: { fontSize: 18, fontWeight: "700", color: "#7c3aed", marginBottom: 30 },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16, width: "100%" },
  stepPending: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: "#d1d5db" },
  stepText: { fontSize: 15, color: "#9ca3af" },
  stepDone: { color: "#111827", fontWeight: "500" },
  // Success state
  successHeader: { alignItems: "center", paddingVertical: 20 },
  successTitle: { fontSize: 22, fontWeight: "800", color: "#111827", marginTop: 10 },
  successSub: { fontSize: 14, color: "#6b7280", marginTop: 4 },
  createdCard: { backgroundColor: "#fff", borderRadius: 12, padding: 16, marginBottom: 4 },
  createdTitle: { fontSize: 16, fontWeight: "600", color: "#111827" },
  createdClient: { fontSize: 13, color: "#6b7280", marginTop: 4 },
  timingCard: { flexDirection: "row", alignItems: "center", gap: 6, justifyContent: "center", paddingVertical: 10 },
  timingText: { fontSize: 13, color: "#f59e0b", fontWeight: "600" },
  viewBtn: { backgroundColor: "#1e40af", padding: 16, borderRadius: 12, alignItems: "center", marginTop: 16 },
  viewBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  backBtn: { padding: 16, alignItems: "center", marginTop: 8 },
  backBtnText: { color: "#6b7280", fontSize: 14 },
});
