'use client';

export default function PrintButton() {
  return (
    <button className="btn solid" onClick={() => window.print()}>
      Print / save as PDF
    </button>
  );
}
