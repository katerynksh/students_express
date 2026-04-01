import dotenv from 'dotenv';
dotenv.config();
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DB_URL,
});

//Add table creation
const createTableQueries = [];

createTableQueries.push(`
    CREATE TABLE IF NOT EXISTS heroes1 (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,              
    primary_attribute TEXT,        
    role TEXT,       
    attack_type TEXT,           
    difficulty INTEGER,                
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
   `);
createTableQueries.push(`
 CREATE TABLE IF NOT EXISTS sloniki (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    age TEXT NOT NULL,
    place_of_birth TEXT NOT NULL,           
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );
      `);
createTableQueries.push(`
    CREATE TABLE IF NOT EXISTS product (
    id SERIAL PRIMARY KEY,
    barcode TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    price INT,
    quantity INT
    );
    `)

for await (const query of createTableQueries) {
    try {
        console.log(query.slice(0, query.indexOf('(')).trim()+"...")
        await pool.query(query);
    } catch(err) {
        console.error("query execution error: ", err.message);
    }
}

console.log("CONNECTED!!!!!✅ ")
      
export default pool;