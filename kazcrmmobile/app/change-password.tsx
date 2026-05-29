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

export default function ChangePasswordScreen() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { changePassword } = useStore();
  const router = useRouter();

  const handleSubmit = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      return Alert.alert("Ошибка", "Заполните все поля");
    }
    if (newPassword.length < 8) {
      return Alert.alert("Ошибка", "Новый пароль должен содержать не менее 8 символов");
    }
    if (newPassword !== confirmPassword) {
      return Alert.alert("Ошибка", "Новые пароли не совпадают");
    }

    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      Alert.alert("Готово", "Пароль изменён", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      const code = err.response?.data?.code;
      const message =
        code === "BAD_PASSWORD"
          ? "Текущий пароль неверен"
          : err.response?.data?.error || "Не удалось изменить пароль";
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
          <Text style={styles.label}>Текущий пароль</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="lock-closed-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Текущий пароль"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
              autoCapitalize="none"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <Text style={styles.label}>Новый пароль</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="key-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Не менее 8 символов"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              autoCapitalize="none"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <Text style={styles.label}>Повторите новый пароль</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="key-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Повторите новый пароль"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
              placeholderTextColor="#9ca3af"
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.btn, loading && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.btnText}>{loading ? "Сохранение..." : "Сменить пароль"}</Text>
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
