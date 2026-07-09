export * from "./generated/api";
export * from "./generated/types";
// Disambiguate names exported by both ./generated/api (zod query-param schemas)
// and ./generated/types (path-param TS types) for path+query endpoints.
// The server validates query params at runtime, so the zod schemas win.
export {
  GetGroupPostsParams,
  GetPagePostsParams,
  GetUserPostsParams,
  GetUserFriendsParams,
  ListCommentsParams,
  ListMessagesParams,
  GetAdAccountInsightsParams,
  GetAdAccountInsightsQueryParams,
  ListAdAccountConversionsParams,
  ListAdAccountConversionsQueryParams,
  GetHashtagPostsParams,
  GetHashtagPostsQueryParams,
} from "./generated/api";
