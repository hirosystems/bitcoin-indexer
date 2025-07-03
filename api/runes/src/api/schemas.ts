import { SwaggerOptions } from '@fastify/swagger';
import { Nullable, Optional, SERVER_VERSION } from '@hirosystems/api-toolkit';
import { Static, Type } from '@sinclair/typebox';
import { TypeCompiler } from '@sinclair/typebox/compiler';
import { ENV } from '../env';

export const OpenApiSchemaOptions: SwaggerOptions = {
  openapi: {
    info: {
      title: 'Runes API',
      description: `REST API to get information about Runes`,
      version: SERVER_VERSION.tag,
    },
    externalDocs: {
      url: 'https://github.com/hirosystems/runehook',
      description: 'Source Repository',
    },
    servers: [
      {
        url: 'https://api.hiro.so/',
        description: 'mainnet',
      },
    ],
    tags: [
      {
        name: 'Etchings',
        description: 'Rune etchings',
      },
      {
        name: 'Activity',
        description: 'Rune activity',
      },
      {
        name: 'Balances',
        description: 'Rune balances',
      },
      {
        name: 'Status',
        description: 'API status',
      },
    ],
  },
};

export const OffsetSchema = Type.Integer({
  minimum: 0,
  title: 'Offset',
  description: 'Result offset',
});
export type Offset = Static<typeof OffsetSchema>;

export const LimitSchema = Type.Integer({
  minimum: 1,
  maximum: ENV.API_RESULTS_MAX_LIMIT,
  title: 'Limit',
  description: 'Results per page',
});
export type Limit = Static<typeof LimitSchema>;

const RuneIdSchema = Type.RegEx(/^[0-9]+:[0-9]+$/, { title: 'Rune ID' });
const RuneNumberSchema = Type.RegEx(/^[0-9]+$/, { title: 'Rune number' });
export const RuneNumberSchemaCType = TypeCompiler.Compile(RuneNumberSchema);
const RuneNameSchema = Type.RegEx(/^[A-Z]+$/, { title: 'Rune name' });
export const RuneNameSchemaCType = TypeCompiler.Compile(RuneNameSchema);
const RuneSpacedNameSchema = Type.RegEx(/^[A-Za-z]+(•[A-Za-z]+)+$/, {
  title: 'Rune name with spacers',
});
export const RuneSpacedNameSchemaCType = TypeCompiler.Compile(RuneSpacedNameSchema);

export const RuneSchema = Type.Union([
  RuneIdSchema,
  RuneNumberSchema,
  RuneNameSchema,
  RuneSpacedNameSchema,
]);
export type Rune = Static<typeof RuneSchema>;

export const AddressSchema = Type.String({
  title: 'Address',
  description: 'Bitcoin address',
  examples: ['bc1p8aq8s3z9xl87e74twfk93mljxq6alv4a79yheadx33t9np4g2wkqqt8kc5'],
});
export type Address = Static<typeof AddressSchema>;

export const TransactionIdSchema = Type.RegEx(/^[a-fA-F0-9]{64}$/, {
  title: 'Transaction ID',
  description: 'A transaction ID',
  examples: ['8f46f0d4ef685e650727e6faf7e30f23b851a7709714ec774f7909b3fb5e604c'],
});
export type TransactionId = Static<typeof TransactionIdSchema>;

// const TransactionOutputSchema = Type.RegEx(/^[a-fA-F0-9]{64}:[0-9]+$/, {
//   title: 'Transaction Output',
//   description: 'A transaction output',
//   examples: ['8f46f0d4ef685e650727e6faf7e30f23b851a7709714ec774f7909b3fb5e604c:0'],
// });
// type TransactionOutput = Static<typeof TransactionOutputSchema>;

const BlockHeightSchema = Type.RegEx(/^[0-9]+$/, {
  title: 'Block Height',
  description: 'Bitcoin block height',
  examples: [777678],
});
export const BlockHeightCType = TypeCompiler.Compile(BlockHeightSchema);

const BlockHashSchema = Type.RegEx(/^[0]{8}[a-fA-F0-9]{56}$/, {
  title: 'Block Hash',
  description: 'Bitcoin block hash',
  examples: ['0000000000000000000452773967cdd62297137cdaf79950c5e8bb0c62075133'],
});
type BlockHash = Static<typeof BlockHashSchema>;

export const BlockSchema = Type.Union([BlockHeightSchema, BlockHashSchema]);
export type Block = Static<typeof BlockSchema>;

// ==========================
// Responses
// ==========================

export const ApiStatusResponse = Type.Object(
  {
    server_version: Type.String({ examples: [''] }),
    status: Type.String(),
    block_height: Optional(Type.Integer()),
  },
  { title: 'Api Status Response' }
);

const LocationDetailResponseSchema = Type.Object(
  {
    block_hash: Type.String({
      examples: ['00000000000000000000c9787573a1f1775a2b56b403a2d0c7957e9a5bc754bb'],
      title: 'Block hash',
      description: 'Bitcoin block hash',
    }),
    block_height: Type.Integer({
      examples: [840000],
      title: 'Block height',
      description: 'Bitcoin block height',
    }),
    tx_id: Type.String({
      examples: ['2bb85f4b004be6da54f766c17c1e855187327112c231ef2ff35ebad0ea67c69e'],
      title: 'Transaction ID',
      description: 'Bitcoin transaction ID',
    }),
    tx_index: Type.Integer({
      examples: [1],
      title: 'Transaction Index',
      description: 'Index of this transaction in its Bitcoin block',
    }),
    vout: Optional(
      Type.Integer({
        examples: [100],
        title: 'Output number',
        description: 'Bitcoin transaction output number',
      })
    ),
    output: Optional(
      Type.String({
        examples: ['2bb85f4b004be6da54f766c17c1e855187327112c231ef2ff35ebad0ea67c69e:100'],
        title: 'Transaction output',
        description: 'Bitcoin transaction output',
      })
    ),
    timestamp: Type.Integer({
      examples: [1713571767],
      title: 'Timestamp',
      description: 'Bitcoin transaction timestamp',
    }),
  },
  {
    title: 'Transaction location',
    description: 'Location of the transaction which confirmed this operation',
  }
);

const RuneIdResponseSchema = Type.String({
  title: 'ID',
  description: 'Rune ID',
  examples: ['840000:1'],
});

const RuneNameResponseSchema = Type.String({
  title: 'Name',
  description: 'Rune name',
  examples: ['ZZZZZFEHUZZZZZ'],
});

const RuneSpacedNameResponseSchema = Type.String({
  title: 'Spaced name',
  description: 'Rune name with spacers',
  examples: ['Z•Z•Z•Z•Z•FEHU•Z•Z•Z•Z•Z'],
});

const RuneNumberResponseSchema = Type.Integer({
  title: 'Number',
  description: 'Rune number',
  examples: [1],
});

export const EtchingResponseSchema = Type.Object({
  id: RuneIdResponseSchema,
  name: RuneNameResponseSchema,
  spaced_name: RuneSpacedNameResponseSchema,
  number: RuneNumberResponseSchema,
  divisibility: Type.Integer({
    title: 'Divisibility',
    description: 'Rune decimal places',
    examples: [2],
  }),
  symbol: Type.String({ title: 'Symbol', description: 'Rune symbol', examples: ['ᚠ'] }),
  turbo: Type.Boolean({ title: 'Turbo', description: 'Rune upgradeability', examples: [false] }),
  mint_terms: Type.Object(
    {
      amount: Nullable(
        Type.String({
          examples: ['100'],
          title: 'Mint amount',
          description: 'Amount awarded per mint',
        })
      ),
      cap: Nullable(
        Type.String({
          examples: ['1111111'],
          title: 'Mint cap',
          description: 'Maximum number of mints allowed',
        })
      ),
      height_start: Nullable(
        Type.Integer({
          examples: [840000],
          title: 'Mint block height start',
          description: 'Block height at which the mint period opens',
        })
      ),
      height_end: Nullable(
        Type.Integer({
          examples: [1050000],
          title: 'Mint block height end',
          description: 'Block height at which the mint period closes',
        })
      ),
      offset_start: Nullable(
        Type.Integer({
          examples: [0],
          title: 'Mint block height offset start',
          description: 'Block height etching offset at which the mint period opens',
        })
      ),
      offset_end: Nullable(
        Type.Integer({
          examples: [200],
          title: 'Mint block height offset end',
          description: 'Block height etching offset at which the mint period closes',
        })
      ),
    },
    { title: 'Mint terms', description: 'Rune mint terms' }
  ),
  supply: Type.Object(
    {
      current: Type.String({
        examples: ['11274916350'],
        title: 'Current supply',
        description: 'Circulating supply including mints, burns and premine',
      }),
      minted: Type.String({
        examples: ['274916100'],
        title: 'Minted amount',
        description: 'Total minted amount',
      }),
      total_mints: Type.String({
        examples: ['250'],
        title: 'Total mints',
        description: 'Number of mints for this rune',
      }),
      mint_percentage: Type.String({
        examples: ['59.4567'],
        title: 'Mint percentage',
        description: 'Percentage of mints that have been claimed',
      }),
      mintable: Type.Boolean({
        title: 'Mintable',
        description: 'Whether or not this rune is mintable at this time',
      }),
      burned: Type.String({
        examples: ['5100'],
        title: 'Burned amount',
        description: 'Total burned amount',
      }),
      total_burns: Type.String({
        examples: ['17'],
        title: 'Total burns',
        description: 'Number of burns for this rune',
      }),
      premine: Type.String({
        examples: ['11000000000'],
        title: 'Premine amount',
        description: 'Amount premined for this rune',
      }),
    },
    { title: 'Supply information', description: 'Rune supply information' }
  ),
  location: LocationDetailResponseSchema,
});
export type EtchingResponse = Static<typeof EtchingResponseSchema>;

const RuneDetailResponseSchema = Type.Object({
  rune: Type.Object(
    {
      id: RuneIdResponseSchema,
      number: RuneNumberResponseSchema,
      name: RuneNameResponseSchema,
      spaced_name: RuneSpacedNameResponseSchema,
    },
    { title: 'Rune detail', description: 'Details of the rune affected by this activity' }
  ),
});

export const SimpleActivityResponseSchema = Type.Object({
  address: Optional(
    Type.String({
      examples: ['bc1q7jd477wc5s88hsvenr0ddtatsw282hfjzg59wz'],
      title: 'Address',
      description: 'Bitcoin address which initiated this activity',
    })
  ),
  receiver_address: Optional(
    Type.String({
      examples: ['bc1pgdrveee2v4ez95szaakw5gkd8eennv2dddf9rjdrlt6ch56lzrrsxgvazt'],
      title: 'Receiver address',
      description: 'Bitcoin address which is receiving rune balance',
    })
  ),
  amount: Optional(
    Type.String({
      examples: ['11000000000'],
      title: 'Amount',
      description: 'Rune amount relevat to this activity',
    })
  ),
  operation: Type.Union(
    [
      Type.Literal('etching'),
      Type.Literal('mint'),
      Type.Literal('burn'),
      Type.Literal('send'),
      Type.Literal('receive'),
    ],
    { title: 'Operation', description: 'Type of operation described in this activity' }
  ),
  location: LocationDetailResponseSchema,
});

export const ActivityResponseSchema = Type.Intersect([
  RuneDetailResponseSchema,
  SimpleActivityResponseSchema,
]);
export type ActivityResponse = Static<typeof ActivityResponseSchema>;

export const SimpleBalanceResponseSchema = Type.Object({
  address: Optional(
    Type.String({
      examples: ['bc1q7jd477wc5s88hsvenr0ddtatsw282hfjzg59wz'],
      title: 'Address',
      description: 'Bitcoin address which holds this balance',
    })
  ),
  balance: Type.String({
    examples: ['11000000000'],
    title: 'Balance',
    description: 'Rune balance',
  }),
});

export const BalanceResponseSchema = Type.Intersect([
  RuneDetailResponseSchema,
  SimpleBalanceResponseSchema,
]);
export type BalanceResponse = Static<typeof BalanceResponseSchema>;

export const NotFoundResponse = Type.Object(
  {
    error: Type.Literal('Not found'),
  },
  { title: 'Not Found Response' }
);
