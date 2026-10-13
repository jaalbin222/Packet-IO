"use client";

import { usePacket } from "./packet-provider";

export function ResetButton() {
  const { reset } = usePacket();
  return (
    <button
      className="text-btn"
      type="button"
      onClick={() => {
        if (window.confirm("Restore the seeded fleet? Campaigns and mappings in this browser will be cleared.")) {
          reset();
        }
      }}
    >
      Reset demo data
    </button>
  );
}
