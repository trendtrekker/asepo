import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Screen, Toggle } from '@/components/ui';
import { useStore } from '@/store/app-store';
import { useTheme } from '@/theme/theme-context';

/**
 * Block 7 of the spec isn't designed yet, so this is a working stub: it carries
 * the appearance toggle (handy for reviewing both themes on device) and the
 * onboarding answers the quiz collected.
 */
export default function Profile() {
  const { colors: c, isDark, toggleDark } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { onboarding, isPro, importsUsed, importLimit } = useStore();

  const allergies = [
    ...Object.keys(onboarding.allergies).filter((k) => onboarding.allergies[k]),
    ...onboarding.customAllergies,
  ];

  return (
    <Screen style={{ paddingTop: insets.top + 12 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <Text
          style={{
            paddingHorizontal: 20,
            fontSize: 30,
            fontWeight: '700',
            color: c.text,
            letterSpacing: -0.4,
          }}>
          Profile
        </Text>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
            margin: 20,
            padding: 16,
            borderRadius: 16,
            backgroundColor: c.chipBg,
          }}>
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: c.accent }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: c.text }}>Alex</Text>
            <Text style={{ fontSize: 13, color: c.textSec }}>
              {isPro ? 'Asepo Pro' : `${importsUsed}/${importLimit} free imports used`}
            </Text>
          </View>
          {!isPro ? (
            <Pressable
              onPress={() => router.push('/paywall')}
              accessibilityRole="button"
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 16,
                backgroundColor: c.accent,
              }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>Upgrade</Text>
            </Pressable>
          ) : null}
        </View>

        <Section title="Appearance">
          <Row label="Dark mode">
            <Toggle value={isDark} onPress={toggleDark} />
          </Row>
        </Section>

        <Section title="Your preferences">
          <Row label="Diet">
            <Text style={{ fontSize: 14, color: c.textSec }}>{onboarding.diet}</Text>
          </Row>
          <Row label="Cooking for">
            <Text style={{ fontSize: 14, color: c.textSec }}>
              {onboarding.peopleCount >= 8 ? '8+' : onboarding.peopleCount} people
            </Text>
          </Row>
          <Row label="Allergies">
            <Text style={{ fontSize: 14, color: c.textSec }} numberOfLines={1}>
              {allergies.length ? allergies.join(', ') : 'None'}
            </Text>
          </Row>
        </Section>

        <Text
          style={{
            marginTop: 24,
            paddingHorizontal: 20,
            fontSize: 13,
            lineHeight: 19,
            color: c.textSec,
          }}>
          The full settings list — subscription, household sharing, Health sync, data export — is
          block 7 of the spec and isn't designed yet.
        </Text>
      </ScrollView>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors: c } = useTheme();
  return (
    <View style={{ marginTop: 8 }}>
      <Text
        style={{
          paddingHorizontal: 20,
          paddingBottom: 8,
          fontSize: 12,
          fontWeight: '600',
          color: c.textSec,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}>
        {title}
      </Text>
      <View style={{ marginHorizontal: 20, borderRadius: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }}>
        {children}
      </View>
    </View>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  const { colors: c } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 12,
      }}>
      <Text style={{ fontSize: 15, fontWeight: '500', color: c.text }}>{label}</Text>
      {children}
    </View>
  );
}
