import Link from "next/link";

export default function NotFound() {
  return (
    <>
      <p className="eyebrow">
        <b>404</b>Missing
      </p>
      <h1>That record is not in the fleet.</h1>
      <p className="lede">The site, gateway, or campaign may have been reset with the demo data.</p>
      <p className="actions">
        <Link className="btn btn--primary" href="/">
          Back to the fleet
        </Link>
      </p>
    </>
  );
}
