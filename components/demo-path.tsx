"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { usePacket } from "@/components/packet-provider";
import { paths } from "@/lib/paths";
import { readSeen, writeSeen } from "@/lib/seen";

export function DemoPath() {
  const pathname = usePathname();
  const { db } = usePacket();
  const [seen, setSeen] = useState<string[]>([]);

  useEffect(() => {
    const next = new Set(readSeen());
    next.add(`${pathname}${window.location.search}`);
    const list = [...next];
    writeSeen(list);
    setSeen(list);
  }, [pathname]);

  useEffect(() => {
    const onClear = () => setSeen([]);
    window.addEventListener("packet-demo-clear", onClear);
    return () => window.removeEventListener("packet-demo-clear", onClear);
  }, []);

  const tag = db.tags.find((item) => item.id === "cr-inv3-ac");
  const bess = db.deployments.find((item) => item.id === "dep-bess");
  const alarm = db.deployments.find((item) => item.id === "dep-alarm");
  const steps = [
    {
      id: "confirm",
      label: "Confirm a tag",
      href: paths.site("chisholm", "cr-inv3-ac"),
      done: tag?.status === "accepted",
    },
    {
      id: "model",
      label: "Read the model",
      href: paths.model({ asset: "cr-inv3", site: "chisholm" }),
      done: seen.some((path) => path.includes("/model")),
    },
    {
      id: "runtime",
      label: "See the buffer",
      href: paths.node("nr-gw-01"),
      done: seen.some((path) => path.includes("nr-gw-01")),
    },
    {
      id: "roll",
      label: "Roll the fleet",
      href: bess ? paths.deployment(bess.id) : paths.deployments,
      done: (bess && bess.stage !== "draft") || alarm?.stage === "rolled_back",
    },
  ];

  return (
    <nav className="path" aria-label="Demo path">
      {steps.map((step, index) => (
        <Link key={step.id} href={step.href} className={step.done ? "is-done" : undefined}>
          <i>{step.done ? "✓" : index + 1}</i>
          {step.label}
        </Link>
      ))}
    </nav>
  );
}

