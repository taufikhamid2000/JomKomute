"use client";

import { AppearanceForm } from "@/components/appearance-form";
import { LanguagePicker } from "@/components/language-picker";
import { AppShell } from "@/components/app-shell";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-client";
import { useAuthed } from "@/lib/use-auth";
import { useDictionary } from "@/lib/use-dictionary";

export function SettingsContent() {
  const { t } = useDictionary();
  const router = useRouter();
  const authed = useAuthed();

  async function handleLogOut() {
    await supabaseBrowser().auth.signOut();
    router.push("/login");
  }

  return (
    <AppShell title={t.settings.title} width="sm">
      <div className="animate-page-in flex w-full flex-col gap-6">
        <LanguagePicker />
        <AppearanceForm />
        {authed === true && (
          <button
            type="button"
            onClick={handleLogOut}
            className="app-card flex min-h-11 cursor-pointer items-center justify-center px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted md:hidden"
          >
            {t.nav.logOut}
          </button>
        )}
      </div>
    </AppShell>
  );
}
