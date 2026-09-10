import { Stack } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

import { useColors } from '@/theme/theme-context';

export type LegalSection = { heading: string; paragraphs: string[] };

export function LegalPage({ title, updated, sections }: { title: string; updated: string; sections: LegalSection[] }) {
  const c = useColors();
  return (
    <>
      <Stack.Screen options={{ title, headerBackTitle: 'Back' }} />
      <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: 24, paddingBottom: 60 }}>
        <Text style={{ color: c.text, fontSize: 32, fontWeight: '700', marginBottom: 8 }}>{title}</Text>
        <Text style={{ color: c.textSec, fontSize: 13, marginBottom: 28 }}>Last updated: {updated}</Text>
        {sections.map((section) => (
          <View key={section.heading} style={{ marginBottom: 24 }}>
            <Text style={{ color: c.text, fontSize: 19, fontWeight: '700', marginBottom: 8 }}>{section.heading}</Text>
            {section.paragraphs.map((paragraph) => (
              <Text key={paragraph} style={{ color: c.textSec, fontSize: 15, lineHeight: 23, marginBottom: 10 }}>
                {paragraph}
              </Text>
            ))}
          </View>
        ))}
        <Text style={{ color: c.textSec, fontSize: 14 }}>Questions: info@awahai.com</Text>
      </ScrollView>
    </>
  );
}
