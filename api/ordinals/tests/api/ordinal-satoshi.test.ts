import { OrdinalSatoshi, SatoshiRarity } from '../../src/api/util/ordinal-satoshi';

describe('OrdinalSatoshi', () => {
  test('mythic sat', () => {
    const sat = new OrdinalSatoshi(0);
    expect(sat.rarity).toBe(SatoshiRarity.mythic);
    expect(sat.degree).toBe('0°0′0″0‴');
    expect(sat.decimal).toBe('0.0');
    expect(sat.cycle).toBe(0);
    expect(sat.epoch).toBe(0);
    expect(sat.name).toBe('nvtdijuwxlp');
    expect(sat.offset).toBe(0);
    expect(sat.percentile).toBe('0%');
    expect(sat.period).toBe(0);
    expect(sat.blockHeight).toBe(0);
  });

  test('legendary sat', () => {
    const sat = new OrdinalSatoshi(2067187500000000);
    expect(sat.rarity).toBe(SatoshiRarity.legendary);
    expect(sat.degree).toBe('1°0′0″0‴');
    expect(sat.decimal).toBe('1260000.0');
    expect(sat.cycle).toBe(1);
    expect(sat.epoch).toBe(6);
    expect(sat.name).toBe('fachfvytgb');
    expect(sat.offset).toBe(0);
    expect(sat.percentile).toBe('98.4375001082813%');
    expect(sat.period).toBe(625);
    expect(sat.blockHeight).toBe(1260000);
  });

  test('epic sat', () => {
    const sat = new OrdinalSatoshi(1050000000000000);
    expect(sat.rarity).toBe(SatoshiRarity.epic);
    expect(sat.degree).toBe('0°0′336″0‴');
    expect(sat.decimal).toBe('210000.0');
    expect(sat.cycle).toBe(0);
    expect(sat.epoch).toBe(1);
    expect(sat.name).toBe('gkjbdrhkfqf');
    expect(sat.offset).toBe(0);
    expect(sat.percentile).toBe('50.00000005500003%');
    expect(sat.period).toBe(104);
    expect(sat.blockHeight).toBe(210000);
  });

  test('rare sat', () => {
    const sat = new OrdinalSatoshi(10080000000000);
    expect(sat.rarity).toBe(SatoshiRarity.rare);
    expect(sat.degree).toBe('0°2016′0″0‴');
    expect(sat.decimal).toBe('2016.0');
    expect(sat.cycle).toBe(0);
    expect(sat.epoch).toBe(0);
    expect(sat.name).toBe('ntwwidfrzxh');
    expect(sat.offset).toBe(0);
    expect(sat.percentile).toBe('0.48000000052800024%');
    expect(sat.period).toBe(1);
    expect(sat.blockHeight).toBe(2016);
  });

  test('uncommon sat', () => {
    const sat = new OrdinalSatoshi(5000000000);
    expect(sat.rarity).toBe(SatoshiRarity.uncommon);
    expect(sat.degree).toBe('0°1′1″0‴');
    expect(sat.decimal).toBe('1.0');
    expect(sat.cycle).toBe(0);
    expect(sat.epoch).toBe(0);
    expect(sat.name).toBe('nvtcsezkbth');
    expect(sat.offset).toBe(0);
    expect(sat.percentile).toBe('0.00023809523835714296%');
    expect(sat.period).toBe(0);
    expect(sat.blockHeight).toBe(1);
  });

  test('common sat', () => {
    const sat = new OrdinalSatoshi(200);
    expect(sat.rarity).toBe(SatoshiRarity.common);
    expect(sat.degree).toBe('0°0′0″200‴');
    expect(sat.decimal).toBe('0.200');
    expect(sat.cycle).toBe(0);
    expect(sat.epoch).toBe(0);
    expect(sat.name).toBe('nvtdijuwxdx');
    expect(sat.offset).toBe(200);
    expect(sat.percentile).toBe('0.000000000009523809534285719%');
    expect(sat.period).toBe(0);
    expect(sat.blockHeight).toBe(0);
  });
});
