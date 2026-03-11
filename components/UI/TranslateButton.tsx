import React, { useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemeContext } from "../../contexts/SettingsContexts/ThemeContext";
import { NativeTranslation } from "../../utils/nativeTranslation";

type TranslateButtonProps = {
  text: string;
  onTranslated: (translatedText: string) => void;
  onShowOriginal: () => void;
};

export default function TranslateButton({
  text,
  onTranslated,
  onShowOriginal,
}: TranslateButtonProps) {
  const { theme } = useContext(ThemeContext);
  const [available, setAvailable] = useState(false);
  const [isDeviceLanguage, setIsDeviceLanguage] = useState(false);
  const [isTranslated, setIsTranslated] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    NativeTranslation.isAvailable().then((isAvail) => {
      if (!cancelled) setAvailable(isAvail);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Detect language on mount to hide button for device-language text
  useEffect(() => {
    if (!available || text.length < 20) return;
    let cancelled = false;
    NativeTranslation.detectLanguage(text).then((detection) => {
      if (!cancelled && detection?.isDeviceLanguage) {
        setIsDeviceLanguage(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [available, text]);

  // Only show for substantial text that isn't already in the device language
  if (!available || text.length < 20 || isDeviceLanguage) return null;

  const handleTranslate = async () => {
    if (isTranslated) {
      setIsTranslated(false);
      onShowOriginal();
      return;
    }

    setLoading(true);

    const detection = await NativeTranslation.detectLanguage(text);
    const response = await NativeTranslation.translate(
      text,
      detection?.language ?? null,
    );
    setLoading(false);

    if ("error" in response) {
      Alert.alert(
        "Translation Unavailable",
        "The language pack may need to be downloaded. Go to Settings > General > Language & Region > Translation Languages to download it.",
      );
      return;
    }

    setIsTranslated(true);
    onTranslated(response.result.translatedText);
  };

  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: theme.tint }]}
      onPress={handleTranslate}
      disabled={loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator size="small" color={theme.iconPrimary} />
      ) : (
        <>
          <Feather
            name="globe"
            size={14}
            color={theme.iconPrimary}
          />
          <Text style={[styles.text, { color: theme.iconPrimary }]}>
            {isTranslated ? "Show Original" : "Translate"}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginTop: 6,
  },
  text: {
    fontSize: 13,
    fontWeight: "500",
  },
});
