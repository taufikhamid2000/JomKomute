import { RouteForm } from "@/components/route-form";
import { Shell } from "@/components/shell";

export default function NewRoutePage() {
  return (
    <Shell>
      <div className="animate-page-in mx-auto flex w-full max-w-lg flex-col gap-4 p-4 md:p-8">
        <h1 className="text-lg font-semibold text-foreground">Add a route</h1>
        <RouteForm />
      </div>
    </Shell>
  );
}
