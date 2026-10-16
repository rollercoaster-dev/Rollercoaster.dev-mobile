import { useEffect, useState } from "react";
import { Alert } from "react-native";
import { useNavigation, usePreventRemove } from "@react-navigation/native";

interface DiscardCopy {
  title: string;
  message: string;
  keep: string;
  discard: string;
}

/** Protects both visible exits and native-stack removals of an in-memory draft. */
export function useUnsavedExitGuard({
  isDirty,
  copy,
  onDiscard,
}: {
  isDirty: boolean;
  copy: DiscardCopy;
  onDiscard?: () => void | Promise<void>;
}) {
  const navigation = useNavigation();
  const [pendingLeave, setPendingLeave] = useState<(() => void) | null>(null);

  // Release the native-stack guard before leaving. A replayed `data.action`
  // is already marked visited by react-navigation, but requestExit's fresh
  // goBack() and a post-save replace() are not: dispatched while
  // usePreventRemove is still active they would show the alert again.
  // Invariant: every `leave` must remove this route; the latch never resets.
  useEffect(() => {
    pendingLeave?.();
  }, [pendingLeave]);

  function confirmExit(leave: () => void) {
    if (!isDirty) {
      leave();
      return;
    }

    Alert.alert(copy.title, copy.message, [
      { text: copy.keep, style: "cancel" },
      {
        text: copy.discard,
        style: "destructive",
        onPress: () => {
          if (!onDiscard) {
            setPendingLeave(() => leave);
            return;
          }
          // Voice cleanup is best-effort, as in its existing discard path.
          // Either outcome must release the route after the user chose Discard.
          void Promise.resolve()
            .then(onDiscard)
            .then(
              () => setPendingLeave(() => leave),
              () => setPendingLeave(() => leave),
            );
        },
      },
    ]);
  }

  usePreventRemove(isDirty && pendingLeave === null, ({ data }) => {
    confirmExit(() => navigation.dispatch(data.action));
  });

  return {
    requestExit: () => confirmExit(() => navigation.goBack()),
    exitAfterSave: (leave: () => void) => setPendingLeave(() => leave),
  };
}
