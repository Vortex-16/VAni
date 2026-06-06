import pg from 'pg';

const passwords = ['pass123'];
const user = 'postgres';
const host = 'localhost';
const port = 5432;

async function testConnections() {
  for (const password of passwords) {
    console.log(`Testing password: "${password}"...`);
    const client = new pg.Client({
      user,
      host,
      database: 'postgres',
      password,
      port,
    });
    try {
      await client.connect();
      console.log(`SUCCESS! Connected with password: "${password}"`);
      
      // Let's check if the discharge_buddy database exists
      const res = await client.query("SELECT 1 FROM pg_database WHERE datname='discharge_buddy'");
      if (res.rowCount === 0) {
        console.log("discharge_buddy database does not exist. Creating it...");
        await client.query("CREATE DATABASE discharge_buddy");
        console.log("Created database discharge_buddy successfully.");
      } else {
        console.log("discharge_buddy database already exists.");
      }
      
      await client.end();
      process.exit(0);
    } catch (err) {
      console.log(`Failed with password "${password}": ${err.message}`);
    }
  }
  console.log("Could not connect with password pass123.");
  process.exit(1);
}

testConnections();
