import { ScrollView, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ColorCardLibrary } from '../components/ColorCardLibrary';
import { PageTransition } from '../components/NativeUI';
import { ui } from '../components/UI';

export function ColorCardsScreen() {
  const insets = useSafeAreaInsets();
  return <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets
    contentContainerStyle={{ padding: 20, paddingBottom: 110 + insets.bottom }}>
    <PageTransition page="cards">
      <Text style={[ui.title, { marginBottom: 16 }]}>色卡</Text>
      <ColorCardLibrary />
    </PageTransition>
  </ScrollView>;
}
