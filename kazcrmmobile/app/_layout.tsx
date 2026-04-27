import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useStore } from "../store/useStore";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { user, isLoading, restoreSession } = useStore();

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    if (!isLoading) SplashScreen.hideAsync();
  }, [isLoading]);

  if (isLoading) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={!!user}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="ticket/[id]"
            options={{ headerShown: true, title: "Заявка", headerTintColor: "#1e40af" }}
          />
          <Stack.Screen
            name="ticket/create"
            options={{
              headerShown: true,
              title: "Новая заявка",
              headerTintColor: "#1e40af",
              presentation: "modal",
            }}
          />
          <Stack.Screen
            name="ai-chat"
            options={{
              headerShown: true,
              title: "ИИ-ассистент",
              headerTintColor: "#7c3aed",
              presentation: "modal",
            }}
          />
        </Stack.Protected>
        <Stack.Protected guard={!user}>
          <Stack.Screen name="login" />
        </Stack.Protected>
      </Stack>
    </GestureHandlerRootView>
  );
}
