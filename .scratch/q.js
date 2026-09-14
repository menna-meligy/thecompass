const { Client } = require('pg');
const fs = require('fs');
async function main() {
  const sql = process.argv[2] === '-f' ? fs.readFileSync(process.argv[3], 'utf8') : process.argv.slice(2).join(' ');
  const c = new Client({ host:'aws-1-eu-central-1.pooler.supabase.com', port:5432, user:'postgres.irinehjflompktssnbwa', password:'elbosla123.meme', database:'postgres', ssl:{rejectUnauthorized:false} });
  await c.connect();
  try {
    const res = await c.query(sql);
    const arr = Array.isArray(res) ? res : [res];
    for (const r of arr) {
      if (r.command === 'SELECT' || r.rows?.length) console.log(JSON.stringify(r.rows, null, 1));
      else console.log(`${r.command} ${r.rowCount ?? ''}`);
    }
  } catch (e) { console.error('SQL ERROR:', e.message); process.exitCode = 1; }
  await c.end();
}
main();
