// Plain server component so it can export this route's own metadata —
// app/settings/settings-content.tsx (client: useDictionary, theme/accent
// forms backed by localStorage) holds the actual page.

import type { Metadata } from "next";
import { SettingsContent } from "./settings-content";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return <SettingsContent />;
}
