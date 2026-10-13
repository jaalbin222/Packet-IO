import { NavLinks } from "./nav-links";
import { ResetButton } from "./reset-button";
import { setOperatorAction } from "@/lib/actions";
import { OPERATORS } from "@/lib/constants";
import { getOperator } from "@/lib/session";
import { getDb } from "@/lib/store";
import type { Operator } from "@/lib/types";

export async function Shell({ children }: { children: React.ReactNode }) {
  const operator = await getOperator();
  const db = getDb();
  const pending = db.tags.filter((tag) => tag.status === "pending" || tag.status === "drift").length;

  return (
    <div className="shell">
      <header className="topbar">
        <a className="brand" href="/">
          <img src="/logo.png" alt="" />
          Packet.io
        </a>
        <div className="topbar__meta">
          <span className="quiet">Read-only on the control network</span>
          <OperatorSwitch current={operator} />
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
          <div className="content">{children}</div>
        </main>
      </div>
    </div>
  );
}

function OperatorSwitch({ current }: { current: Operator }) {
  return (
    <div className="who" role="group" aria-label="Acting operator">
      {OPERATORS.map((operator) => (
        <form action={setOperatorAction} key={operator.id}>
          <input type="hidden" name="id" value={operator.id} />
          <button type="submit" className={operator.id === current.id ? "is-on" : undefined} title={operator.role}>
            {operator.name}
          </button>
        </form>
      ))}
    </div>
  );
}
