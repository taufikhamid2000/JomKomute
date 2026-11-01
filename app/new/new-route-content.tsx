"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { RouteForm } from "@/components/route-form";
import { Shell } from "@/components/shell";
import { useDictionary } from "@/lib/use-dictionary";

export function NewRouteContent() {
  const { t } = useDictionary();
  return (
    <Shell tabBar={false}>
      <div className="animate-page-in mx-auto flex w-full max-w-lg flex-col gap-4 p-4 pb-[max(2rem,env(safe-area-inset-bottom))] md:p-8">
      <Link
        href="/routes"
        className="flex min-h-11 w-fit items-center gap-1 rounded-lg pr-3 text-sm font-medium text-primary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <span aria-hidden="true">←</span> {t.homeScreen.close}
      </Link>
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
