import { Redirect } from "expo-router";

/**
 * In-app chat threads have moved to the dedicated HiMewo Chat app. Any direct
 * link to a conversation in the main app now lands on the chat-app promo.
 */
export default function MessageThreadRedirect() {
  return <Redirect href="/messages" />;
}
