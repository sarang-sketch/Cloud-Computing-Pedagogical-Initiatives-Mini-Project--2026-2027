import type { Metadata } from "next";
import { ResourceLibrary } from "@/components/resources/resource-library";

export const metadata: Metadata = { title: "Resources" };

export default function ResourcesPage() {
  return <ResourceLibrary />;
}
