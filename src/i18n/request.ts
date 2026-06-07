import { getRequestConfig } from "next-intl/server";
import { getUserLocale } from "./locale";

/**
 * Server-side i18n configuration consumed by next-intl. Locale comes from the
 * user's cookie (no URL prefix), so the existing route-group structure is
 * untouched. Messages are loaded from /messages/<locale>.json.
 */
export default getRequestConfig(async () => {
  const locale = await getUserLocale();
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
