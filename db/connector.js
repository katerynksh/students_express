import dotenv from 'dotenv';
dotenv.config();
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: {
        rejectUnauthorized: false
    }
});

const createTableQueries = [];
createTableQueries.push(`
    CREATE TABLE IF NOT EXISTS heroes (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,              
        primary_attribute TEXT,        
        role TEXT,       
        attack_type TEXT,          
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
  `);

createTableQueries.push(`
 CREATE TABLE IF NOT EXISTS deadSpace (
    id SERIAL PRIMARY KEY,
    name_of_gun TEXT NOT NULL UNIQUE,
    damage_type TEXT NOT NULL,
    damage_dealth TEXT NOT NULL,
    reload_seconds TEXT NOT NULL,           
    additional_info TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP    
   );
  `);
createTableQueries.push(`
        CREATE TABLE IF NOT EXISTS cars (
        id SERIAL PRIMARY KEY,
        car_brand TEXT NOT NULL,
        car_model TEXT NOT NULL,
        engine_type TEXT NOT NULL,
        horsepower TEXT NOT NULL,
        weight TEXT,
        acceleration_0_to_100 TEXT,
        price TEXT, 
        is_available BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
        `);
createTableQueries.push(`
 CREATE TABLE IF NOT EXISTS desperate_housewives_1 (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL,
    password_hash TEXT NOT NULL,                       
    season TEXT NOT NULL,
    reason TEXT NOT NULL,  
    character_notes TEXT,             
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );
  `);  

createTableQueries.push(`
    CREATE TABLE IF NOT EXISTS accounts(
    id SERIAL PRIMARY KEY,
    user_name TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,           
    password TEXT NOT NULL,
    adding_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    `);
createTableQueries.push(`
 CREATE TABLE IF NOT EXISTS games_info (
    id SERIAL PRIMARY KEY,
    game_name TEXT NOT NULL,
    game_mode TEXT NOT NULL,      
    cost TEXT NOT NULL,   
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`);
   
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
