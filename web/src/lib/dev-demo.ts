/** Demo-login API and in-app shortcuts are enabled only in local `next dev`. */
export function isDevDemoAuth(): boolean {
  return process.env.NODE_ENV === "development";
}
