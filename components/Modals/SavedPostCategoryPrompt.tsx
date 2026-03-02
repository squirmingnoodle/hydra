import React, { useContext, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

import TextInput from "../UI/TextInput";
import { ThemeContext } from "../../contexts/SettingsContexts/ThemeContext";
import {
  normalizeSavedPostCategoryName,
  SAVED_POST_CATEGORY_NAME_MAX_LENGTH,
} from "../../utils/savedPostCategories";

type SavedPostCategoryPromptProps = {
  initialValue?: string;
  onCancel: () => void;
  onSubmit: (categoryName: string) => void;
};

export default function SavedPostCategoryPrompt({
  initialValue = "",
  onCancel,
  onSubmit,
}: SavedPostCategoryPromptProps) {
  const { theme } = useContext(ThemeContext);
  const { width, height } = useWindowDimensions();
  const [categoryName, setCategoryName] = useState(initialValue);

  const submitCategory = () => {
    const normalizedCategoryName = normalizeSavedPostCategoryName(categoryName);
    if (!normalizedCategoryName) {
      Alert.alert("Category Required", "Enter a category name to continue.");
      return;
    }
    onSubmit(normalizedCategoryName);
  };

  return (
    <View
      style={[
        styles.container,
        {
          width,
          height,
        },
      ]}
    >
      <TouchableOpacity style={styles.background} onPress={onCancel} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardAvoidingView}
      >
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.background,
              borderColor: theme.divider,
            },
          ]}
        >
          <Text
            style={[
              styles.title,
              {
                color: theme.text,
              },
            ]}
          >
            New Category
          </Text>
          <TextInput
            autoFocus
            value={categoryName}
            onChangeText={setCategoryName}
            placeholder="Category name"
            placeholderTextColor={theme.verySubtleText}
            maxLength={SAVED_POST_CATEGORY_NAME_MAX_LENGTH}
            style={[
              styles.input,
              {
                color: theme.text,
                backgroundColor: theme.tint,
                borderColor: theme.divider,
              },
            ]}
            onSubmitEditing={submitCategory}
            returnKeyType="done"
          />
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[
                styles.button,
                {
                  borderColor: theme.divider,
                },
              ]}
              onPress={onCancel}
            >
              <Text
                style={[
                  styles.buttonText,
                  {
                    color: theme.subtleText,
                  },
                ]}
              >
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                {
                  backgroundColor: theme.iconPrimary,
                },
              ]}
              onPress={submitCategory}
            >
              <Text
                style={[
                  styles.buttonText,
                  {
                    color: theme.text,
                  },
                ]}
              >
                Save
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
    paddingHorizontal: 20,
  },
  background: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "black",
    opacity: 0.6,
  },
  keyboardAvoidingView: {
    width: "100%",
    maxWidth: 420,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  button: {
    minWidth: 90,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "500",
  },
});
