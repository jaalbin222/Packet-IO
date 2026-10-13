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
        const current = path.endsWith("/") && path !== "/" ? path.slice(0, -1) : path;
        const target = item.href.endsWith("/") && item.href !== "/" ? item.href.slice(0, -1) : item.href;
        const active = target === "/" ? current === "/" : current === target || current.startsWith(`${target}/`);
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
