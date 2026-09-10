import { LegalPage, type LegalSection } from '@/components/legal-page';

const sections: LegalSection[] = [
  { heading: 'What Asepo collects', paragraphs: [
    'Asepo stores the account information you provide, your cooking preferences, saved recipes, grocery items, and meal plans. If you sign in with Apple or Google, we receive the account details that provider makes available to us.',
    'When you import a recipe, you may provide a public link, pasted text, a photo, or a dish name. We process only the material needed to create the recipe. Public links and generic dish requests may be cached so another identical request can reuse the result. Pasted text and uploaded photos are not placed in the shared cache.',
  ]},
  { heading: 'How information is used', paragraphs: [
    'We use your information to provide sign-in, recipe importing, meal suggestions, syncing, grocery and planning features, customer support, security, and subscription access.',
    'Recipe content may be sent through our backend to AI processing providers, including services that provide OpenAI models, to extract ingredients and instructions, suggest meals, estimate nutrition, or generate recipe images. AI results can be inaccurate, so check ingredients, allergens, food safety guidance, and nutrition information yourself.',
  ]},
  { heading: 'Service providers', paragraphs: [
    'We use Supabase for authentication, database and file storage; Render for backend hosting; Resend for account email; RevenueCat and Apple or Google for subscription processing; and AI processing services for recipe features. These providers process information under their own terms and privacy commitments.',
    'Asepo does not receive your complete payment-card details. Purchases are processed by Apple or Google and subscription status is managed through RevenueCat.',
  ]},
  { heading: 'Retention, security, and your choices', paragraphs: [
    'We retain account content while your account is active and as reasonably needed to operate the service, prevent abuse, resolve disputes, and meet legal obligations. Cache entries expire according to their cache period.',
    'You can change AI consent in Profile, delete recipes and other content, or use Reset all data. You may also request access, correction, export, or deletion by contacting info@awahai.com. No internet service is completely secure, but we use reasonable safeguards designed to protect your information.',
  ]},
  { heading: 'Children and changes', paragraphs: [
    'Asepo is not directed to children under 13. If you believe a child has provided personal information, contact us so we can address it.',
    'We may update this notice as Asepo changes. We will update the date on this page and provide additional notice when required.',
  ]},
];

export default function Privacy() {
  return <LegalPage title="Privacy Policy" updated="10 September 2026" sections={sections} />;
}
