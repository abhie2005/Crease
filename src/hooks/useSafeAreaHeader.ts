import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Returns safe area padding for screen headers. Use headerStyle on the top-most header View. */
export function useSafeAreaHeader(extraTop = 16) {
  const insets = useSafeAreaInsets();
  return {
    top: insets.top + extraTop,
    bottom: insets.bottom,
    /** Spread onto header View: style={[styles.header, headerStyle]} */
    headerStyle: { paddingTop: insets.top + extraTop },
  };
}
