import pg from "pg";

const { Client } = pg;
const DATABASE_URL = 'postgresql://postgres.rzdfgbfyhnkvqbcegguk:fae.nhe.X2n3.1.2.3@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres';

async function migrate() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  console.log('Connected to Supabase PostgreSQL!');

  await client.query(`
    ALTER TABLE ad_accounts ADD COLUMN IF NOT EXISTS account_number text;
    ALTER TABLE ad_accounts ADD COLUMN IF NOT EXISTS phone text;
    ALTER TABLE ad_accounts ADD COLUMN IF NOT EXISTS business_address text;
    ALTER TABLE ad_accounts ADD COLUMN IF NOT EXISTS tin text;
    ALTER TABLE ad_accounts ADD COLUMN IF NOT EXISTS bin text;
  `);
  console.log('Added columns to ad_accounts table.');

  // Create unique constraint on account_number if not exists
  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ad_accounts_account_number_key'
      ) THEN
        ALTER TABLE ad_accounts ADD CONSTRAINT ad_accounts_account_number_key UNIQUE (account_number);
      END IF;
    END
    $$;
  `);

  // Fill existing rows without account_number with a random 16 digit number
  const { rows } = await client.query(`SELECT id FROM ad_accounts WHERE account_number IS NULL`);
  for (const row of rows) {
    const randomNum = (Math.floor(100000000000000 + Math.random() * 900000000000000)).toString() + Math.floor(Math.random() * 10);
    await client.query(`UPDATE ad_accounts SET account_number = $1 WHERE id = $2`, [randomNum, row.id]);
    console.log(`Generated account_number ${randomNum} for ad_account id ${row.id}`);
  }

  console.log('Migration completed successfully!');
  await client.end();
}

migrate().catch(console.error);
