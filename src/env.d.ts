declare module "cloudflare:workers" {
  // Bindings from wrangler.jsonc.
  export const env: { HYPERDRIVE: { connectionString: string } };
}
