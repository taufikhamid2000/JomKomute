import { ThemePicker } from "@/components/theme-picker";
import { Shell } from "@/components/shell";

export default function SettingsPage() {
  return (
    <Shell>
      <div className="animate-page-in mx-auto flex w-full max-w-lg flex-col gap-6 p-4 md:p-8">
        <h1 className="text-lg font-semibold text-foreground">Settings</h1>
        <ThemePicker />
      </div>
    </Shell>
  );
}
