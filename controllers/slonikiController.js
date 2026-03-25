import db from '../db/connector.js';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;
export async function registerSlonik(username, password, age, place_of_birth) {
  try {
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const query = `
      INSERT INTO sloniki (username, password_hash, age, place_of_birth)
      VALUES ($1, $2, $3, $4) 
      RETURNING *`;
    const res = await db.query(query, [username, hash, age, place_of_birth]);
    
    console.log(`✓ Slonik registered successfully: @${res.rows[0].username}`);
    return res.rows[0];
  } catch (err) {
    console.error(err);
    throw err;
  }
}

export async function deleteSlonik(username, password) {
  const res = await db.query('SELECT * FROM sloniki WHERE username = $1', [username]);
  if (res.rows.length === 0) {
    throw new Error('No slonik found');
  }

  const slonik = res.rows[0];
  const isMatch = await bcrypt.compare(password, slonik.password_hash);
  
  if (isMatch) {
    await db.query('DELETE FROM sloniki WHERE username = $1', [username]);
    console.log(`✓ The slonik @${username} has been removed.`);
    return true;
  } else {
    throw new Error('Invalid password');
  }
}

export async function updateSlonik(currentUsername, password, updateData) {
  const res = await db.query('SELECT * FROM sloniki WHERE username = $1', [currentUsername]);
  if (res.rows.length === 0) {
    throw new Error('Slonik not found');
  }

  const slonik = res.rows[0];
  const isMatch = await bcrypt.compare(password, slonik.password_hash);
  
  if (!isMatch) {
    throw new Error('Invalid password');
  }

  const fields = [];
  const values = [];
  let index = 1;

  // перебираємо поля, які треба змінити і не оновлюємо пусті
  for (const [key, value] of Object.entries(updateData)) {
    if (value && key !== 'password') { 
      fields.push(`${key} = $${index}`);
      values.push(value);
      index++;
    }
  }

  if (fields.length === 0) {
    throw new Error('No data provided for update');
  }

  values.push(currentUsername);
  const query = `UPDATE sloniki SET ${fields.join(', ')} WHERE username = $${index} RETURNING *`;

  const updateRes = await db.query(query, values);
  return updateRes.rows[0];
}