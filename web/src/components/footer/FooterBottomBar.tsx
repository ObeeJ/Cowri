import { XIcon, LinkedInIcon, InstagramIcon, WhatsAppIcon } from '~/components/icons';

export function FooterBottomBar() {
  return (
    <div className="mt-16 md:mt-24 pt-8 border-t border-rule flex flex-col md:flex-row items-center justify-between text-xs text-ink-faint gap-4">
      <p>&copy; 2026 Cowri. All rights reserved.</p>
      <div className="flex items-center space-x-5">
        <a href="#" className="hover:text-ink transition-colors" aria-label="X (Twitter)">
          <XIcon size={16} />
        </a>
        <a href="#" className="hover:text-ink transition-colors" aria-label="LinkedIn">
          <LinkedInIcon size={16} />
        </a>
        <a href="#" className="hover:text-ink transition-colors" aria-label="Instagram">
          <InstagramIcon size={16} />
        </a>
        <a href="#" className="hover:text-ink transition-colors" aria-label="WhatsApp Community">
          <WhatsAppIcon size={16} />
        </a>
      </div>
    </div>
  );
}