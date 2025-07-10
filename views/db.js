const { Pool } = require('pg');
const pool = new pool({
  user: 'postgres',
  host: 'localhost',
  database: 'blogsy',
  password: 'Vistara@123', // replace with your PostgreSQL password
  port: 5432,
});
module.exports = pool;