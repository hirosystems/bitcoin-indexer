export type DbPaginatedResult<T> = {
  total: number;
  results: T[];
};

export type DbCountedQueryResult<T> = T & { total: number };

export type DbRune = {
  id: string;
  number: number;
  name: string;
  spaced_name: string;
  block_hash: string;
  block_height: string;
  tx_index: number;
  tx_id: string;
  divisibility: number;
  premine: string;
  symbol: string;
  cenotaph: boolean;
  terms_amount: string | null;
  terms_cap: string | null;
  terms_height_start: string | null;
  terms_height_end: string | null;
  terms_offset_start: string | null;
  terms_offset_end: string | null;
  turbo: boolean;
  minted: string | null;
  total_mints: string | null;
  burned: string | null;
  total_burns: string | null;
  total_operations: string | null;
  timestamp: number;
};

export type DbRuneWithChainTip = DbRune & { chain_tip: string };

export type DbLedgerOperation = 'etching' | 'mint' | 'burn' | 'send' | 'receive';

export type DbLedgerEntry = {
  rune_id: string;
  block_hash: string;
  block_height: string;
  tx_index: number;
  tx_id: string;
  output: number | null;
  address: string | null;
  receiver_address: string | null;
  amount: string | null;
  operation: DbLedgerOperation;
  timestamp: number;
};

export type DbItemWithRune<T> = T & {
  name: string;
  number: number;
  spaced_name: string;
  divisibility: number;
  total_operations: number;
};

export type DbBalance = {
  rune_id: string;
  address: string;
  balance: string;
  total_operations: number;
};
