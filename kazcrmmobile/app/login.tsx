import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStore } from "../store/useStore";

export default function LoginScreen() {
  const [email, setEmail] = useState("aizhan@crm.kz");
  const [password, setPassword] = useState("pass123");
  const [loading, setLoading] = useState(false);
  const { login } = useStore();

  const handleLogin = async () => {
    if (!email || !password) return Alert.alert("Ошибка", "Заполните все поля");
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      Alert.alert("Ошибка входа", err.response?.data?.error || "Проверьте данные");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.header}>
        <Ionicons name="cube" size={48} color="#1e40af" />
        <Text style={styles.title}>CRM AI</Text>
        <Text style={styles.subtitle}>Интеллектуальная система управления заявками</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputWrap}>
          <Ionicons name="mail-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
          <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#9ca3af" />
        </View>

        <View style={styles.inputWrap}>
          <Ionicons name="lock-closed-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
          <TextInput style={styles.input} placeholder="Пароль" value={password} onChangeText={setPassword} secureTextEntry placeholderTextColor="#9ca3af" />
        </View>

        <TouchableOpacity style={[styles.btn, loading && { opacity: 0.6 }]} onPress={handleLogin} disabled={loading}>
          <Text style={styles.btnText}>{loading ? "Вход..." : "Войти"}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.hint}>Тестовый вход: aizhan@crm.kz / pass123</Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc", justifyContent: "center", padding: 24 },
  header: { alignItems: "center", marginBottom: 40 },
  title: { fontSize: 32, fontWeight: "800", color: "#1e40af", marginTop: 12 },
  subtitle: { fontSize: 14, color: "#6b7280", marginTop: 6, textAlign: "center" },
  form: { gap: 14 },
  inputWrap: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#e5e7eb" },
  inputIcon: { paddingLeft: 14 },
  input: { flex: 1, padding: 14, fontSize: 16, color: "#111827" },
  btn: { backgroundColor: "#1e40af", padding: 16, borderRadius: 12, alignItems: "center", marginTop: 6 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  hint: { textAlign: "center", marginTop: 24, fontSize: 12, color: "#9ca3af" },
});
