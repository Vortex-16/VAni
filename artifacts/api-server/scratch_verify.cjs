require('dotenv').config({path: '../../.env'});
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect().then(() => {
  return client.query("UPDATE users SET is_email_verified = true WHERE email = 'caregiver@doc.in'");
}).then(res => {
  console.log('Updated rows:', res.rowCount);
  process.exit(0);
}).catch(e => {
  console.error(e);
  process.exit(1);
});
