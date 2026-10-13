export function Notice({
  notice,
}: {
  notice: { text: string; tone: "ok" | "bad" | "warn" } | null;
}) {
  if (!notice) return null;
  return (
    <p className={`notice notice--${notice.tone}`} role="status">
      {notice.text}
    </p>
  );
}
