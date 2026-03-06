import { createContext } from "react";
import { CommentFilterMode } from "../utils/commentFilters";

export const ScrollToNextButtonContext = createContext({
  setScrollToNext: (() => {}) as (fn: () => void) => void,
  setScrollToPrevious: (() => {}) as (fn: () => void) => void,
  setScrollToParent: (() => {}) as (fn: () => void) => void,
  commentFilterMode: "all" as CommentFilterMode,
  setCommentFilterMode: (() => {}) as (mode: CommentFilterMode) => void,
});
