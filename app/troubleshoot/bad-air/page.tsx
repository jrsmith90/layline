import { notFound } from "next/navigation";
import { TroubleshootGuidePage } from "@/components/troubleshoot/TroubleshootGuidePage";
import { getTroubleshootGuide } from "@/data/logic/troubleshootLogic";

export default function TroubleshootBadAirPage() {
  const guide = getTroubleshootGuide("bad-air");
  if (!guide) notFound();
  return <TroubleshootGuidePage guide={guide} />;
}
