import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { StepList, type Step } from './StepList';

const meta: Meta<typeof StepList> = {
  title: 'StepList',
  component: StepList,
};

export default meta;

type Story = StoryObj<typeof StepList>;

const initialSteps: Step[] = [
  { id: '1', title: 'Set up project structure', completed: true },
  { id: '2', title: 'Install dependencies', completed: true },
  { id: '3', title: 'Create component files', completed: false },
  { id: '4', title: 'Write Storybook stories', completed: false },
  { id: '5', title: 'Add accessibility labels', completed: false },
];

function InteractiveStepList() {
  const [steps, setSteps] = useState(initialSteps);

  function handleCreate(title: string) {
    setSteps((prev) => [
      ...prev,
      { id: String(prev.length + 1), title, completed: false },
    ]);
  }

  function handleUpdate(id: string, title: string) {
    setSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, title } : s)),
    );
  }

  function handleDelete(id: string) {
    setSteps((prev) => prev.filter((s) => s.id !== id));
  }

  function handleReorder(stepIds: string[]) {
    setSteps((prev) => stepIds.map((id) => prev.find((s) => s.id === id)!));
  }

  return (
    <StepList
      steps={steps}
      onCreateStep={handleCreate}
      onUpdateStep={handleUpdate}
      onDeleteStep={handleDelete}
      onReorderSteps={handleReorder}
    />
  );
}

export const Interactive: Story = {
  render: () => <InteractiveStepList />,
};

export const ReadOnly: Story = {
  render: () => (
    <StepList steps={initialSteps} />
  ),
};
