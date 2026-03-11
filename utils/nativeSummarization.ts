import { NativeModules, Platform } from "react-native";

type NativeHydraSummarizationModule = {
  isAvailable(): Promise<boolean>;
  summarizePost(
    title: string,
    subreddit: string,
    author: string,
    text: string,
  ): Promise<string>;
  summarizeComments(
    title: string,
    author: string,
    postSummary: string,
    comments: string[],
  ): Promise<string>;
};

const nativeModule = NativeModules.HydraSummarization as
  | NativeHydraSummarizationModule
  | undefined;

/**
 * Detects when Apple's on-device model refuses to summarize content
 * due to its content policy (e.g. NSFW, controversial, etc.).
 * Returns true if the response is a refusal rather than a real summary.
 */
function isModelRefusal(text: string): boolean {
  const lower = text.toLowerCase();
  const refusalPhrases = [
    "i cannot provide",
    "i can't provide",
    "i'm not able to",
    "i am not able to",
    "i'm unable to",
    "i am unable to",
    "i can't assist",
    "i cannot assist",
    "i can't help with",
    "i cannot help with",
    "inappropriate",
    "unethical",
    "i must decline",
    "i won't be able to",
    "against my guidelines",
    "not appropriate for me",
    "i can't fulfill",
    "i cannot fulfill",
    "i'm sorry, but i can't",
    "i'm sorry, but i cannot",
    "let me know if i can help you with a different",
  ];
  return refusalPhrases.some((phrase) => lower.includes(phrase));
}

export const NativeSummarization = {
  async isAvailable(): Promise<boolean> {
    if (Platform.OS !== "ios" || !nativeModule) return false;
    try {
      return await nativeModule.isAvailable();
    } catch {
      return false;
    }
  },

  async summarizePost(
    title: string,
    subreddit: string,
    author: string,
    text: string,
  ): Promise<string | null> {
    if (Platform.OS !== "ios" || !nativeModule) return null;
    try {
      const result = await nativeModule.summarizePost(
        title,
        subreddit,
        author,
        text.slice(0, 8_000),
      );
      if (!result || isModelRefusal(result)) return null;
      return result;
    } catch {
      return null;
    }
  },

  async summarizeComments(
    title: string,
    author: string,
    postSummary: string,
    comments: string[],
  ): Promise<string | null> {
    if (Platform.OS !== "ios" || !nativeModule) return null;
    try {
      const result = await nativeModule.summarizeComments(
        title,
        author,
        postSummary,
        comments.map((c) => c.slice(0, 2_000)),
      );
      if (!result || isModelRefusal(result)) return null;
      return result;
    } catch {
      return null;
    }
  },
};
