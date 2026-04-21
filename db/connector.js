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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

    );
  `);

createTableQueries.push(`
    CREATE TABLE IF NOT EXISTS street_food (
        id SERIAL PRIMARY KEY,
        food_name TEXT NOT NULL,
        country TEXT NOT NULL,
        spicy_level INTEGER CHECK (spicy_level BETWEEN 0 AND 10),
        price NUMERIC(6,2),
        rating INTEGER CHECK (rating BETWEEN 1 AND 10),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
`)
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
createTableQueries.push(`
    CREATE TABLE IF NOT EXISTS users_cats (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) NOT NULL,           
        email VARCHAR(255) UNIQUE NOT NULL,      
        password VARCHAR(255) NOT NULL,          
        created_at TIMESTAMP DEFAULT NOW(),     
        is_active BOOLEAN DEFAULT TRUE          
    );
      `);
    createTableQueries.push(`
  CREATE TABLE IF NOT EXISTS gotham_villains (
    id SERIAL PRIMARY KEY,
    villain_name TEXT NOT NULL,
    location TEXT,
    threat_level INTEGER,
    status TEXT,
    spotted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  `);
createTableQueries.push(`
    CREATE TABLE IF NOT EXISTS cats (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        breed VARCHAR(100),
        age_years INTEGER,
        weight_kg DECIMAL(5, 2),
        favorite_food VARCHAR(255),
        has_microchip BOOLEAN DEFAULT FALSE,
        owner_contact VARCHAR(255),
        character_notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
            
        user_id INTEGER NOT NULL,
        CONSTRAINT fk_user_cats
            FOREIGN KEY (user_id) 
            REFERENCES users_cats(id) 
            ON DELETE CASCADE
    );
`);

createTableQueries.push(`CREATE TABLE IF NOT EXISTS heroes_mlbb (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,              
    hero_class TEXT,        
    role TEXT,       
    attack_type TEXT,                                   
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

`);

createTableQueries.push(`
    CREATE TABLE IF NOT EXISTS notabug_bugs (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        severity TEXT NOT NULL DEFAULT 'medium',
        chaos_level INTEGER DEFAULT 20,
        status TEXT NOT NULL DEFAULT 'open',
        claimed_by TEXT,
        bounty INTEGER,
        steps_to_reproduce TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
`);
createTableQueries.push(`
    CREATE TABLE IF NOT EXISTS notabug_users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        email TEXT,
        sanity INTEGER DEFAULT 100,
        reputation INTEGER DEFAULT 0,
        balance INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        bugs_fixed INTEGER DEFAULT 0,
        bugs_failed INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
`);
createTableQueries.push(`
    CREATE TABLE IF NOT EXISTS notabug_mutations (
        id SERIAL PRIMARY KEY,
        bug_id INTEGER NOT NULL REFERENCES notabug_bugs(id) ON DELETE CASCADE,
        description TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
`);
createTableQueries.push(`
    CREATE TABLE IF NOT EXISTS notabug_feed (
        id SERIAL PRIMARY KEY,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
`);

for await (const query of createTableQueries) {
    try {
        console.log(query.slice(0, query.indexOf('(')).trim() + "...")
        await pool.query(query);
    } catch (err) {
        console.error("query execution error: ", err.message);
    }
}

console.log("CONNECTED!!!!!✅ ")
      
export default pool;
