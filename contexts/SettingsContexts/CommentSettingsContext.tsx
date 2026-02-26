import { createContext } from "react";
import { useAccountScopedMMKVBoolean } from "../../utils/accountScopedSettings";

const initialValues = {
  voteIndicator: false,
  collapseAutoModerator: true,
  commentFlairs: true,
  showCommentSummary: true,
  tapToCollapseComment: true,
};

const initialCommentSettingsContext = {
  ...initialValues,
  toggleVoteIndicator: (_newValue?: boolean) => {},
  toggleCollapseAutoModerator: (_newValue?: boolean) => {},
  toggleCommentFlairs: (_newValue?: boolean) => {},
  toggleShowCommentSummary: (_newValue?: boolean) => {},
  toggleTapToCollapseComment: (_newValue?: boolean) => {},
};

export const CommentSettingsContext = createContext(
  initialCommentSettingsContext,
);

export function CommentSettingsProvider({ children }: React.PropsWithChildren) {
  const [voteIndicator, setVoteIndicator] =
    useAccountScopedMMKVBoolean("voteIndicator");
  const [storedCollapseAutoModerator, setCollapseAutoModerator] =
    useAccountScopedMMKVBoolean("collapseAutoModerator");
  const collapseAutoModerator =
    storedCollapseAutoModerator ?? initialValues.collapseAutoModerator;

  const [storedCommentFlairs, setCommentFlairs] =
    useAccountScopedMMKVBoolean("commentFlairs");
  const commentFlairs = storedCommentFlairs ?? initialValues.commentFlairs;

  const [storedShowCommentSummary, setShowCommentSummary] =
    useAccountScopedMMKVBoolean("showCommentSummary");
  const showCommentSummary =
    storedShowCommentSummary ?? initialValues.showCommentSummary;

  const toggleVoteIndicator = (newValue = !voteIndicator) => {
    setVoteIndicator(newValue);
    alert(
      "Existing pages may need to be refreshed for this change to take effect.",
    );
  };

  const [storedTapToCollapseComment, setTapToCollapseComment] =
    useAccountScopedMMKVBoolean("tapToCollapseComment");
  const tapToCollapseComment =
    storedTapToCollapseComment ?? initialValues.tapToCollapseComment;

  const toggleTapToCollapseComment = (newValue = !tapToCollapseComment) => {
    setTapToCollapseComment(newValue);
    alert(
      "Existing pages may need to be refreshed for this change to take effect.",
    );
  };

  return (
    <CommentSettingsContext.Provider
      value={{
        voteIndicator: voteIndicator ?? initialValues.voteIndicator,
        toggleVoteIndicator,

        collapseAutoModerator,
        toggleCollapseAutoModerator: (newValue = !collapseAutoModerator) =>
          setCollapseAutoModerator(newValue),

        commentFlairs,
        toggleCommentFlairs: (newValue = !commentFlairs) =>
          setCommentFlairs(newValue),

        showCommentSummary,
        toggleShowCommentSummary: (newValue = !showCommentSummary) =>
          setShowCommentSummary(newValue),

        tapToCollapseComment:
          tapToCollapseComment ?? initialValues.tapToCollapseComment,
        toggleTapToCollapseComment,
      }}
    >
      {children}
    </CommentSettingsContext.Provider>
  );
}
