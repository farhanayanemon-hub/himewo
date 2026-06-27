// Web / default entry: never imports the native Stream/WebRTC SDK, so the web
// bundle stays clean. This is also the module tsc resolves for `./CallEngine`.
export { default } from "./CallEngineFallback";
