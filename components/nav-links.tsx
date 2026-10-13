"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Overview" },
  { href: "/sites", label: "Sites" },
  { href: "/model", label: "Model" },
  { href: "/fleet", label: "Fleet" },
  { href: "/deployments", label: "Deployments" },
];

export function NavLinks({ pending }: { pending: number }) {
  const path = usePathname();
  return (
    <>
      {items.map((item) => {
        const active = item.href === "/" ? path === "/" : path === item.href || path.startsWith(`${item.href}/`);
        return (
          <Link key={item.href} href={item.href} className={active ? "is-active" : undefined} aria-current={active ? "page" : undefined}>
            {item.label}
            {item.href === "/sites" && pending > 0 ? <span className="badge">{pending}</span> : null}
          </Link>
        );
      })}
    </>
  );
}
