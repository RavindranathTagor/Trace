// /home — the marketing landing, served at "/" via middleware rewrite.
// Why this exists: the CDN/build cache had pinned a stale prerender of "/" (it kept
// serving the dashboard). A brand-new route can never be stale, and the middleware
// rewrite makes "/" resolve here at runtime — so the landing always wins.
export { default } from "../page";
