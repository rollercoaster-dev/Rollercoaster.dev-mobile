import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Image, Modal } from 'react-native';
import { PhotoViewerModal } from '../PhotoViewerModal';

describe('PhotoViewerModal', () => {
  it('renders nothing when not visible', () => {
    const { toJSON } = render(
      <PhotoViewerModal visible={false} uri={null} onClose={jest.fn()} />,
    );
    expect(toJSON()).toBeNull();
  });

  it('shows error state when visible with null uri', () => {
    render(
      <PhotoViewerModal visible={true} uri={null} onClose={jest.fn()} />,
    );
    expect(screen.getByText('Failed to load image')).toBeTruthy();
    expect(screen.getByLabelText('Close photo viewer')).toBeTruthy();
  });

  it('renders image when visible with uri', () => {
    render(
      <PhotoViewerModal
        visible={true}
        uri="/path/to/photo.jpg"
        onClose={jest.fn()}
      />,
    );
    expect(screen.getByLabelText('Photo evidence')).toBeTruthy();
    expect(screen.getByLabelText('Close photo viewer')).toBeTruthy();
  });

  it('calls onClose when close button is pressed', () => {
    const onClose = jest.fn();
    render(
      <PhotoViewerModal visible={true} uri="/photo.jpg" onClose={onClose} />,
    );
    fireEvent.press(screen.getByLabelText('Close photo viewer'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows description as caption and image label', () => {
    render(
      <PhotoViewerModal
        visible={true}
        uri="/photo.jpg"
        description="My progress photo"
        onClose={jest.fn()}
      />,
    );
    expect(screen.getByText('My progress photo')).toBeTruthy();
    expect(screen.getByLabelText('My progress photo')).toBeTruthy();
  });

  it('shows error message when image fails to load', () => {
    const { UNSAFE_getAllByType } = render(
      <PhotoViewerModal visible={true} uri="/broken.jpg" onClose={jest.fn()} />,
    );
    const images = UNSAFE_getAllByType(Image);
    fireEvent(images[0], 'onError');
    expect(screen.getByText('Failed to load image')).toBeTruthy();
  });

  it('does not render image content when visible is false', () => {
    render(
      <PhotoViewerModal visible={false} uri="/photo.jpg" onClose={jest.fn()} />,
    );
    // Modal hides children when visible=false in test renderer
    expect(screen.queryByLabelText('Photo evidence')).toBeNull();
  });
});
