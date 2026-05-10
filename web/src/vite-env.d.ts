/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_USDT_TRC20_ADDRESS?: string;
  readonly VITE_BTC_ADDRESS?: string;
  readonly VITE_ETH_ADDRESS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
