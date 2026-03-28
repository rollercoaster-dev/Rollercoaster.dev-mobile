import React from 'react';
import { renderWithProviders, screen, fireEvent } from '../../__tests__/test-utils';
import { ColorPicker } from '../ColorPicker';

describe('ColorPicker', () => {
  const onSelectColor = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all 7 accent color swatches with labels', () => {
    renderWithProviders(
      <ColorPicker selectedColor="#a78bfa" onSelectColor={onSelectColor} />,
    );

    const labels = ['Purple', 'Mint', 'Yellow', 'Emerald', 'Teal', 'Orange', 'Sky'];
    for (const label of labels) {
      expect(screen.getByLabelText(`${label} color`)).toBeOnTheScreen();
    }
  });

  it('has radiogroup accessibility on container', () => {
    renderWithProviders(
      <ColorPicker selectedColor="#a78bfa" onSelectColor={onSelectColor} />,
    );

    expect(screen.getByLabelText('Badge color')).toBeOnTheScreen();
    expect(screen.getByLabelText('Badge color').props.accessibilityRole).toBe('radiogroup');
  });

  it('prepends goal color swatch when goalColor is provided', () => {
    renderWithProviders(
      <ColorPicker
        selectedColor="#a78bfa"
        onSelectColor={onSelectColor}
        goalColor="#ff0000"
      />,
    );

    expect(screen.getByLabelText('Goal color')).toBeOnTheScreen();
  });

  it('does not render goal color swatch when goalColor is not provided', () => {
    renderWithProviders(
      <ColorPicker selectedColor="#a78bfa" onSelectColor={onSelectColor} />,
    );

    expect(screen.queryByLabelText('Goal color')).toBeNull();
  });

  it('marks selected color as checked', () => {
    renderWithProviders(
      <ColorPicker selectedColor="#34d399" onSelectColor={onSelectColor} />,
    );

    const mintRadio = screen.getByLabelText('Mint color');
    expect(mintRadio.props.accessibilityState).toEqual(
      expect.objectContaining({ checked: true }),
    );
  });

  it('marks non-selected colors as unchecked', () => {
    renderWithProviders(
      <ColorPicker selectedColor="#a78bfa" onSelectColor={onSelectColor} />,
    );

    const tealRadio = screen.getByLabelText('Teal color');
    expect(tealRadio.props.accessibilityState).toEqual(
      expect.objectContaining({ checked: false }),
    );
  });

  it('calls onSelectColor with correct hex when pressed', () => {
    renderWithProviders(
      <ColorPicker selectedColor="#a78bfa" onSelectColor={onSelectColor} />,
    );

    fireEvent.press(screen.getByLabelText('Orange color'));
    expect(onSelectColor).toHaveBeenCalledWith('#f97316');
  });
});
