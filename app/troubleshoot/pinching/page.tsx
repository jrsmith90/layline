import { notFound } from "next/navigation";
import { TroubleshootGuidePage } from "@/components/troubleshoot/TroubleshootGuidePage";
import { getTroubleshootGuide } from "@/data/logic/troubleshootLogic";

export default function TroubleshootPinchingPage() {
  const guide = getTroubleshootGuide("pinching");
  if (!guide) notFound();
  return <TroubleshootGuidePage guide={guide} />;
}
