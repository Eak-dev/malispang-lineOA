declare module "cloudflare:workers" {
  interface ProvidedEnv extends Env {
    readonly __testBrand?: never;
  }
}
