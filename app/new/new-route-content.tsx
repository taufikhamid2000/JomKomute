"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { RouteForm } from "@/components/route-form";
import { useDictionary } from "@/lib/use-dictionary";

// Focused form view: AppShell without the bottom tab bar, back to /routes.
export function NewRouteContent() {
  return (
    <Suspense fallback={null}>
      <NewRouteShell />
    </Suspense>
  );
}

function NewRouteShell() {
  const { t } = useDictionary();
  const isEdit = !!useSearchParams().get("editId");
  return (
    <AppShell
      title={isEdit ? t.routeForm.editTitle : t.routeForm.title}
      back={{ href: "/routes", label: t.homeScreen.close }}
      width="sm"
      tabBar={false}
    >
      <div className="animate-page-in flex w-full flex-col gap-4">
        <RouteForm />
      </div>
    </AppShell>
  );
}
