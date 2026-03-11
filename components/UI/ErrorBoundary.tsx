import React, { useContext } from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { Entypo, Feather } from "@expo/vector-icons";
import * as Sentry from "@sentry/react-native";
import { ThemeContext } from "../../contexts/SettingsContexts/ThemeContext";

type ErrorBoundaryProps = {
  children: React.ReactNode;
  fallbackTitle?: string;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

/**
 * Generic error boundary that catches render errors in child components.
 * Shows a themed fallback UI with retry button instead of crashing the app.
 */
class ErrorBoundaryInner extends React.Component<
  ErrorBoundaryProps & { theme: any },
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps & { theme: any }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    Sentry.captureException(error, {
      extra: { componentStack: errorInfo.componentStack },
    });
  }

  render() {
    if (this.state.hasError) {
      const { theme, fallbackTitle } = this.props;
      return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
          <Entypo name="bug" size={40} color={theme.subtleText} />
          <Text style={[styles.title, { color: theme.text }]}>
            {fallbackTitle ?? "Something went wrong"}
          </Text>
          <Text style={[styles.message, { color: theme.subtleText }]}>
            An unexpected error occurred. Try again or go back.
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: theme.tint }]}
            onPress={() => this.setState({ hasError: false, error: null })}
            accessibilityLabel="Retry loading this page"
            accessibilityRole="button"
          >
            <Feather name="refresh-cw" size={16} color={theme.text} />
            <Text style={[styles.retryText, { color: theme.text }]}>
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

/**
 * Themed wrapper around the class-based error boundary.
 */
export default function ErrorBoundary({
  children,
  fallbackTitle,
}: ErrorBoundaryProps) {
  const { theme } = useContext(ThemeContext);
  return (
    <ErrorBoundaryInner theme={theme} fallbackTitle={fallbackTitle}>
      {children}
    </ErrorBoundaryInner>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 8,
  },
  message: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 8,
  },
  retryText: {
    fontSize: 15,
    fontWeight: "500",
  },
});
