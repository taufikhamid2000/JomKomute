"use client";

import { Suspense } from "react";
import { RouteForm } from "@/components/route-form";
import { Shell } from "@/components/shell";
import { useDictionary } from "@/lib/use-dictionary";

export default function NewRoutePage() {
  const { t } = useDictionary();

  return (
    <Shell>
      <div className="animate-page-in mx-auto flex w-full max-w-lg flex-col gap-4 p-4 md:p-8">
        <h1 className="text-lg font-semibold text-foreground">{t.routeForm.title}</h1>
        <Suspense fallback={null}>
          <RouteForm />
        </Suspense>
      </div>
    </Shell>
  );
}
