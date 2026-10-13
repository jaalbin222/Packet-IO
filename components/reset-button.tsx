"use client";

import { resetDemoAction } from "@/lib/actions";

export function ResetButton() {
  return (
    <form
      action={resetDemoAction}
      onSubmit={(event) => {
        if (!window.confirm("Restore the seeded fleet? Campaigns and mappings from this session will be cleared.")) {
          event.preventDefault();
        }
      }}
    >
      <button className="text-btn" type="submit">
        Reset demo data
      </button>
    </form>
  );
}
