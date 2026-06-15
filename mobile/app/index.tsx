import { View, ActivityIndicator } from 'react-native';
import { palette } from '@/theme/tokens';

/**
 * This screen is only ever visible for the brief moment before the
 * NavigationGuard in _layout fires and redirects the user. We show a
 * simple loading indicator so there's no flash of blank content.
 */
export default function Index() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.bg }}>
      <ActivityIndicator size="large" color={palette.accent} />
    </View>
  );
}
