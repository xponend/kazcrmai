import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useStore } from "../../store/useStore";

export default function ProfileScreen() {
  const { user, logout } = useStore();
  const router = useRouter();

  const roleLabels: Record<string, string> = {
    admin: "Администратор",
    manager: "Менеджер",
    operator: "Оператор",
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.name?.charAt(0) || "?"}</Text>
        </View>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{roleLabels[user?.role || ""] || user?.role}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.actionBtn} onPress={() => router.push("/edit-profile" as any)}>
        <Ionicons name="create-outline" size={20} color="#1e40af" />
        <Text style={styles.actionText}>Редактировать профиль</Text>
        <Ionicons name="chevron-forward" size={18} color="#9ca3af" style={styles.actionChevron} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionBtn} onPress={() => router.push("/change-password" as any)}>
        <Ionicons name="key-outline" size={20} color="#1e40af" />
        <Text style={styles.actionText}>Смена пароля</Text>
        <Ionicons name="chevron-forward" size={18} color="#9ca3af" style={styles.actionChevron} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Ionicons name="log-out-outline" size={20} color="#dc2626" />
        <Text style={styles.logoutText}>Выйти</Text>
      </TouchableOpacity>

      <Text style={styles.version}>CRM AI v1.0 · Дипломная работа · Satbayev University 2026</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc", padding: 20 },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 24, alignItems: "center", elevation: 2, shadowOpacity: 0.06, shadowRadius: 10, marginTop: 20 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#dbeafe", justifyContent: "center", alignItems: "center", marginBottom: 14 },
  avatarText: { fontSize: 28, fontWeight: "800", color: "#1e40af" },
  name: { fontSize: 20, fontWeight: "700", color: "#111827" },
  email: { fontSize: 14, color: "#6b7280", marginTop: 4 },
  roleBadge: { marginTop: 10, paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20, backgroundColor: "#eff6ff" },
  roleText: { fontSize: 13, fontWeight: "600", color: "#1e40af" },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 24, padding: 16, backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#e5e7eb" },
  actionText: { fontSize: 15, fontWeight: "600", color: "#111827" },
  actionChevron: { marginLeft: "auto" },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 14, padding: 16, backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#fecaca" },
  logoutText: { fontSize: 15, fontWeight: "600", color: "#dc2626" },
  version: { textAlign: "center", marginTop: 40, fontSize: 11, color: "#d1d5db" },
});
