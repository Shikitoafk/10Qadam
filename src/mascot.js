/** Optional, decorative Qyran companion. It never carries essential instructions. */
export function mascotMarkup(variant = "sky", className = "") {
  if (variant === "hidden") return "";

  const ink = "#203449";
  const body = variant === "ink" ? "#36516a" : "#87bddb";
  const wing = variant === "ink" ? "#203449" : "#4b91ba";
  const light = variant === "ink" ? "#d8e4ec" : "#dcedf7";
  const safeClass = String(className).replace(/[^a-zA-Z0-9_\s-]/g, "");

  return `<svg class="qyran-mascot ${safeClass}" viewBox="0 0 200 220" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <ellipse cx="100" cy="205" rx="58" ry="7" fill="${ink}" opacity=".07"/>
    <path d="m83 172-7 25 23-11 24 11-7-25" fill="${wing}" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M67 72C38 84 25 113 27 145c9-3 17-9 23-18-1 16 3 29 9 38 13-16 23-37 24-59" fill="${wing}" stroke="${ink}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M132 73c29 11 42 39 41 71-10-4-17-10-23-19 1 17-2 29-8 39-14-17-24-38-25-59" fill="${wing}" stroke="${ink}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M55 91c0-29 18-47 45-47s45 18 45 47l-4 51c-2 29-17 44-41 44s-39-15-41-44z" fill="${body}" stroke="${ink}" stroke-width="3"/>
    <path d="M71 105c7-8 18-13 29-13s22 5 29 13l-2 32c-1 22-11 34-27 34s-26-12-27-34z" fill="${light}"/>
    <path d="M58 78c-4-6-6-16-3-26l14 8c8-14 21-21 37-21l-8-12c18 1 34 13 41 29l9-6c2 12 0 22-5 30-9 13-22 19-43 19-20 0-34-7-42-21Z" fill="#fff8e9" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M71 75c5-4 12-5 18-2M112 73c6-3 12-2 17 2" stroke="${ink}" stroke-width="3.5" stroke-linecap="round"/>
    <ellipse cx="81" cy="82" rx="3.5" ry="5" fill="${ink}"/>
    <ellipse cx="120" cy="82" rx="3.5" ry="5" fill="${ink}"/>
    <path d="m91 86 10-5 12 7-12 17-10-9z" fill="#e9ad59" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/>
    <path d="m95 91 6 2 7-4" stroke="${ink}" stroke-width="2" stroke-linecap="round"/>
    <path d="m91 123 9 5 9-5m-16 17 7 4 7-4" stroke="${body}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="m85 180-3 16m33-16 3 16m-43 1h17m16 0h17" stroke="${ink}" stroke-width="4" stroke-linecap="round"/>
  </svg>`;
}
