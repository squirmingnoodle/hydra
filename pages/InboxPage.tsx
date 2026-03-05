import { useIsFocused } from "@react-navigation/native";
import React, { useCallback, useContext, useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";

import { getInboxItems, InboxItem } from "../api/Messages";
import CommentReplyComponent from "../components/RedditDataRepresentations/InboxItem/CommentReplyComponent";
import MessageComponent from "../components/RedditDataRepresentations/InboxItem/MessageComponent";
import RedditDataScroller from "../components/UI/RedditDataScroller";
import { AccountContext } from "../contexts/AccountContext";
import { InboxContext } from "../contexts/InboxContext";
import { ThemeContext } from "../contexts/SettingsContexts/ThemeContext";
import useRedditDataState from "../utils/useRedditDataState";

export default function InboxPage() {
  const { theme } = useContext(ThemeContext);
  const { currentUser } = useContext(AccountContext);
  const { inboxCount } = useContext(InboxContext);

  const isFocused = useIsFocused();

  const {
    data: messages,
    loadMoreData: loadMoreMessages,
    refreshData: refreshMessages,
    modifyData: modifyMessages,
    fullyLoaded,
    hitFilterLimit,
  } = useRedditDataState<InboxItem>({
    loadData: async (after) => {
      if (!currentUser) return [];
      return await getInboxItems({ after });
    },
  });

  const modifyMessagesRef = useRef(modifyMessages);
  modifyMessagesRef.current = modifyMessages;

  const renderInboxItem = useCallback(
    ({ item }: { item: InboxItem }) =>
      item.type === "message" ? (
        <MessageComponent
          message={item}
          setMessage={(newMessage) => modifyMessagesRef.current([newMessage])}
        />
      ) : (
        <CommentReplyComponent
          commentReply={item}
          setMessage={(newMessage) => modifyMessagesRef.current([newMessage])}
        />
      ),
    [],
  );

  useEffect(() => {
    if (!isFocused) return;
    refreshMessages();
  }, [inboxCount, isFocused]);

  return (
    <View
      style={[
        styles.postsContainer,
        {
          backgroundColor: theme.background,
        },
      ]}
    >
      <RedditDataScroller<InboxItem>
        loadMore={loadMoreMessages}
        refresh={refreshMessages}
        fullyLoaded={fullyLoaded}
        hitFilterLimit={hitFilterLimit}
        data={messages}
        renderItem={renderInboxItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  postsContainer: {
    flex: 1,
    justifyContent: "center",
  },
});
