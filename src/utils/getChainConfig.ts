export const SUPPORTED_NETWORKS: { name: string; chainId: number }[] = [
  { name: "Base Goerli", chainId: 84531 },
];

export const getChainConfig = (
  chainId: string | null
): {
  name: string;
  chainId: number;
  target: string;
  apiKey: string;
  rpcUrl: string;
} => {
  if (chainId === "84531") {
    return {
      name: "Base Goerli",
      apiKey: 'cktSjd5_IOUOlbx5Gw3uR2sj8YP2_td_1zbzGv2ZaD0_',
      chainId: 84531,
      target: "0xFeeBbED640df887bE1aD697EC3719EB7205323E9",
      rpcUrl: process.env.REACT_APP_BASEGOERLI_RPC_URL!,
    };
  } else {
    return {
      name: "Base Goerli",
      apiKey: 'cktSjd5_IOUOlbx5Gw3uR2sj8YP2_td_1zbzGv2ZaD0_',
      chainId: 84531,
      target: "0xFeeBbED640df887bE1aD697EC3719EB7205323E9",
      rpcUrl: process.env.REACT_APP_BASEGOERLI_RPC_URL!,
    };
  }
};
