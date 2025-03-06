// ts-unused-exports:disable-next-line
export default (): void => {
  process.env.API_HOST = '0.0.0.0';
  process.env.API_PORT = '3000';
  process.env.RUNES_PGHOST = '127.0.0.1';
  process.env.RUNES_PGPORT = '5432';
  process.env.RUNES_PGUSER = 'postgres';
  process.env.RUNES_PGPASSWORD = 'postgres';
  process.env.RUNES_PGDATABASE = 'postgres';
  process.env.RUNES_SCHEMA = 'public';
};
