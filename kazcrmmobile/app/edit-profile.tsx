import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useStore } from "../store/useStore";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function EditProfileScreen() {
  const { user, updateProfile } = useStore();
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      return Alert.alert("Ошибка", "Введите имя");
    }
    if (!EMAIL_RE.test(trimmedEmail)) {
      return Alert.alert("Ошибка", "Введите корректный email");
    }

    setLoading(true);
    try {
      await updateProfile({ name: trimmedName, email: trimmedEmail });
      Alert.alert("Готово", "Профиль обновлён", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      const code = err.response?.data?.code;
      const message =
        code === "EMAIL_TAKEN"
          ? "Этот email уже занят"
          : err.response?.data?.error || "Не удалось обновить профиль";
      Alert.alert("Ошибка", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.label}>Имя</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="person-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Имя"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <Text style={styles.label}>Email (логин)</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="mail-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="email@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholderTextColor="#9ca3af"
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.btn, loading && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.btnText}>{loading ? "Сохранение..." : "Сохранить"}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  content: { padding: 20 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    marginTop: 10,
  },
  label: { fontSize: 14, fontWeight: "600", color: "#374151", marginTop: 12, marginBottom: 6 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  inputIcon: { paddingLeft: 14 },
  input: { flex: 1, padding: 14, fontSize: 16, color: "#111827" },
  btn: { backgroundColor: "#1e40af", padding: 16, borderRadius: 12, alignItems: "center", marginTop: 24 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
