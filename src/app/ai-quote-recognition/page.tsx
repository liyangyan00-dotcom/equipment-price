import { redirect } from "next/navigation";

export default function AiQuoteRecognitionPage() {
  redirect("/ai-price-collection?mode=quote_upload");
}
