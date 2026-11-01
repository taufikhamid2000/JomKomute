import type { Metadata } from "next";
import { ApiDocsContent } from "./api-docs-content";

export const metadata: Metadata = { title: "API" };

export default function ApiDocsPage() {
  return <ApiDocsContent />;
}
