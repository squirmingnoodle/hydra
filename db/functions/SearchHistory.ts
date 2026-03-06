import { desc, eq, and, like, count } from "drizzle-orm";
import db from "..";
import { SearchHistory } from "../schema";

export function addSearchQuery(query: string, searchType: string = "posts") {
  const trimmed = query.trim();
  if (!trimmed) return;

  // Delete existing entry if it exists, then re-insert to update timestamp
  db.delete(SearchHistory)
    .where(
      and(
        eq(SearchHistory.query, trimmed),
        eq(SearchHistory.searchType, searchType),
      ),
    )
    .run();

  db.insert(SearchHistory)
    .values({ query: trimmed, searchType })
    .run();

  // Maintain max 100 entries
  const countResult = db
    .select({ value: count() })
    .from(SearchHistory)
    .get();
  if (countResult && countResult.value > 100) {
    const oldest = db
      .select({ id: SearchHistory.id })
      .from(SearchHistory)
      .orderBy(desc(SearchHistory.updatedAt))
      .offset(100)
      .all();
    for (const entry of oldest) {
      db.delete(SearchHistory).where(eq(SearchHistory.id, entry.id)).run();
    }
  }
}

export function getRecentSearches(
  searchType?: string,
  limit: number = 20,
): { query: string; searchType: string }[] {
  if (searchType) {
    return db
      .select({ query: SearchHistory.query, searchType: SearchHistory.searchType })
      .from(SearchHistory)
      .where(eq(SearchHistory.searchType, searchType))
      .orderBy(desc(SearchHistory.updatedAt))
      .limit(limit)
      .all();
  }
  return db
    .select({ query: SearchHistory.query, searchType: SearchHistory.searchType })
    .from(SearchHistory)
    .orderBy(desc(SearchHistory.updatedAt))
    .limit(limit)
    .all();
}

export function searchHistorySuggestions(
  prefix: string,
  searchType?: string,
  limit: number = 10,
): string[] {
  const trimmed = prefix.trim();
  if (!trimmed) return [];

  const baseQuery = db
    .select({ query: SearchHistory.query })
    .from(SearchHistory)
    .where(
      searchType
        ? and(
            like(SearchHistory.query, `${trimmed}%`),
            eq(SearchHistory.searchType, searchType),
          )
        : like(SearchHistory.query, `${trimmed}%`),
    )
    .orderBy(desc(SearchHistory.updatedAt))
    .limit(limit)
    .all();

  return baseQuery.map((r) => r.query);
}

export function deleteSearchQuery(query: string, searchType: string) {
  db.delete(SearchHistory)
    .where(
      and(
        eq(SearchHistory.query, query),
        eq(SearchHistory.searchType, searchType),
      ),
    )
    .run();
}

export function clearSearchHistory() {
  db.delete(SearchHistory).run();
}
