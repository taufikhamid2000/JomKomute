import type { Metadata } from "next";
import { Shell } from "@/components/shell";

export const metadata: Metadata = { title: "API" };

type Endpoint = {
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  path: string;
  description: string;
  status: "live" | "planned";
  response?: string;
  auth?: string;
};
type EndpointGroup = { tag: string; endpoints: Endpoint[] };

const METHOD_CLASS: Record<Endpoint["method"], string> = {
  GET: "text-sky-600 dark:text-sky-400",
  POST: "text-emerald-600 dark:text-emerald-400",
  PATCH: "text-amber-600 dark:text-amber-400",
  PUT: "text-amber-600 dark:text-amber-400",
  DELETE: "text-destructive",
};

// Temporary placeholder. Only rows marked "live" correspond to code that
// exists today; everything else is "planned" and not implemented.
const GROUPS: EndpointGroup[] = [
  {
    "tag": "Line status",
    "endpoints": [
      {
        "method": "GET",
        "path": "/api/line-history",
        "description": "Historical line status. Optional ?days sets how far back to look.",
        "status": "live",
        "response": "application/json",
        "auth": "None."
      },
      {
        "method": "GET",
        "path": "/api/lines",
        "description": "List train lines and their current status.",
        "status": "planned"
      }
    ]
  },
  {
    "tag": "Pings",
    "endpoints": [
      {
        "method": "GET",
        "path": "/api/pings/counts",
        "description": "Planned-trip ping counts for a station and date. Requires ?station and ?date; optional ?bucket and ?window (numbers).",
        "status": "live",
        "response": "application/json",
        "auth": "None."
      },
      {
        "method": "GET",
        "path": "/api/pings/hourly",
        "description": "Hourly planned-trip ping counts. Requires ?station and ?date.",
        "status": "live",
        "response": "application/json",
        "auth": "None."
      },
      {
        "method": "PUT",
        "path": "/api/pings/{pingKey}",
        "description": "Register or update a planned-trip ping (JSON body).",
        "status": "live",
        "response": "application/json",
        "auth": "None."
      },
      {
        "method": "DELETE",
        "path": "/api/pings/{pingKey}",
        "description": "Remove a planned-trip ping.",
        "status": "live",
        "response": "application/json",
        "auth": "None."
      }
    ]
  },
  {
    "tag": "Push notifications",
    "endpoints": [
      {
        "method": "POST",
        "path": "/api/push/subscribe",
        "description": "Save a web-push subscription. JSON body: endpoint, p256dh, auth, lineIds (string array).",
        "status": "live",
        "response": "application/json",
        "auth": "None."
      },
      {
        "method": "POST",
        "path": "/api/push/unsubscribe",
        "description": "Remove a web-push subscription. JSON body: endpoint.",
        "status": "live",
        "response": "application/json",
        "auth": "None."
      },
      {
        "method": "GET",
        "path": "/api/push/check",
        "description": "Scheduled job that sends line-status push notifications. Called daily by Vercel Cron.",
        "status": "live",
        "response": "application/json",
        "auth": "Bearer CRON_SECRET (internal, not for public use)."
      }
    ]
  },
  {
    "tag": "Reports",
    "endpoints": [
      {
        "method": "GET",
        "path": "/api/reports",
        "description": "List commuter reports.",
        "status": "planned"
      },
      {
        "method": "POST",
        "path": "/api/reports",
        "description": "Submit a report.",
        "status": "planned"
      },
      {
        "method": "DELETE",
        "path": "/api/reports/{id}",
        "description": "Delete your own report.",
        "status": "planned"
      },
      {
        "method": "POST",
        "path": "/api/reports/{id}/vote",
        "description": "Vote on a report.",
        "status": "planned"
      }
    ]
  }
];

export default function ApiDocsPage() {
  return (
    <Shell>
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-12">
      <div>
        <h1 className="text-xl font-semibold text-foreground">API</h1>
        <p className="mt-2 text-sm text-foreground/60">
          A public REST API for JomKomute (live commuter reports and train line status) is being planned. This page is a temporary placeholder.
        </p>
      </div>

      <p className="rounded-2xl border border-border bg-muted/40 p-4 text-sm text-foreground/60">
        <span className="text-foreground">Placeholder, not yet public.</span> This API is a placeholder and is not yet public or stable. Endpoints marked Live exist in the app today, but they are internal, not documented for third parties and may change without notice. Everything marked Planned is a roadmap and cannot be called yet.
      </p>

      <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm text-foreground/60">
        <p className="text-foreground">Authenticating</p>
        <p className="mt-1">API keys are not available yet. When they ship, requests will use a bearer token:</p>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-background p-3 text-xs text-foreground">
          <code>{`curl -H "Authorization: Bearer <api-key>" https://jomkomute.taufikhamid.com/api/...`}</code>
        </pre>
      </div>

      <div className="flex flex-col gap-6">
        {GROUPS.map((group) => (
          <section key={group.tag} className="flex flex-col gap-2">
            <h2 className="text-sm font-medium text-foreground/60">{group.tag}</h2>
            <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border">
              {group.endpoints.map((endpoint) => (
                <li key={`${endpoint.method} ${endpoint.path}`} className="flex flex-col gap-1.5 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`font-mono text-xs font-semibold ${METHOD_CLASS[endpoint.method]}`}>
                      {endpoint.method}
                    </span>
                    <code className="text-sm text-foreground">{endpoint.path}</code>
                    <span
                      className={
                        endpoint.status === "live"
                          ? "rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-medium text-accent"
                          : "rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground/50"
                      }
                    >
                      {endpoint.status === "live" ? "Live" : "Planned"}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/60">{endpoint.description}</p>
                  {endpoint.status === "live" && (
                    <>
                      {endpoint.auth && <p className="text-xs text-foreground/40">Auth: {endpoint.auth}</p>}
                      {endpoint.response && <p className="text-xs text-foreground/40">Response: {endpoint.response}</p>}
                    </>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
    </Shell>
  );
}
