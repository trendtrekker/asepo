import { LegalPage, type LegalSection } from '@/components/legal-page';

const sections: LegalSection[] = [
  { heading: 'Using Asepo', paragraphs: [
    'These terms govern your use of Asepo. By creating an account or using the service, you agree to them. You must provide accurate account information, keep your account secure, and use Asepo only as permitted by law.',
    'You may not misuse the service, interfere with its operation, attempt unauthorized access, evade usage limits, or use automated methods that place unreasonable load on Asepo or its providers.',
  ]},
  { heading: 'Recipes and AI results', paragraphs: [
    'You keep your rights in content you submit. You give Asepo permission to host, process, reproduce, and format that content only as needed to provide and improve the service. You are responsible for having the right to submit it.',
    'Imported and AI-generated recipes may be incomplete or inaccurate. Asepo is not medical, nutritional, or food-safety advice. Check allergens, ingredients, cooking temperatures, storage guidance, and nutrition information before relying on a result.',
  ]},
  { heading: 'Free service and subscriptions', paragraphs: [
    'Asepo may offer limited free usage and paid Asepo Pro subscriptions. Current features, limits, prices, billing periods, and trial terms are shown before purchase.',
    'Subscriptions renew automatically unless cancelled through your Apple App Store or Google Play account before the renewal date. You can restore eligible purchases in the paywall and manage or cancel a subscription through the store account used to buy it. Apple or Google handles billing and refund requests under the applicable store rules.',
  ]},
  { heading: 'Availability and termination', paragraphs: [
    'We may change, suspend, or discontinue features, and may restrict an account that violates these terms or threatens the service or other users. You may stop using Asepo at any time and request account deletion.',
    'The service is provided on an “as available” basis to the extent permitted by law. We do not promise uninterrupted operation or that every imported or generated result will be correct.',
  ]},
  { heading: 'Liability and changes', paragraphs: [
    'To the extent permitted by applicable law, Asepo and its operator are not liable for indirect or consequential losses arising from use of the service. Nothing in these terms excludes rights or liability that cannot legally be excluded.',
    'We may update these terms as the service changes. The updated terms and effective date will appear on this page. Continued use after an update means you accept the revised terms where permitted by law.',
  ]},
];

export default function Terms() {
  return <LegalPage title="Terms of Use" updated="10 September 2026" sections={sections} />;
}
