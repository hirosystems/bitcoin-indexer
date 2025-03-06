// ts-unused-exports:disable-next-line
export default (): void => {
  process.env.API_HOST = '0.0.0.0';
  process.env.API_PORT = '3000';
  process.env.ORDINALS_PGHOST = '127.0.0.1';
  process.env.ORDINALS_PGPORT = '5432';
  process.env.ORDINALS_PGUSER = 'postgres';
  process.env.ORDINALS_PGPASSWORD = 'postgres';
  process.env.ORDINALS_PGDATABASE = 'postgres';
  process.env.ORDINALS_SCHEMA = 'public';
  process.env.BRC20_PGHOST = '127.0.0.1';
  process.env.BRC20_PGPORT = '5432';
  process.env.BRC20_PGUSER = 'postgres';
  process.env.BRC20_PGPASSWORD = 'postgres';
  process.env.BRC20_PGDATABASE = 'postgres';
  process.env.BRC20_SCHEMA = 'public';
};
