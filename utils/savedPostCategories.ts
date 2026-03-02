import {
  makeAccountScopedSettingKey,
  useAccountScopedMMKVObject,
} from "./accountScopedSettings";
import KeyStore from "./KeyStore";

export type SavedPostCategoryMap = Record<string, string>;

export const SAVED_POST_CATEGORIES_KEY = "savedPostCategories";
export const SAVED_POST_CATEGORY_NAME_MAX_LENGTH = 32;

export const SAVED_POST_CATEGORY_ALL = "__all__";
export const SAVED_POST_CATEGORY_UNCATEGORIZED = "__uncategorized__";

export type SavedPostCategoryFilter =
  | typeof SAVED_POST_CATEGORY_ALL
  | typeof SAVED_POST_CATEGORY_UNCATEGORIZED
  | string;

const EMPTY_SAVED_POST_CATEGORY_MAP = Object.freeze({}) as SavedPostCategoryMap;

function getScopedSavedPostCategoriesKey() {
  return makeAccountScopedSettingKey(SAVED_POST_CATEGORIES_KEY);
}

export function normalizeSavedPostCategoryName(
  categoryName: string,
): string | null {
  const normalized = categoryName
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, SAVED_POST_CATEGORY_NAME_MAX_LENGTH)
    .trim();
  if (!normalized) {
    return null;
  }
  const lowerCaseCategoryName = normalized.toLowerCase();
  if (
    [SAVED_POST_CATEGORY_ALL, SAVED_POST_CATEGORY_UNCATEGORIZED].includes(
      lowerCaseCategoryName,
    )
  ) {
    return null;
  }
  return normalized;
}

function readSavedPostCategoryMap(): SavedPostCategoryMap {
  const scopedKey = getScopedSavedPostCategoriesKey();
  const categoryMapJSON = KeyStore.getString(scopedKey);
  if (!categoryMapJSON) {
    return {};
  }
  try {
    const parsedCategoryMap = JSON.parse(
      categoryMapJSON,
    ) as SavedPostCategoryMap;
    if (!parsedCategoryMap || typeof parsedCategoryMap !== "object") {
      return {};
    }
    return parsedCategoryMap;
  } catch (_error) {
    return {};
  }
}

function writeSavedPostCategoryMap(categoryMap: SavedPostCategoryMap) {
  const scopedKey = getScopedSavedPostCategoriesKey();
  KeyStore.set(scopedKey, JSON.stringify(categoryMap));
}

export function getSavedPostCategoryMap(): SavedPostCategoryMap {
  return readSavedPostCategoryMap();
}

export function useSavedPostCategoryMap() {
  const [savedPostCategoryMap, setSavedPostCategoryMap] =
    useAccountScopedMMKVObject<SavedPostCategoryMap>(SAVED_POST_CATEGORIES_KEY);

  return [
    savedPostCategoryMap ?? EMPTY_SAVED_POST_CATEGORY_MAP,
    setSavedPostCategoryMap,
  ] as const;
}

export function getCategory(postName: string): string | undefined {
  return readSavedPostCategoryMap()[postName];
}

export function getAllCategoriesFromMap(
  categoryMap: SavedPostCategoryMap,
): string[] {
  const uniqueCategoryMap = new Map<string, string>();
  Object.values(categoryMap).forEach((category) => {
    const normalizedCategory = normalizeSavedPostCategoryName(category);
    if (!normalizedCategory) {
      return;
    }
    const lowerCaseCategory = normalizedCategory.toLowerCase();
    if (!uniqueCategoryMap.has(lowerCaseCategory)) {
      uniqueCategoryMap.set(lowerCaseCategory, normalizedCategory);
    }
  });
  return [...uniqueCategoryMap.values()].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );
}

export function getAllCategories(): string[] {
  return getAllCategoriesFromMap(readSavedPostCategoryMap());
}

export function setCategory(
  postName: string,
  categoryName: string,
): string | undefined {
  const normalizedCategoryName = normalizeSavedPostCategoryName(categoryName);
  if (!normalizedCategoryName || !postName) {
    return undefined;
  }

  const categoryMap = readSavedPostCategoryMap();
  const existingCategoryName = getAllCategoriesFromMap(categoryMap).find(
    (existingCategory) =>
      existingCategory.toLowerCase() === normalizedCategoryName.toLowerCase(),
  );
  const canonicalCategoryName = existingCategoryName ?? normalizedCategoryName;

  writeSavedPostCategoryMap({
    ...categoryMap,
    [postName]: canonicalCategoryName,
  });

  return canonicalCategoryName;
}

export function clearCategory(postName: string): void {
  const categoryMap = readSavedPostCategoryMap();
  if (!categoryMap[postName]) {
    return;
  }

  const newCategoryMap = { ...categoryMap };
  delete newCategoryMap[postName];
  writeSavedPostCategoryMap(newCategoryMap);
}

export function matchesFilter(
  postName: string,
  filter: SavedPostCategoryFilter,
  categoryMap = readSavedPostCategoryMap(),
): boolean {
  if (filter === SAVED_POST_CATEGORY_ALL) {
    return true;
  }

  const category = categoryMap[postName];

  if (filter === SAVED_POST_CATEGORY_UNCATEGORIZED) {
    return !category;
  }

  if (!category) {
    return false;
  }

  return category.toLowerCase() === filter.toLowerCase();
}
