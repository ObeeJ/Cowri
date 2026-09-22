interface LinkItem {
  label: string;
  href: string;
}

interface FooterLinksColProps {
  title: string;
  links: LinkItem[];
}

export function FooterLinksCol({ title, links }: FooterLinksColProps) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-ink-faint uppercase tracking-wider mb-4">{title}</h4>
      <ul className="space-y-2.5 text-sm text-ink-muted">
        {links.map((link, idx) => (
          <li key={idx}>
            <a href={link.href} className="hover:text-ink transition-colors">
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}