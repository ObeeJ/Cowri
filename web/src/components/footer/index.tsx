import { FooterBrandCol } from "./FooterBrandCol";
import { FooterLinksCol } from "./FooterLinksCol";
import { FooterBottomBar } from "./FooterBottomBar";
import { FooterWatermark } from "./FooterWatermark";

const PRODUCT_LINKS = [
  { label: "How Ajo works", href: "/how-ajo-works" },
  { label: "Splitting bills", href: "/split-bills" },
  { label: "Security", href: "/security" },
  { label: "Design system", href: "/design-system" },
];

const SOCIAL_LINKS = [
  { label: "X (Twitter)", href: "https://x.com/cowri" },
  { label: "LinkedIn", href: "https://linkedin.com/company/cowri" },
  { label: "Instagram", href: "https://instagram.com/cowri" },
  { label: "WhatsApp Community", href: "https://whatsapp.com/cowri" },
];

const LEGAL_LINKS = [
  { label: "Terms of Service", href: "/terms" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Security Policy", href: "/security-policy" },
];

export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-paper-raised text-ink pt-20 pb-12 md:pt-28 md:pb-16 border-t border-rule">
      <div className="container mx-auto px-6 max-w-6xl relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-12 md:gap-16 mb-16 md:mb-24">
          <FooterBrandCol />
          <FooterLinksCol title="Product" links={PRODUCT_LINKS} />
          <FooterLinksCol title="Social" links={SOCIAL_LINKS} />
          <FooterLinksCol title="Legal" links={LEGAL_LINKS} />
        </div>
        <FooterBottomBar />
      </div>
      <FooterWatermark />
    </footer>
  );
}
