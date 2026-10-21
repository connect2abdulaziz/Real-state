import { ConversationFlow } from "@/components/valuation/ConversationFlow";
import { getMarketingLocale } from "@/data/content/getMarketingLocale";

export default function ValuationPage() {
  const initialLocale = getMarketingLocale();
  return <ConversationFlow initialLocale={initialLocale} />;
}
