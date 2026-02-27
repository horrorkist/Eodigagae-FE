import { redirect } from "next/navigation";

export default function SearchPage() {
  redirect("/?search=1&focus=1");
}
