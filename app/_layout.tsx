import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { FrequencyProvider } from "./../context/FrequencyContext";
import * as React from "react";

export default function RootLayout() {
  const [loaded] = useFonts({
    "Happy-Monkey": require("../assets/fonts/HappyMonkey-Regular.ttf"),
    Outfit: require("../assets/fonts/Outfit-VariableFont_wght.ttf"),
    "Outfit-Black": require("../assets/fonts/Outfit-Black.ttf"),
    "Outfit-Bold": require("../assets/fonts/Outfit-Bold.ttf"),
  });

  return (
    <>
      <FrequencyProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "white" },
            animation: "slide_from_right",
            header: () => null,
            navigationBarHidden: true,
          }}
        >
          <Stack.Screen
            name="index"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="medications/add"
            options={{ headerShown: false, headerBackTitle: "", title: "" }}
          />
        </Stack>
      </FrequencyProvider>
    </>
  );
}
