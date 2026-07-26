import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Search } from '@/components/icons';
import { useToast } from '@/components/toast';
import { Button, Chip, Screen, SheetHandle, Toggle } from '@/components/ui';
import { ALLERGY_OPTIONS, DIET_OPTIONS } from '@/data/sample';
import { useStore } from '@/store/app-store';
import { useTheme } from '@/theme/theme-context';

type Sheet = 'name' | 'diet' | 'people' | 'allergies' | 'reset' | null;

/** Profile — appearance, preferences (editable in place), and account. */
export default function Profile() {
  const { colors: c, isDark, toggleDark } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const {
    onboarding,
    setOnboarding,
    isPro,
    importsUsed,
    importLimit,
    profileName,
    setProfileName,
    resetEverything,
  } = useStore();

  const [sheet, setSheet] = useState<Sheet>(null);
  const [nameDraft, setNameDraft] = useState(profileName);
  const [allergyInput, setAllergyInput] = useState('');

  const allergies = [
    ...Object.keys(onboarding.allergies).filter((k) => onboarding.allergies[k]),
    ...onboarding.customAllergies,
  ];

  const addCustomAllergy = () => {
    const v = allergyInput.trim();
    if (!v) return;
    setOnboarding((o) => ({ ...o, customAllergies: [...o.customAllergies, v] }));
    setAllergyInput('');
  };

  const openName = () => {
    setNameDraft(profileName);
    setSheet('name');
  };

  const saveName = () => {
    setProfileName(nameDraft.trim());
    setSheet(null);
  };

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
          <Pressable
            onPress={openName}
            accessibilityRole="button"
            accessibilityLabel="Edit name"
            style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 }}>
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: c.accent,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Text style={{ fontSize: 22, fontWeight: '700', color: '#fff' }}>
                {profileName.trim() ? profileName.trim()[0].toUpperCase() : '?'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: c.text }}>
                {profileName.trim() || 'Add your name'}
              </Text>
              <Text style={{ fontSize: 13, color: c.textSec }}>
                {isPro ? 'Asepo Pro' : `${importsUsed}/${importLimit} free imports used`}
              </Text>
            </View>
          </Pressable>
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
          <Row label="Diet" onPress={() => setSheet('diet')}>
            <Text style={{ fontSize: 14, color: c.textSec }}>{onboarding.diet} ›</Text>
          </Row>
          <Row label="Cooking for" onPress={() => setSheet('people')}>
            <Text style={{ fontSize: 14, color: c.textSec }}>
              {onboarding.peopleCount >= 8 ? '8+' : onboarding.peopleCount} people ›
            </Text>
          </Row>
          <Row label="Allergies" onPress={() => setSheet('allergies')}>
            <Text style={{ fontSize: 14, color: c.textSec, maxWidth: 180 }} numberOfLines={1}>
              {allergies.length ? allergies.join(', ') : 'None'} ›
            </Text>
          </Row>
        </Section>

        <Section title="Account">
          {isPro ? (
            <Row
              label="Manage subscription"
              onPress={() => toast.show('Manage subscription needs StoreKit — not available yet')}>
              <Text style={{ fontSize: 14, color: c.textSec }}>›</Text>
            </Row>
          ) : null}
          <Row label="Reset all data" onPress={() => setSheet('reset')} danger>
            <Text style={{ fontSize: 14, color: c.danger }}>›</Text>
          </Row>
        </Section>
      </ScrollView>

      {sheet === 'name' ? (
        <EditSheet title="Your name" onClose={() => setSheet(null)}>
          <TextInput
            value={nameDraft}
            onChangeText={setNameDraft}
            autoFocus
            placeholder="Your name"
            placeholderTextColor={c.textSec}
            onSubmitEditing={saveName}
            style={{
              height: 48,
              borderRadius: 12,
              backgroundColor: c.inputBg,
              borderWidth: 1,
              borderColor: c.border,
              paddingHorizontal: 14,
              fontSize: 16,
              color: c.text,
            }}
          />
          <View style={{ marginTop: 16 }}>
            <Button title="Save" onPress={saveName} />
          </View>
        </EditSheet>
      ) : null}

      {sheet === 'diet' ? (
        <EditSheet title="Diet" onClose={() => setSheet(null)}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9 }}>
            {DIET_OPTIONS.map((d) => (
              <Chip
                key={d}
                label={d}
                selected={onboarding.diet === d}
                selectedStyle="fill"
                onPress={() => {
                  setOnboarding((o) => ({ ...o, diet: d }));
                  setSheet(null);
                }}
              />
            ))}
          </View>
        </EditSheet>
      ) : null}

      {sheet === 'people' ? (
        <EditSheet title="Cooking for" onClose={() => setSheet(null)}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 28,
              paddingVertical: 12,
            }}>
            <StepperButton
              label="−"
              tone="neutral"
              onPress={() =>
                setOnboarding((o) => ({ ...o, peopleCount: Math.max(1, o.peopleCount - 1) }))
              }
            />
            <View style={{ alignItems: 'center', minWidth: 80 }}>
              <Text style={{ fontSize: 40, fontWeight: '700', color: c.text }}>
                {onboarding.peopleCount >= 8 ? '8+' : onboarding.peopleCount}
              </Text>
              <Text style={{ fontSize: 13, fontWeight: '500', color: c.textSec }}>people</Text>
            </View>
            <StepperButton
              label="+"
              tone="accent"
              onPress={() =>
                setOnboarding((o) => ({ ...o, peopleCount: Math.min(8, o.peopleCount + 1) }))
              }
            />
          </View>
          <View style={{ marginTop: 8 }}>
            <Button title="Done" onPress={() => setSheet(null)} />
          </View>
        </EditSheet>
      ) : null}

      {sheet === 'allergies' ? (
        <EditSheet title="Allergies" onClose={() => setSheet(null)}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              backgroundColor: c.inputBg,
              borderRadius: 12,
              paddingLeft: 14,
              padding: 4,
            }}>
            <Search color={c.textSec} />
            <TextInput
              value={allergyInput}
              onChangeText={setAllergyInput}
              onSubmitEditing={addCustomAllergy}
              placeholder="Search or add your own"
              placeholderTextColor={c.textSec}
              style={{ flex: 1, fontSize: 15, color: c.text, paddingVertical: 10 }}
            />
            <Pressable
              onPress={addCustomAllergy}
              accessibilityRole="button"
              accessibilityLabel="Add allergy"
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: c.accent,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600' }}>+</Text>
            </Pressable>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 16 }}>
            {ALLERGY_OPTIONS.map((a) => (
              <Chip
                key={a}
                label={a}
                selected={!!onboarding.allergies[a]}
                onPress={() =>
                  setOnboarding((o) => ({
                    ...o,
                    allergies: { ...o.allergies, [a]: !o.allergies[a] },
                  }))
                }
              />
            ))}
            {onboarding.customAllergies.map((a, i) => (
              <Chip
                key={`${a}-${i}`}
                label={`${a}  ×`}
                selected
                onPress={() =>
                  setOnboarding((o) => ({
                    ...o,
                    customAllergies: o.customAllergies.filter((_, idx) => idx !== i),
                  }))
                }
              />
            ))}
          </View>

          <View style={{ marginTop: 16 }}>
            <Button title="Done" onPress={() => setSheet(null)} />
          </View>
        </EditSheet>
      ) : null}

      {sheet === 'reset' ? (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: c.overlay,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 32,
          }}>
          <View style={{ width: '100%', backgroundColor: c.surface, borderRadius: 20, padding: 22 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: c.text }}>Reset all data?</Text>
            <Text style={{ marginTop: 8, fontSize: 14, lineHeight: 20, color: c.textSec }}>
              Recipes, cookbooks, grocery list, meal plan, and preferences all go back to a fresh
              install. This can’t be undone.
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
              <Button
                title="Cancel"
                variant="tinted"
                style={{ flex: 1 }}
                textStyle={{ fontSize: 15 }}
                onPress={() => setSheet(null)}
              />
              <Pressable
                onPress={() => {
                  setSheet(null);
                  resetEverything();
                  toast.show('Everything reset');
                }}
                accessibilityRole="button"
                style={({ pressed }) => ({
                  flex: 1,
                  height: 52,
                  borderRadius: 26,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: c.danger,
                  opacity: pressed ? 0.8 : 1,
                })}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff' }}>Reset</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

/** Bottom sheet shell shared by the preference editors. */
function EditSheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const { colors: c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end' }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close"
        onPress={onClose}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.overlay }}
      />
      <View
        style={{
          backgroundColor: c.surface,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          paddingHorizontal: 20,
          paddingTop: 4,
          paddingBottom: insets.bottom + 20,
          maxHeight: '82%',
        }}>
        <SheetHandle />
        <Text style={{ fontSize: 20, fontWeight: '700', color: c.text, marginBottom: 16 }}>
          {title}
        </Text>
        {children}
      </View>
    </View>
  );
}

function StepperButton({
  label,
  tone,
  onPress,
}: {
  label: string;
  tone: 'neutral' | 'accent';
  onPress: () => void;
}) {
  const c = useTheme().colors;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label === '+' ? 'Add a person' : 'Remove a person'}
      style={({ pressed }) => ({
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: tone === 'accent' ? c.accent : c.chipBg,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.75 : 1,
      })}>
      <Text style={{ fontSize: 24, fontWeight: '600', color: tone === 'accent' ? '#fff' : c.text }}>
        {label}
      </Text>
    </Pressable>
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
      <View
        style={{
          marginHorizontal: 20,
          borderRadius: 16,
          backgroundColor: c.surface,
          borderWidth: 1,
          borderColor: c.border,
        }}>
        {children}
      </View>
    </View>
  );
}

function Row({
  label,
  onPress,
  danger,
  children,
}: {
  label: string;
  onPress?: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  const { colors: c } = useTheme();
  const Wrapper = onPress ? Pressable : View;
  return (
    <Wrapper
      {...(onPress ? { onPress, accessibilityRole: 'button' as const } : {})}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 12,
      }}>
      <Text style={{ fontSize: 15, fontWeight: '500', color: danger ? c.danger : c.text }}>
        {label}
      </Text>
      {children}
    </Wrapper>
  );
}
