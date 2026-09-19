// Groups nearby same-category reports into a single map marker, so e.g.
// five separate "delay" reports at one station render as one pin with a
// "5" badge (see lib/report-categories.tsx's reportMarkerHtml) instead of
// five stacked icons. Shared by components/report-map.tsx (the full report
// page) and components/home-map.tsx (the home screen's route-corridor
// overlay) so both cluster the same way.

import { distanceMeters } from "@/lib/geo-distance";
import type { UserReport } from "@/lib/user-reports-client";

export type ReportCluster = {
  // The first report's id — stable across re-clusters as long as that
  // report stays in the cluster, which is all a Marker key needs.
  id: string;
  lat: number;
  lng: number;
  category: UserReport["category"];
  reports: UserReport[];
};

const CLUSTER_RADIUS_METERS = 60;

// Greedy single-pass clustering: each report joins the first existing
// cluster of the same category within CLUSTER_RADIUS_METERS (recentering
// that cluster on the running average), or starts a new one. Not an
// optimal/stable clustering algorithm — good enough for the report
// volumes this prototype sees, and cheap to reason about.
export function clusterReports(reports: UserReport[]): ReportCluster[] {
  const clusters: ReportCluster[] = [];

  for (const report of reports) {
    const existing = clusters.find(
      (c) =>
        c.category === report.category &&
        distanceMeters({ lat: c.lat, lng: c.lng }, { lat: report.lat, lng: report.lng }) <= CLUSTER_RADIUS_METERS,
    );

    if (existing) {
      existing.reports.push(report);
      existing.lat = existing.reports.reduce((sum, r) => sum + r.lat, 0) / existing.reports.length;
      existing.lng = existing.reports.reduce((sum, r) => sum + r.lng, 0) / existing.reports.length;
    } else {
      clusters.push({ id: report.id, lat: report.lat, lng: report.lng, category: report.category, reports: [report] });
    }
  }

  return clusters;
}
