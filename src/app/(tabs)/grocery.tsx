import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Check } from '@/components/icons';
import { EmptyIllustration, Screen } from '@/components/ui';
import { groupByAisle } from '@/lib/grocery';
import { useStore } from '@/store/app-store';
import { useColors } from '@/theme/theme-context';

/** Grocery list — fed by "Add to grocery list" on any recipe. */
export default function Grocery() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const {
    grocery,
    toggleGroceryItem,
    removeGroceryItem,
    addManualGroceryItem,
    clearCheckedGrocery,
  } = useStore();

  const [draft, setDraft] = useState('');

  const unchecked = grocery.filter((i) => !i.checked);
  const checked = grocery.filter((i) => i.checked);
  const sections = groupByAisle(unchecked);

  const submit = () => {
    const v = draft.trim();
    if (!v) return;
    addManualGroceryItem(v);
    setDraft('');
  };

  return (
    <Screen style={{ paddingTop: insets.top + 12 }}>
      <View
        style={{
          paddingHorizontal: 20,
          flexDirection: 'row',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
        }}>
        <View>
          <Text style={{ fontSize: 30, fontWeight: '700', color: c.text, letterSpacing: -0.4 }}>
            Grocery
          </Text>
          <Text style={{ fontSize: 13, color: c.textSec, marginTop: 2 }}>
            {unchecked.length} to buy
            {checked.length ? ` · ${checked.length} done` : ''}
          </Text>
        </View>
        {checked.length ? (
          <Pressable onPress={clearCheckedGrocery} accessibilityRole="button">
            <Text style={{ fontSize: 13.5, fontWeight: '600', color: c.accent }}>Clear done</Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 170 }}
        keyboardShouldPersistTaps="handled">
        {grocery.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 30, paddingHorizontal: 20 }}>
            <EmptyIllustration />
            <Text style={{ marginTop: 20, fontSize: 18, fontWeight: '700', color: c.text }}>
              Nothing on the list
            </Text>
            <Text
              style={{
                marginTop: 6,
                fontSize: 14,
                lineHeight: 20,
                color: c.textSec,
                textAlign: 'center',
              }}>
              Open any recipe and tap “Add to grocery list”, or type an item below.
            </Text>
          </View>
        ) : null}

        {sections.map((section) => (
          <View key={section.aisle} style={{ marginBottom: 22 }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: c.textSec,
                textTransform: 'uppercase',
                letterSpacing: 0.6,
                marginBottom: 6,
              }}>
              {section.aisle} · {section.items.length}
            </Text>
            {section.items.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => toggleGroceryItem(item.id)}
                onLongPress={() => removeGroceryItem(item.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: item.checked }}
                accessibilityHint="Long press to remove"
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: c.border,
                }}>
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    borderWidth: 1.5,
                    borderColor: c.border,
                  }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, color: c.text }}>{item.name}</Text>
                  {item.sources.length ? (
                    <Text style={{ fontSize: 11.5, color: c.textSec, marginTop: 2 }}>
                      {item.sources.join(' · ')}
                    </Text>
                  ) : null}
                </View>
                {item.qty || item.unit ? (
                  <Text style={{ fontSize: 14, fontWeight: '600', color: c.textSec }}>
                    {item.qty}
                    {item.unit ? ` ${item.unit}` : ''}
                  </Text>
                ) : null}
              </Pressable>
            ))}
          </View>
        ))}

        {checked.length ? (
          <View>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: c.textSec,
                textTransform: 'uppercase',
                letterSpacing: 0.6,
                marginBottom: 6,
              }}>
              Checked · {checked.length}
            </Text>
            {checked.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => toggleGroceryItem(item.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: true }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingVertical: 10,
                  opacity: 0.55,
                }}>
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: c.accent,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Check color="#fff" size={11} />
                </View>
                <Text
                  style={{
                    flex: 1,
                    fontSize: 15,
                    color: c.textSec,
                    textDecorationLine: 'line-through',
                  }}>
                  {item.name}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </ScrollView>

      {/* Quick add */}
      <View
        style={{
          position: 'absolute',
          left: 20,
          right: 20,
          // Clears the floating + button, which hangs 70pt above the tab bar.
          bottom: insets.bottom + 122,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          backgroundColor: c.inputBg,
          borderWidth: 1,
          borderColor: c.border,
          borderRadius: 14,
          paddingLeft: 16,
          padding: 4,
        }}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={submit}
          placeholder="Add an item"
          placeholderTextColor={c.textSec}
          style={{ flex: 1, fontSize: 15, color: c.text, paddingVertical: 11 }}
        />
        <Pressable
          onPress={submit}
          accessibilityRole="button"
          accessibilityLabel="Add item"
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            backgroundColor: c.accent,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600' }}>+</Text>
        </Pressable>
      </View>
    </Screen>
  );
}
