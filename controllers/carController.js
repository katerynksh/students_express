import db from '../db/connector.js';

export async function createCar(carData) {
  const { car_brand, car_model, engine_type, horsepower, weight, acceleration_0_to_100, price, image_url } = carData;
  
  try {
    const query = `
      INSERT INTO cars (car_brand, car_model, engine_type, horsepower, weight, acceleration_0_to_100, price, image_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
      RETURNING *`;
      
    const res = await db.query(query, [
      car_brand, 
      car_model, 
      engine_type, 
      horsepower, 
      weight, 
      acceleration_0_to_100, 
      price, 
      image_url
    ]);
    
    console.log(`✓ Car added successfully: ${res.rows[0].car_brand} ${res.rows[0].car_model}`);
    return res.rows[0];
  } catch (err) {
    console.error('Error creating car:', err);
    throw err;
  }
}

export async function deleteCar(id) {
  try {
    const res = await db.query('DELETE FROM cars WHERE id = $1 RETURNING *', [id]);
    
    if (res.rows.length === 0) {
      throw new Error('Car not found');
    }

    console.log(`✓ The car ${res.rows[0].car_brand} ${res.rows[0].car_model} has been removed.`);
    return true;
  } catch (err) {
    console.error('Error deleting car:', err);
    throw err;
  }
}

export async function updateCar(id, updateData) {
  const fields = [];
  const values = [];
  let index = 1;
  for (const [key, value] of Object.entries(updateData)) {
    if (value !== undefined && value !== '') { 
      fields.push(`${key} = $${index}`);
      values.push(value);
      index++;
    }
  }

  if (fields.length === 0) {
    throw new Error('No data provided for update');
  }

  values.push(id);
  const query = `UPDATE cars SET ${fields.join(', ')} WHERE id = $${index} RETURNING *`;

  try {
    const updateRes = await db.query(query, values);
    
    if (updateRes.rows.length === 0) {
      throw new Error('Car not found');
    }
    
    console.log(`✓ Car updated: ${updateRes.rows[0].car_brand} ${updateRes.rows[0].car_model}`);
    return updateRes.rows[0];
  } catch (err) {
    console.error('Error updating car:', err);
    throw err;
  }
}

export function checkStringField(value, fieldName) {
  if (!value || value.trim().length < 2) {
    throw new Error(`The field '${fieldName}' is required and must contain at least 2 characters.`);
  }
}

export function checkPositiveNumber(value, fieldName) {
  const num = Number(value);
  if (isNaN(num) || num <= 0) {
    throw new Error(`The '${fieldName}' must be a positive number greater than 0.`);
  }
}

export function checkAcceleration(value) {
  const num = Number(value);
  if (isNaN(num) || num <= 0 || num > 30) {
    throw new Error("Acceleration 0-100 must be a realistic number (e.g., between 1 and 30 seconds).");
  }
}

export function validateCarData(carData) {
  if (carData.car_brand) checkStringField(carData.car_brand, 'Car Brand');
  if (carData.car_model) checkStringField(carData.car_model, 'Car Model');
  if (carData.engine_type) checkStringField(carData.engine_type, 'Engine Type');
  
  if (carData.horsepower) checkPositiveNumber(carData.horsepower, 'Horsepower');
  if (carData.weight) checkPositiveNumber(carData.weight, 'Weight');
  if (carData.price) checkPositiveNumber(carData.price, 'Price');
  
  if (carData.acceleration_0_to_100) checkAcceleration(carData.acceleration_0_to_100);
}
