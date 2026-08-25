"use client";
// Pustaka ikon khusus BUG — digambar dari nol pada grid 24px.
// Setiap ikon memuat satu elemen "marka jalan" (kelas .a) yang mewarisi warna aksen,
// sehingga seluruh set terasa satu keluarga. Pakai: <IkonPeta size={20} />
import type { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement> & { size?: number; accent?: string };

function Base({ size = 24, accent = "currentColor", children, ...rest }: Props & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
      strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}
    >
      <g style={{ ["--aksen" as string]: accent }}>{children}</g>
      <style>{`g [data-a]{stroke:${accent}}`}</style>
    </svg>
  );
}

export function IkonBeranda(p: Props) {
  return <Base {...p}>{<><path d="M4 11.2 12 4.5l8 6.7"/><path d="M6.2 10v8.5h11.6V10"/><path d="M10 18.5v-4.3h4v4.3"/><g data-a="1"><path d="M3 21.4h3M8.5 21.4h3M14 21.4h3M19.5 21.4h1.5"/></g></>}</Base>;
}

export function IkonPeta(p: Props) {
  return <Base {...p}>{<><path d="M9 4.6 3.8 6.8v12.6L9 17.2l6 2.2 5.2-2.2V4.6L15 6.8Z"/><path d="M9 4.6v12.6M15 6.8v12.6"/><g data-a="1"><circle cx="12" cy="10.4" r="2.1"/><path d="M12 12.5v2"/></g></>}</Base>;
}

export function IkonGowes(p: Props) {
  return <Base {...p}>{<><circle cx="5.6" cy="16.6" r="3.6"/><circle cx="18.4" cy="16.6" r="3.6"/><path d="M5.6 16.6 9.4 8.4h4.2l3 8.2"/><path d="M8.2 8.4h4.6"/><g data-a="1"><path d="M12 16.6h2.6M2 12.4h2.6M19.4 12.4H22"/></g></>}</Base>;
}

export function IkonSos(p: Props) {
  return <Base {...p}>{<><path d="M12 3.6 3.4 18.6h17.2Z"/><path d="M12 9.4v4.2"/><g data-a="1"><circle cx="12" cy="16.2" r="1"/><path d="M6.6 21.4h3M12 21.4h1.6M16 21.4h2.4"/></g></>}</Base>;
}

export function IkonEdukasi(p: Props) {
  return <Base {...p}>{<><path d="M3.6 6.2c3-1.4 5.7-1.4 8.4 0 2.7-1.4 5.4-1.4 8.4 0v11.6c-3-1.4-5.7-1.4-8.4 0-2.7-1.4-5.4-1.4-8.4 0Z"/><path d="M12 6.2v11.6"/><g data-a="1"><path d="M6.4 10h3M6.4 13h2M15 10h2.8M15 13h2"/></g></>}</Base>;
}

export function IkonForum(p: Props) {
  return <Base {...p}>{<><path d="M3.6 5.6h13.2v8.6H9.4l-4 3.2v-3.2H3.6Z"/><path d="M17.4 9.4h3v8.4h-2v3l-3.4-3h-4"/><g data-a="1"><path d="M6.4 9.8h7.4M6.4 12h4.6"/></g></>}</Base>;
}

export function IkonProfil(p: Props) {
  return <Base {...p}>{<><circle cx="12" cy="8.4" r="3.6"/><path d="M4.8 20.4c.6-3.9 3.6-6 7.2-6s6.6 2.1 7.2 6"/><g data-a="1"><path d="M8.4 6.6c1.4-1.6 5.8-1.6 7.2 0"/><path d="M9.6 20.4h4.8"/></g></>}</Base>;
}

export function IkonKampanye(p: Props) {
  return <Base {...p}>{<><path d="M4.4 9.6v4.8h3.2L15 19V5L7.6 9.6Z"/><path d="M18 8.6a5 5 0 0 1 0 6.8"/><g data-a="1"><path d="M20.4 6.4a8.4 8.4 0 0 1 0 11.2"/><path d="M6.6 14.4v4.2h2.8"/></g></>}</Base>;
}

export function IkonLapor(p: Props) {
  return <Base {...p}>{<><rect x="3.4" y="7.4" width="17.2" height="10.4" rx="1.6"/><path d="M12 7.4V4.2"/><path d="M8.6 4.2h6.8"/><g data-a="1"><path d="M7 11.4h4.2M7 14.2h6.6"/><circle cx="16.8" cy="12.6" r="1.6"/></g></>}</Base>;
}

export function IkonPantau(p: Props) {
  return <Base {...p}>{<><path d="M12 21c3.6-4.3 5.4-7.4 5.4-9.6A5.4 5.4 0 0 0 6.6 11.4c0 2.2 1.8 5.3 5.4 9.6Z"/><circle cx="12" cy="11.2" r="1.9"/><g data-a="1"><path d="M3.6 6.2a10 10 0 0 1 2.6-2.4M20.4 6.2a10 10 0 0 0-2.6-2.4"/></g></>}</Base>;
}

export function IkonDashboard(p: Props) {
  return <Base {...p}>{<><path d="M12 3.4 4.4 6.2v6c0 4.3 3.1 7.6 7.6 8.8 4.5-1.2 7.6-4.5 7.6-8.8v-6Z"/><g data-a="1"><path d="M9 14.6v-2.8M12 14.6V9.8M15 14.6v-4"/></g></>}</Base>;
}

export function IkonRute(p: Props) {
  return <Base {...p}>{<><circle cx="6" cy="6.4" r="2.4"/><circle cx="18" cy="17.6" r="2.4"/><path d="M6 8.8v3.4c0 2 1.6 3.4 3.6 3.4h4.8"/><g data-a="1"><path d="M15.6 15.6h.1M9.4 4.4h2.4M13.8 4.4h1.6"/></g></>}</Base>;
}

export function IkonStreak(p: Props) {
  return <Base {...p}>{<><path d="M12 21c3.7 0 6.4-2.5 6.4-6 0-4.4-4-6-4-9.6-2 .9-3.2 2.4-3.6 4.2-1-.7-1.6-1.8-1.7-3-1.9 1.6-3.5 4.2-3.5 8.4 0 3.5 2.7 6 6.4 6Z"/><g data-a="1"><path d="M12 17.8c1.4 0 2.4-1 2.4-2.3 0-1.6-1.5-2.3-1.5-3.6-1.4.9-2.1 2-2.1 3.6 0 1.3.9 2.3 1.2 2.3Z"/></g></>}</Base>;
}

export function IkonTrofi(p: Props) {
  return <Base {...p}>{<><path d="M7.4 4.4h9.2v5a4.6 4.6 0 0 1-9.2 0Z"/><path d="M7.4 6.2H4.6v1.4a3 3 0 0 0 2.8 3"/><path d="M16.6 6.2h2.8v1.4a3 3 0 0 1-2.8 3"/><path d="M12 14v3.4"/><g data-a="1"><path d="M8.6 20.4h6.8"/><path d="M9.8 17.4h4.4v3H9.8Z"/></g></>}</Base>;
}

export function IkonKartu(p: Props) {
  return <Base {...p}>{<><rect x="3.4" y="5.4" width="17.2" height="13.2" rx="2"/><path d="M3.4 15.2l4.4-4 3.4 3 3.6-3.6 5.8 5.2"/><g data-a="1"><circle cx="8.2" cy="9.6" r="1.4"/><path d="M6 21.2h4M12.4 21.2h5.6"/></g></>}</Base>;
}

export function IkonHelm(p: Props) {
  return <Base {...p}>{<><path d="M3.8 14.6a8.2 8.2 0 0 1 16.4 0"/><path d="M3.8 14.6h16.4l-1.4 3.2H5.2Z"/><g data-a="1"><path d="M9 6.6c1.6 2 2.2 4.6 2.2 8M14.6 7.6c-.8 1.8-1.2 4-1.2 7"/></g></>}</Base>;
}
