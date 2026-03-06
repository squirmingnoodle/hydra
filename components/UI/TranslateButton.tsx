import React, { useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
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
  const [needsTranslation, setNeedsTranslation] = useState(false);
  const [isTranslated, setIsTranslated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [detectedLang, setDetectedLang] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const isAvail = await NativeTranslation.isAvailable();
      if (!isAvail || cancelled) return;
      setAvailable(true);

      // Only detect if text is substantial
      if (text.length < 20) return;

      const detection = await NativeTranslation.detectLanguage(text);
      if (cancelled || !detection) return;

      if (!detection.isDeviceLanguage && detection.confidence > 0.5) {
        setNeedsTranslation(true);
        setDetectedLang(detection.language);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [text]);

  if (!available || !needsTranslation) return null;

  const handleTranslate = async () => {
    if (isTranslated) {
      setIsTranslated(false);
      onShowOriginal();
      return;
    }

    setLoading(true);
    const result = await NativeTranslation.translate(text, detectedLang);
    setLoading(false);

    if (result) {
      setIsTranslated(true);
      onTranslated(result.translatedText);
    }
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
