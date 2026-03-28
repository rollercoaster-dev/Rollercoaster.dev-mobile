import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Input } from './Input';

const meta: Meta<typeof Input> = {
  title: 'Input',
  component: Input,
};

export default meta;

type Story = StoryObj<typeof Input>;

function ControlledInput() {
  const [value, setValue] = useState('');
  return (
    <Input
      label="Goal title"
      placeholder="What do you want to learn?"
      value={value}
      onChangeText={setValue}
    />
  );
}

export const Default: Story = {
  render: () => <ControlledInput />,
};

export const WithError: Story = {
  render: () => (
    <Input
      label="Goal title"
      placeholder="Required"
      value=""
      error="Title is required"
    />
  ),
};

export const AllStates: Story = {
  render: () => (
    <View style={storyStyles.grid}>
      <Input label="Empty" placeholder="Placeholder text" />
      <Input label="With value" value="Learning React Native" />
      <Input label="With error" value="" error="This field is required" />
      <Input label="Disabled" value="Can't edit this" editable={false} />
    </View>
  ),
};

const storyStyles = StyleSheet.create((theme) => ({
  grid: {
    gap: theme.space[4],
  },
}));
