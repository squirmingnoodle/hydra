import React, { useContext, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemeContext } from "../../contexts/SettingsContexts/ThemeContext";
import { ModalContext } from "../../contexts/ModalContext";
import {
  getAllCategoriesFromMap,
  getCategoryCountsFromMap,
  renameCategory,
  deleteCategory,
  useSavedPostCategoryMap,
  SavedPostCategoryMap,
} from "../../utils/savedPostCategories";
import SavedPostCategoryPrompt from "./SavedPostCategoryPrompt";

export default function CollectionManager() {
  const { theme } = useContext(ThemeContext);
  const { setModal } = useContext(ModalContext);
  const { width, height } = useWindowDimensions();
  const [categoryMap, setCategoryMap] = useSavedPostCategoryMap();

  const categories = useMemo(
    () => getAllCategoriesFromMap(categoryMap),
    [categoryMap],
  );
  const counts = useMemo(
    () => getCategoryCountsFromMap(categoryMap),
    [categoryMap],
  );

  const handleRename = (oldName: string) => {
    setModal(
      <SavedPostCategoryPrompt
        title="Rename Collection"
        initialValue={oldName}
        onCancel={() => setModal(null)}
        onSubmit={(newName) => {
          const result = renameCategory(oldName, newName);
          if (result) {
            // Re-read the map to trigger re-render
            setCategoryMap({ ...categoryMap } as SavedPostCategoryMap);
          }
          // Re-open the manager
          setModal(<CollectionManager />);
        }}
      />,
    );
  };

  const handleDelete = (name: string) => {
    const count = counts[name.toLowerCase()] || 0;
    Alert.alert(
      "Delete Collection",
      `Remove "${name}"? ${count} post${count !== 1 ? "s" : ""} will become uncategorized.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteCategory(name);
            setCategoryMap({ ...categoryMap } as SavedPostCategoryMap);
          },
        },
      ],
    );
  };

  const handleCreate = () => {
    setModal(
      <SavedPostCategoryPrompt
        onCancel={() => setModal(<CollectionManager />)}
        onSubmit={() => {
          // Just re-open manager — the new category will appear when a post is assigned
          setModal(<CollectionManager />);
        }}
      />,
    );
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
      <TouchableOpacity
        style={styles.background}
        onPress={() => setModal(null)}
      />
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.background,
            borderColor: theme.divider,
          },
        ]}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>
            Collections
          </Text>
          <TouchableOpacity
            onPress={() => setModal(null)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="x" size={22} color={theme.subtleText} />
          </TouchableOpacity>
        </View>

        {categories.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="folder" size={32} color={theme.verySubtleText} />
            <Text style={[styles.emptyText, { color: theme.subtleText }]}>
              No collections yet
            </Text>
            <Text
              style={[styles.emptySubtext, { color: theme.verySubtleText }]}
            >
              Save a post and assign it to a collection to get started
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.list}
            showsVerticalScrollIndicator={false}
          >
            {categories.map((name) => {
              const count = counts[name.toLowerCase()] || 0;
              return (
                <View
                  key={name}
                  style={[
                    styles.row,
                    { borderBottomColor: theme.divider },
                  ]}
                >
                  <View style={styles.rowInfo}>
                    <Feather
                      name="folder"
                      size={18}
                      color={theme.iconPrimary}
                    />
                    <View style={styles.rowText}>
                      <Text
                        style={[styles.categoryName, { color: theme.text }]}
                        numberOfLines={1}
                      >
                        {name}
                      </Text>
                      <Text
                        style={[
                          styles.categoryCount,
                          { color: theme.subtleText },
                        ]}
                      >
                        {count} post{count !== 1 ? "s" : ""}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.rowActions}>
                    <TouchableOpacity
                      onPress={() => handleRename(name)}
                      style={styles.actionButton}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Feather
                        name="edit-2"
                        size={16}
                        color={theme.subtleText}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDelete(name)}
                      style={styles.actionButton}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Feather
                        name="trash-2"
                        size={16}
                        color={theme.subtleText}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}

        <TouchableOpacity
          style={[
            styles.createButton,
            { backgroundColor: theme.iconPrimary },
          ]}
          onPress={handleCreate}
        >
          <Feather name="plus" size={18} color={theme.text} />
          <Text style={[styles.createButtonText, { color: theme.text }]}>
            New Collection
          </Text>
        </TouchableOpacity>
      </View>
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
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    width: "100%",
    maxWidth: 420,
    maxHeight: "60%",
    gap: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
  },
  list: {
    flexShrink: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  rowText: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: "500",
  },
  categoryCount: {
    fontSize: 13,
    marginTop: 1,
  },
  rowActions: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    padding: 4,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "500",
  },
  emptySubtext: {
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 10,
    paddingVertical: 10,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: "500",
  },
});
