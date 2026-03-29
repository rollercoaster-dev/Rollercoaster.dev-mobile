import React, { useState } from "react";
import { View } from "react-native";
import { Button } from "../../components/Button";
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
        confirmLabel="Remove"
        cancelLabel="Keep it"
      />
    </View>
  );
}
