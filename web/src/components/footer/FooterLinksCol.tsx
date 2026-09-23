import { SiX, SiInstagram, SiWhatsapp } from '@icons-pack/react-simple-icons';

export type IconKey = 'x' | 'twitter' | 'instagram' | 'whatsapp';

export interface LinkItem {
  label: string;
  href: string;
  icon?: IconKey;
}

const iconMap: Record<IconKey, React.ComponentType<{ size?: number; fill?: string }>> = {
  x: SiX,
  twitter: SiX,
  instagram: SiInstagram,
  whatsapp: SiWhatsapp,
};

interface FooterLinksColProps {
  title: string;
  links: LinkItem[];
}

export function FooterLinksCol({ title, links }: FooterLinksColProps) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-ink-faint uppercase tracking-wider mb-4">{title}</h4>
      <ul className="space-y-2.5 text-sm text-ink-muted">
        {links.map((link, idx) => {
          const Icon = link.icon ? iconMap[link.icon] : null;
          return (
            <li key={idx}>
              <a href={link.href} className="flex items-center gap-2 hover:text-ink transition-colors">
                {Icon && <Icon size={16} fill="currentColor" />}
                {link.label}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}