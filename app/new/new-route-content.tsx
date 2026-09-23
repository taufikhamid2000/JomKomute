"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { RouteForm } from "@/components/route-form";
import { Shell } from "@/components/shell";
import { useDictionary } from "@/lib/use-dictionary";

export function NewRouteContent() {
  return (
    <Shell>
      <div className="animate-page-in mx-auto flex w-full max-w-lg flex-col gap-4 p-4 md:p-8">
        <Suspense fallback={null}>
          <NewRouteTitle />
          <RouteForm />
        </Suspense>
      </div>
    </Shell>
  );
}

function NewRouteTitle() {
  const { t } = useDictionary();
  const isEdit = !!useSearchParams().get("editId");
  return <h1 className="text-lg font-semibold text-foreground">{isEdit ? t.routeForm.editTitle : t.routeForm.title}</h1>;
}
