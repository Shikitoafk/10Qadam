const paths = {
  brand: '<path d="M3 17h6v-5h6V7h6"/><path d="m17 3 4 4-4 4"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  calendar:
    '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18m-13 4h2m4 0h2m-8 3h2"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M9 2h6m-3 7v4l3 2"/>',
  cards:
    '<rect x="8" y="6" width="12" height="15" rx="2"/><path d="m5 17-2-1V4a2 2 0 0 1 2-2h10m-3 9h4m-4 4h4"/>',
  game: '<path d="M7 7h10a4 4 0 0 1 4 3l1 6a2.5 2.5 0 0 1-4 2l-3-2H9l-3 2a2.5 2.5 0 0 1-4-2l1-6a4 4 0 0 1 4-3Z"/><path d="M7 10v4m-2-2h4m6-1h.01m3 2h.01"/>',
  chart: '<path d="M4 4v16h16M8 16v-4m5 4V9m5 7V5"/>',
  arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
  back: '<path d="M20 12H5m6-6-6 6 6 6"/>',
  flame:
    '<path d="M12 2c2 5 6 6 7 11a7 7 0 1 1-14 0c.3-2 1.5-4 3-5-.2 3 1.1 4 2 4 1.6-2 2.3-5 2-10Z"/><path d="M12 22c-3-1-3.8-3-2.8-5 1 1 2 1 2.8-2 3.5 2 3.5 6 0 7Z"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  left: '<path d="m15 6-6 6 6 6"/>',
  right: '<path d="m9 6 6 6-6 6"/>',
  play: '<path d="m8 5 12 7-12 7V5Z"/>',
  pause: '<path d="M9 5v14m6-14v14"/>',
  reset: '<path d="M4 11a8 8 0 1 1 2 7M4 5v6h6"/>',
  expand: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  edit: '<path d="m14 5 5 5M4 20l4-.8L21 6l-4-4L4 15l0 5Z"/>',
};
export const icon = (name) =>
  `<svg class="s-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || ""}</svg>`;

export function dog(run = false) {
  return `<svg class="s-dog ${run ? "s-dog-run" : ""}" viewBox="0 0 180 132" aria-hidden="true" fill="none">
  <ellipse cx="94" cy="118" rx="61" ry="8" fill="#193e36" opacity=".15"/>
  <path d="M48 83Q13 75 20 51q8 14 33 11" stroke="#453329" stroke-width="4" fill="#bf774c" stroke-linejoin="round"/>
  <path d="M47 79q5-20 28-22l46 2 12 33-16 7-10-4-20 1-4 16H67l-2-15-12 12H39l12-25Z" fill="#e1a878" stroke="#453329" stroke-width="4" stroke-linejoin="round"/>
  <path d="M84 62q-10 19 0 33l-5 17H66l-2-19" fill="#fff5d8" stroke="#453329" stroke-width="3" stroke-linejoin="round"/>
  <path d="m117 92 9 20h15l-8-21" fill="#fff5d8" stroke="#453329" stroke-width="3" stroke-linejoin="round"/>
  <path d="m104 44 2-28q19 4 23 19l13 2 15-15 2 30 7 10q7 14-8 23l-17 6q-21 7-34-8-10-11-3-39Z" fill="#edb688" stroke="#453329" stroke-width="4" stroke-linejoin="round"/>
  <path d="M109 25l12 12-11 4m42-8-9 10 10 3" fill="#b46854"/>
  <path d="M126 69q9-15 28-9l11 7q5 17-20 20-19 1-19-18Z" fill="#fff5d8"/>
  <path d="M161 63q7-3 7 4l-5 5-5-4q-2-3 3-5Z" fill="#453329"/>
  <circle cx="143" cy="56" r="3" fill="#453329"/><path d="M145 78q8 4 14-2" stroke="#453329" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M104 76q11 13 29 15l-9 7q-17-4-25-15Z" fill="#319583" stroke="#453329" stroke-width="3"/>
  <circle cx="125" cy="97" r="5" fill="#f5d674" stroke="#453329" stroke-width="2"/>
  </svg>`;
}

export function todayArt() {
  return `<svg class="s-today-art" viewBox="0 0 440 310" fill="none" aria-hidden="true">
  <defs><pattern id="studio-grid" width="26" height="26" patternUnits="userSpaceOnUse"><path d="M0 26V0h26" stroke="#3f6b57" opacity=".16"/></pattern></defs>
  <rect x="30" y="11" width="397" height="287" rx="25" fill="url(#studio-grid)"/>
  <circle cx="241" cy="155" r="126" stroke="#678c72" stroke-dasharray="3 7"/><circle cx="241" cy="155" r="97" stroke="#678c72" opacity=".35"/>
  <path d="M97 254c31-22 124-35 221-14l38 20-31 24-196-3Z" fill="#b7d0a6"/>
  <g transform="rotate(-12 201 168)"><rect x="128" y="80" width="166" height="172" rx="17" fill="#315a46"/><rect x="128" y="72" width="166" height="171" rx="17" fill="#fbf8e9" stroke="#315a46" stroke-width="2"/>
  <rect x="147" y="91" width="128" height="50" rx="9" fill="#e7edcf"/><path d="m158 116 6 6 12-14" stroke="#315a46" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M192 113h64m-64 11h43m-83 36h101m-101 17h84m-84 17h95m-95 17h45" stroke="#53735c" stroke-width="3" stroke-linecap="round" opacity=".5"/></g>
  <g transform="rotate(12 302 174)"><rect x="244" y="122" width="133" height="110" rx="16" fill="#315a46"/><rect x="244" y="114" width="133" height="111" rx="16" fill="#cce5b3" stroke="#315a46" stroke-width="2"/>
  <circle cx="310" cy="170" r="35" stroke="#6c9c70" stroke-width="2"/><circle cx="310" cy="170" r="35" stroke="#254b38" stroke-width="3" stroke-dasharray="145 220" transform="rotate(-90 310 170)"/><path d="M310 151v20l12 8" stroke="#254b38" stroke-width="3" stroke-linecap="round"/></g>
  <path d="M348 58v23m-11-11h22M78 95v18m-9-9h18m290 139v18m-9-9h18" stroke="#527d58" stroke-width="2" stroke-linecap="round"/><circle cx="113" cy="52" r="7" fill="#edb469"/>
  </svg>`;
}
