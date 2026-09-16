declare namespace NodeJS {
  interface ProcessEnv {
    readonly ENVIO_API_TOKEN?: string;
    readonly ENVIO_KAIROS_POLICY_ADDRESS: string;
    readonly ENVIO_KAIROS_POLICY_START_BLOCK: string;
    readonly ENVIO_KAIROS_CRE_RECEIVER_ADDRESS?: string;
    readonly ENVIO_KAIROS_CRE_RECEIVER_START_BLOCK?: string;
  }
}
