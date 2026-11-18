'use client'

// A small Yorkie drawing, shared by the chat welcome and message signature.
export function TifaPortrait({ className = '' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 100 112" fill="none" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M22 46 15 10 37 33M63 33 85 10 78 46M22 35 20 20 33 36M67 36 80 20 77 35" />
    <path d="M19 45Q25 27 45 31Q50 23 55 31Q76 27 81 46L86 64 80 87 69 103 58 108 50 105 42 108 30 102 20 87 14 65Z" />
    <path d="M50 34Q43 46 43 55M50 34Q57 46 57 55M33 43 25 58 24 73M67 43 75 58 76 73M28 72 27 88 36 100M72 72 73 88 64 100M38 71 36 89 42 103M62 71 64 89 58 103" />
    <path d="M30 60Q35 55 40 60M60 60Q65 55 70 60" />
    <ellipse cx="35" cy="60" rx="2.8" ry="3.2" fill="currentColor" stroke="none" /><ellipse cx="65" cy="60" rx="2.8" ry="3.2" fill="currentColor" stroke="none" />
    <path d="M31 67Q38 72 42 70M58 70Q63 72 69 67M39 77Q50 69 61 77Q58 87 50 88Q42 87 39 77Z" />
    <path d="M44 76Q50 72 56 76L52 81H48Z" fill="currentColor" /><path d="M50 81V88M41 89 38 97M59 89 62 97M45 90 44 102M55 90 56 102" />
    <path d="M45 30Q41 19 46 16Q52 18 50 27Q50 17 56 17Q61 22 55 31M45 30H55" />
  </svg>
}
