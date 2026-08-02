"use client";

import { AppearanceForm } from "@/components/appearance-form";
import { LanguagePicker } from "@/components/language-picker";
import { Shell } from "@/components/shell";
import { useDictionary } from "@/lib/use-dictionary";

export default function SettingsPage() {
  const { t } = useDictionary();

  return (
    <Shell>
      <div className="animate-page-in mx-auto flex w-full max-w-lg flex-col gap-6 p-4 md:p-8">
        <h1 className="text-lg font-semibold text-foreground">{t.settings.title}</h1>
        <LanguagePicker />
        <AppearanceForm />
      </div>
    </Shell>
  );
}
