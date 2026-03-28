import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import type { Evidence } from '../EvidenceThumbnail';
import { EvidenceGrid } from './EvidenceGrid';

const meta: Meta<typeof EvidenceGrid> = {
  title: 'EvidenceGrid',
  component: EvidenceGrid,
};

export default meta;

type Story = StoryObj<typeof EvidenceGrid>;

const evidences: Evidence[] = [
  { id: '1', title: 'Screenshot of progress', type: 'photo' },
  { id: '2', title: 'Voice memo reflection', type: 'voice_memo' },
  { id: '3', title: 'Written notes', type: 'text' },
  { id: '4', title: 'Tutorial reference', type: 'link' },
];

export const WithEvidence: Story = {
  render: () => (
    <EvidenceGrid evidences={evidences} onPress={() => {}} onAdd={() => {}} />
  ),
};

export const Empty: Story = {
  render: () => (
    <EvidenceGrid evidences={[]} onAdd={() => {}} />
  ),
};

const storyStyles = StyleSheet.create((theme) => ({
  grid: {
    gap: theme.space[4],
  },
}));
