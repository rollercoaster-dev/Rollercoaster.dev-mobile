import { StyleSheet } from 'react-native-unistyles';

export const styles = StyleSheet.create((theme) => ({
  overlay: {
    flex: 1,
    // eslint-disable-next-line local/no-raw-colors -- fullscreen media overlay, intentionally opaque black
    backgroundColor: 'black',
  },
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: theme.space[4],
    paddingVertical: theme.space[2],
  },
  closeText: {
    fontSize: 18,
    // eslint-disable-next-line local/no-raw-colors -- white-on-black media overlay chrome
    color: 'white',
    fontWeight: theme.fontWeight.bold,
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  errorText: {
    // eslint-disable-next-line local/no-raw-colors -- white-on-black media overlay chrome
    color: 'white',
    fontSize: theme.size.sm,
    fontFamily: theme.fontFamily.body,
    textAlign: 'center',
  },
}));
