import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CheckCircle, ChevronLeft, Search } from '@/components/icons';
import { Button, Chip, Screen } from '@/components/ui';
import { ALLERGY_OPTIONS, DIET_OPTIONS, Q1_OPTIONS } from '@/data/sample';
import { safeBack } from '@/lib/navigation';
import { useStore } from '@/store/app-store';
import { useColors } from '@/theme/theme-context';

const TOTAL_STEPS = 4;

/** Screen 2 — the 4-step personalisation quiz. */
export default function Quiz() {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { onboarding, setOnboarding } = useStore();
  const [step, setStep] = useState(1);
  const [allergyInput, setAllergyInput] = useState('');

  const back = () => {
    if (step > 1) setStep(step - 1);
    else safeBack(router, '/welcome');
  };
  const next = () => {
    if (step < TOTAL_STEPS) setStep(step + 1);
    else router.push('/sign-in');
  };

  const addCustomAllergy = () => {
    const v = allergyInput.trim();
    if (!v) return;
    setOnboarding((o) => ({ ...o, customAllergies: [...o.customAllergies, v] }));
    setAllergyInput('');
  };

  return (
    <Screen style={{ paddingTop: insets.top + 14 }}>
      {/* Back + progress */}
      <View style={{ paddingHorizontal: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Pressable
            onPress={back}
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: c.chipBg,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <ChevronLeft color={c.text} />
          </Pressable>
          <View
            style={{
              flex: 1,
              height: 5,
              borderRadius: 3,
              backgroundColor: c.chipBg,
              overflow: 'hidden',
            }}>
            <View
              style={{
                height: '100%',
                borderRadius: 3,
                backgroundColor: c.accent,
                width: `${(step / TOTAL_STEPS) * 100}%`,
              }}
            />
          </View>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16 }}>
        {step === 1 && (
          <>
            <QuestionHeader title="What brings you here?" hint="Select all that apply" />
            <View style={{ gap: 10, marginTop: 22 }}>
              {Q1_OPTIONS.map((opt) => {
                const selected = !!onboarding.goals[opt.id];
                return (
                  <Pressable
                    key={opt.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() =>
                      setOnboarding((o) => ({
                        ...o,
                        goals: { ...o.goals, [opt.id]: !o.goals[opt.id] },
                      }))
                    }
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: 16,
                      paddingHorizontal: 18,
                      borderRadius: 16,
                      backgroundColor: selected ? c.accentTint : c.chipBg,
                      borderWidth: 1.5,
                      borderColor: selected ? c.accent : 'transparent',
                    }}>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: c.text }}>
                      {opt.label}
                    </Text>
                    {selected ? <CheckCircle color={c.accent} /> : null}
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {step === 2 && (
          <>
            <QuestionHeader
              title="Any diet you follow?"
              hint="Pick one — you can change this later"
            />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 22 }}>
              {DIET_OPTIONS.map((d) => (
                <Chip
                  key={d}
                  label={d}
                  selected={onboarding.diet === d}
                  selectedStyle="fill"
                  onPress={() => setOnboarding((o) => ({ ...o, diet: d }))}
                />
              ))}
            </View>
          </>
        )}

        {step === 3 && (
          <>
            <QuestionHeader
              title="Anything you're allergic to?"
              hint="We'll flag these in every recipe"
            />
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                marginTop: 18,
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

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 18 }}>
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
          </>
        )}

        {step === 4 && (
          <>
            <QuestionHeader
              title="Who are you cooking for?"
              hint="We'll size ingredient quantities to match"
            />
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 28,
                marginTop: 60,
              }}>
              <StepperButton
                label="−"
                tone="neutral"
                onPress={() =>
                  setOnboarding((o) => ({ ...o, peopleCount: Math.max(1, o.peopleCount - 1) }))
                }
              />
              <View style={{ alignItems: 'center', minWidth: 80 }}>
                <Text style={{ fontSize: 44, fontWeight: '700', color: c.text }}>
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
          </>
        )}
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: insets.bottom + 20 }}>
        <Button title="Continue" onPress={next} />
      </View>
    </Screen>
  );
}

function QuestionHeader({ title, hint }: { title: string; hint: string }) {
  const c = useColors();
  return (
    <>
      <Text
        style={{
          fontSize: 26,
          lineHeight: 32,
          fontWeight: '700',
          color: c.text,
          letterSpacing: -0.4,
        }}>
        {title}
      </Text>
      <Text style={{ marginTop: 6, fontSize: 14, color: c.textSec }}>{hint}</Text>
    </>
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
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label === '+' ? 'Add a person' : 'Remove a person'}
      style={({ pressed }) => ({
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: tone === 'accent' ? c.accent : c.chipBg,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.75 : 1,
      })}>
      <Text
        style={{ fontSize: 26, fontWeight: '600', color: tone === 'accent' ? '#fff' : c.text }}>
        {label}
      </Text>
    </Pressable>
  );
}
