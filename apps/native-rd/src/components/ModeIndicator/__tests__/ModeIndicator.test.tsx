import { renderWithProviders, screen } from '../../../__tests__/test-utils';
import { ModeIndicator } from '../ModeIndicator';

describe('ModeIndicator', () => {
  test.each([
    ['edit', 'Edit'],
    ['focus', 'Focus'],
    ['complete', 'Complete'],
    ['timeline', 'Timeline'],
  ] as const)('renders %s mode with label', (mode, label) => {
    renderWithProviders(<ModeIndicator mode={mode} />);

    expect(screen.getByText(label)).toBeTruthy();
  });

  test.each([
    ['edit', 'Edit'],
    ['focus', 'Focus'],
    ['complete', 'Complete'],
    ['timeline', 'Timeline'],
  ] as const)('has accessible label for %s mode', (mode, label) => {
    renderWithProviders(<ModeIndicator mode={mode} />);

    expect(screen.getByLabelText(`Current mode: ${label}`)).toBeTruthy();
  });

  it('renders image when icon prop is provided', () => {
    const testIcon = { uri: 'https://example.com/icon.png' };
    renderWithProviders(<ModeIndicator mode="edit" icon={testIcon} />);

    expect(screen.getByText('Edit')).toBeTruthy();
    // When icon is provided, emoji should not be rendered
    expect(screen.queryByText('📝')).toBeNull();
  });
});
