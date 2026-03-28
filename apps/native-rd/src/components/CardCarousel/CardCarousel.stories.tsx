import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { CardCarousel } from './CardCarousel';
import { StepCard, type StepCardStep } from '../StepCard';
import { GoalEvidenceCard } from '../GoalEvidenceCard';

const meta: Meta<typeof CardCarousel> = {
  title: 'CardCarousel',
  component: CardCarousel,
};

export default meta;

type Story = StoryObj<typeof CardCarousel>;

const makeStep = (overrides: Partial<StepCardStep> = {}): StepCardStep => ({
  id: '1',
  title: 'Review component architecture',
  status: 'pending',
  evidenceCount: 0,
  ...overrides,
});

function CarouselWrapper({
  initialIndex = 0,
  children,
}: {
  initialIndex?: number;
  children: React.ReactElement | React.ReactElement[];
}) {
  const [index, setIndex] = useState(initialIndex);
  return (
    <View style={storyStyles.wrapper}>
      <CardCarousel
        currentIndex={index}
        onIndexChange={setIndex}
        renderIndicator={(current, count) => (
          <Text style={storyStyles.indicator}>{current + 1} of {count}</Text>
        )}
      >
        {children}
      </CardCarousel>
    </View>
  );
}

export const ThreeCards: Story = {
  render: () => (
    <CarouselWrapper initialIndex={1}>
      <StepCard
        step={makeStep({ id: '1', title: 'Plan the approach', status: 'completed', evidenceCount: 2 })}
        stepIndex={0}
        totalSteps={3}
        onToggleComplete={() => {}}
        onEvidenceTap={() => {}}
      />
      <StepCard
        step={makeStep({ id: '2', title: 'Build the component', status: 'in-progress', evidenceCount: 1 })}
        stepIndex={1}
        totalSteps={3}
        onToggleComplete={() => {}}
        onEvidenceTap={() => {}}
      />
      <StepCard
        step={makeStep({ id: '3', title: 'Write tests', status: 'pending' })}
        stepIndex={2}
        totalSteps={3}
        onToggleComplete={() => {}}
        onEvidenceTap={() => {}}
      />
    </CarouselWrapper>
  ),
};

export const FirstCard: Story = {
  render: () => (
    <CarouselWrapper initialIndex={0}>
      <StepCard
        step={makeStep({ id: '1', title: 'First step', status: 'in-progress', evidenceCount: 1 })}
        stepIndex={0}
        totalSteps={3}
        onToggleComplete={() => {}}
        onEvidenceTap={() => {}}
      />
      <StepCard
        step={makeStep({ id: '2', title: 'Second step', status: 'pending' })}
        stepIndex={1}
        totalSteps={3}
        onToggleComplete={() => {}}
        onEvidenceTap={() => {}}
      />
      <StepCard
        step={makeStep({ id: '3', title: 'Third step', status: 'pending' })}
        stepIndex={2}
        totalSteps={3}
        onToggleComplete={() => {}}
        onEvidenceTap={() => {}}
      />
    </CarouselWrapper>
  ),
};

export const LastCard: Story = {
  render: () => (
    <CarouselWrapper initialIndex={2}>
      <StepCard
        step={makeStep({ id: '1', title: 'First step', status: 'completed', evidenceCount: 3 })}
        stepIndex={0}
        totalSteps={3}
        onToggleComplete={() => {}}
        onEvidenceTap={() => {}}
      />
      <StepCard
        step={makeStep({ id: '2', title: 'Second step', status: 'completed', evidenceCount: 2 })}
        stepIndex={1}
        totalSteps={3}
        onToggleComplete={() => {}}
        onEvidenceTap={() => {}}
      />
      <StepCard
        step={makeStep({ id: '3', title: 'Third step', status: 'in-progress' })}
        stepIndex={2}
        totalSteps={3}
        onToggleComplete={() => {}}
        onEvidenceTap={() => {}}
      />
    </CarouselWrapper>
  ),
};

export const SingleCard: Story = {
  render: () => (
    <CarouselWrapper>
      <StepCard
        step={makeStep({ title: 'Only step', status: 'in-progress', evidenceCount: 1 })}
        stepIndex={0}
        totalSteps={1}
        onToggleComplete={() => {}}
        onEvidenceTap={() => {}}
      />
    </CarouselWrapper>
  ),
};

export const MixedContent: Story = {
  render: () => (
    <CarouselWrapper initialIndex={1}>
      <StepCard
        step={makeStep({ id: '1', title: 'Complete the task', status: 'completed', evidenceCount: 2 })}
        stepIndex={0}
        totalSteps={2}
        onToggleComplete={() => {}}
        onEvidenceTap={() => {}}
      />
      <StepCard
        step={makeStep({ id: '2', title: 'Gather evidence', status: 'in-progress', evidenceCount: 1 })}
        stepIndex={1}
        totalSteps={2}
        onToggleComplete={() => {}}
        onEvidenceTap={() => {}}
      />
      <GoalEvidenceCard evidenceCount={4} onEvidenceTap={() => {}} />
    </CarouselWrapper>
  ),
};

const storyStyles = StyleSheet.create((theme) => ({
  wrapper: {
    height: 420,
  },
  indicator: {
    fontSize: theme.size.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
    fontFamily: theme.fontFamily.body,
  },
}));
