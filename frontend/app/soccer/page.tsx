import { redirect } from "next/navigation";
export default function LegacySoccer() {
  redirect("/compete?section=teams&sport=Soccer");
}
