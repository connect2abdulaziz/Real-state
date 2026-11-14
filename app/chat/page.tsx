import { ChatClient } from "@/components/chat/ChatClient";
import { getMarketingLocale } from "@/data/content/getMarketingLocale";

export const metadata = {
  title: "Ask Estate Valora",
  description:
    "ChatGPT-style real estate assistant grounded in Estate Valora comps.",
};

export default function ChatPage() {
  const locale = getMarketingLocale();
  return <ChatClient initialLocale={locale === "fr" ? "fr" : "en"} />;
}
