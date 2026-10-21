/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** .env 中的静态变量 */
  readonly VITE_HELLO: string
  /** 由 .env.<mode> 提供，随 -m 参数切换 */
  readonly VITE_MODE_TEXT: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
