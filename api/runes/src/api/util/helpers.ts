import BigNumber from 'bignumber.js';
import { DbBalance, DbItemWithRune, DbLedgerEntry, DbRuneWithChainTip } from '../../pg/types';
import { EtchingResponse, ActivityResponse, BalanceResponse } from '../schemas';

function divisibility(num: string | BigNumber, decimals: number): string {
  return new BigNumber(num).shiftedBy(-1 * decimals).toFixed(decimals);
}

export function parseEtchingResponse(rune: DbRuneWithChainTip): EtchingResponse {
  let mintable = true;
  const minted = rune.minted == null ? '0' : rune.minted;
  const total_mints = rune.total_mints == null ? '0' : rune.total_mints;
  const burned = rune.burned == null ? '0' : rune.burned;
  const total_burns = rune.total_burns == null ? '0' : rune.total_burns;
  if (
    rune.terms_amount == null ||
    rune.cenotaph ||
    (rune.terms_cap && BigNumber(total_mints).gte(rune.terms_cap)) ||
    (rune.terms_height_start && BigNumber(rune.chain_tip).lt(rune.terms_height_start)) ||
    (rune.terms_height_end && BigNumber(rune.chain_tip).gt(rune.terms_height_end)) ||
    (rune.terms_offset_start &&
      BigNumber(rune.chain_tip).lt(BigNumber(rune.block_height).plus(rune.terms_offset_start))) ||
    (rune.terms_offset_end &&
      BigNumber(rune.chain_tip).gt(BigNumber(rune.block_height).plus(rune.terms_offset_end)))
  ) {
    mintable = false;
  }
  return {
    id: rune.id,
    number: rune.number,
    name: rune.name,
    spaced_name: rune.spaced_name,
    divisibility: rune.divisibility,
    symbol: rune.symbol,
    mint_terms: {
      amount: rune.terms_amount ? divisibility(rune.terms_amount, rune.divisibility) : null,
      cap: rune.terms_cap ? divisibility(rune.terms_cap, rune.divisibility) : null,
      height_start: rune.terms_height_start ? parseInt(rune.terms_height_start) : null,
      height_end: rune.terms_height_end ? parseInt(rune.terms_height_end) : null,
      offset_start: rune.terms_offset_start ? parseInt(rune.terms_offset_start) : null,
      offset_end: rune.terms_offset_end ? parseInt(rune.terms_offset_end) : null,
    },
    supply: {
      premine: divisibility(rune.premine, rune.divisibility),
      current: divisibility(BigNumber(minted).plus(burned).plus(rune.premine), rune.divisibility),
      minted: divisibility(minted, rune.divisibility),
      total_mints,
      burned: divisibility(burned, rune.divisibility),
      total_burns,
      mint_percentage:
        rune.terms_cap != null && rune.terms_cap != '0'
          ? BigNumber(total_mints).div(rune.terms_cap).times(100).toFixed(4)
          : '0.0000',
      mintable,
    },
    turbo: rune.turbo,
    location: {
      block_hash: rune.block_hash,
      block_height: parseInt(rune.block_height),
      tx_index: rune.tx_index,
      tx_id: rune.tx_id,
      timestamp: rune.timestamp,
    },
  };
}

export function parseActivityResponse(entry: DbItemWithRune<DbLedgerEntry>): ActivityResponse {
  return {
    rune: {
      id: entry.rune_id,
      number: entry.number,
      name: entry.name,
      spaced_name: entry.spaced_name,
    },
    operation: entry.operation,
    address: entry.address ?? undefined,
    receiver_address: entry.receiver_address ?? undefined,
    amount: entry.amount ? divisibility(entry.amount, entry.divisibility) : undefined,
    location: {
      block_hash: entry.block_hash,
      block_height: parseInt(entry.block_height),
      tx_index: entry.tx_index,
      tx_id: entry.tx_id,
      vout: entry.output ?? undefined,
      output: entry.output ? `${entry.tx_id}:${entry.output}` : undefined,
      timestamp: entry.timestamp,
    },
  };
}

export function parseBalanceResponse(item: DbItemWithRune<DbBalance>): BalanceResponse {
  return {
    rune: {
      id: item.rune_id,
      number: item.number,
      name: item.name,
      spaced_name: item.spaced_name,
    },
    address: item.address,
    balance: divisibility(item.balance, item.divisibility),
  };
}
