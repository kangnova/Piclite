/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Token beacon Cloudflare Web Analytics (opsional) */
  readonly VITE_CF_BEACON_TOKEN?: string;
  /** Measurement ID Google Analytics 4, format G-XXXXXXX (opsional) */
  readonly VITE_GA_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
