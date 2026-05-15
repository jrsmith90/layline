import { redirect } from "next/navigation";

export default function RaceTrackerRedirectPage() {
  redirect("/race/live");
}
