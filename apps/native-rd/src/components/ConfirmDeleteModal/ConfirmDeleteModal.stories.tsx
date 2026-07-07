import React, { useState } from "react";
import { View } from "react-native";
import { Button } from "../Button";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";

export default {
  title: "Screens/ConfirmDeleteModal",
  component: ConfirmDeleteModal,
};

export function DeleteGoal() {
  const [visible, setVisible] = useState(false);

  return (
    <View style={{ padding: 16 }}>
      <Button label="Show Modal" onPress={() => setVisible(true)} />
      <ConfirmDeleteModal
        visible={visible}
        onCancel={() => setVisible(false)}
        onConfirm={() => {
          setVisible(false);
          console.log("Deleted");
        }}
        title="Delete this goal?"
        message="All progress and evidence will be permanently deleted."
      />
    </View>
  );
}

export function DeleteStep() {
  const [visible, setVisible] = useState(false);

  return (
    <View style={{ padding: 16 }}>
      <Button label="Show Modal" onPress={() => setVisible(true)} />
      <ConfirmDeleteModal
        visible={visible}
        onCancel={() => setVisible(false)}
        onConfirm={() => {
          setVisible(false);
          console.log("Deleted");
        }}
        title="Delete this step?"
        message="This action cannot be undone."
      />
    </View>
  );
}

export function CustomLabels() {
  const [visible, setVisible] = useState(false);

  return (
    <View style={{ padding: 16 }}>
      <Button label="Show Modal" onPress={() => setVisible(true)} />
      <ConfirmDeleteModal
        visible={visible}
        onCancel={() => setVisible(false)}
        onConfirm={() => {
          setVisible(false);
          console.log("Removed");
        }}
        title="Remove evidence?"
        message="This evidence will no longer be associated with the goal."
        confirmLabel="Remove"
        cancelLabel="Keep it"
      />
    </View>
  );
}

// Reframed badge-delete copy for #412 (Track D3). Demonstrates the new
// title/message/labels the Badge Detail screen will pass at its call site (#380
// wires it via badgeDetail:deleteConfirm.*). No BadgeDetailScreen change here —
// ConfirmDeleteModal's props already support this copy with zero code changes.
export function DeleteBadgeReframed() {
  const [visible, setVisible] = useState(false);

  return (
    <View style={{ padding: 16 }}>
      <Button label="Show Modal" onPress={() => setVisible(true)} />
      <ConfirmDeleteModal
        visible={visible}
        onCancel={() => setVisible(false)}
        onConfirm={() => {
          setVisible(false);
          console.log("Deleted");
        }}
        title="Delete this badge?"
        message="The badge will be removed. Your goal and its evidence stay in the timeline — only the credential artifact is deleted."
        confirmLabel="Delete"
        cancelLabel="Keep it"
      />
    </View>
  );
}
