"use client";

import Link from "next/link";
import { DemoPath } from "./demo-path";
import { NavLinks } from "./nav-links";
import { Notice } from "./notice";
import { ResetButton } from "./reset-button";
import { usePacket } from "./packet-provider";
import { OPERATORS } from "@/lib/constants";
import { asset, paths } from "@/lib/paths";

export function Shell({ children }: { children: React.ReactNode }) {
  const { ready, db, operatorId, notice, setOperator } = usePacket();
  const pending = db.tags.filter((tag) => tag.status === "pending" || tag.status === "drift").length;
  const operator = OPERATORS.find((item) => item.id === operatorId) ?? OPERATORS[0];

  return (
    <div className="shell">
      <header className="topbar">
        <Link className="brand" href={paths.home}>
          <img src={asset("/logo.png")} alt="" />
          Packet.io
        </Link>
        <div className="topbar__meta">
          <span className="quiet">Read-only on the control network</span>
          <div className="who" role="group" aria-label="Acting operator">
            {OPERATORS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={item.id === operator.id ? "is-on" : undefined}
                title={item.role}
                onClick={() => setOperator(item.id)}
              >
                {item.name}
              </button>
            ))}
          </div>
        </div>
      </header>
      <div className="body">
        <nav className="sidenav" aria-label="Primary">
          <NavLinks pending={pending} />
          <div className="sidenav__foot">
            <ResetButton />
          </div>
        </nav>
        <main className="main">
          <div className="content">
            {ready ? (
              <>
                <DemoPath />
                <Notice notice={notice} />
                {children}
              </>
            ) : (
              <div className="skeleton" aria-hidden>
                <div className="sk sk--path" />
                <div className="sk sk--title" />
                <div className="sk sk--lede" />
                <div className="sk sk--hero" />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
