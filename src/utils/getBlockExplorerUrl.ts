export enum BlockExplorerDataType {
  Transaction = "tx",
  Address = "address",
}
export const getBlockExplorerUrl = (
  chainId: number,
  id: string,
  kind: BlockExplorerDataType = BlockExplorerDataType.Transaction
) => {
  const path = `${kind}/${id}`;
  switch (chainId) {
    case 84531:
      return `https://goerli.basescan.org/${path}`
    default:
      return null;
  }
};
