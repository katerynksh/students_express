import db from '../db/connector.js';

// ─── Car Model 

class Car {
  car_brand;
  car_model;
  engine_type;
  horsepower;
  weight;
  acceleration_0_to_100;
  price;
  image_url;

  constructor({ car_brand, car_model, engine_type, horsepower, weight, acceleration_0_to_100, price, image_url }) {
    this.car_brand = car_brand;
    this.car_model = car_model;
    this.engine_type = engine_type;
    this.horsepower = horsepower;
    this.weight = weight;
    this.acceleration_0_to_100 = acceleration_0_to_100;
    this.price = price;
    this.image_url = image_url;
  }

  toJSON() {
    return {
      car_brand: this.car_brand,
      car_model: this.car_model,
      engine_type: this.engine_type,
      horsepower: this.horsepower,
      weight: this.weight,
      acceleration_0_to_100: this.acceleration_0_to_100,
      price: this.price,
      image_url: this.image_url,
    };
  }
}

// ─── Validator
export class CarValidator {
  car;

  constructor(carData) {
    this.car = carData;
  }

  checkStringField(value, fieldName) {
    if (!value || value.trim().length < 2) {
      throw new Error(`Поле '${fieldName}' є обов'язковим і має містити принаймні 2 символи.`);
    }
  }

  checkPositiveNumber(value, fieldName) {
    const num = Number(value);
    if (isNaN(num) || num <= 0) {
      throw new Error(`Поле '${fieldName}' має бути додатнім і більше нуля.`);
    }
  }

  checkAcceleration(value) {
    const num = Number(value);
    if (isNaN(num) || num <= 0 || num > 30) {
      throw new Error("Прискорення від 0 до 100 має бути реалістичним значенням (між 1 та 30 секундами).");
    }
  }

  validate() {
    const { car_brand, car_model, engine_type, horsepower, weight, price, acceleration_0_to_100 } = this.car;

    if (car_brand)              this.checkStringField(car_brand, 'Марка авто');
    if (car_model)              this.checkStringField(car_model, 'Модель авто');
    if (engine_type)            this.checkStringField(engine_type, 'Тип двигуна');
    if (horsepower)             this.checkPositiveNumber(horsepower, 'Кінські сили');
    if (weight)                 this.checkPositiveNumber(weight, 'Вага');
    if (price)                  this.checkPositiveNumber(price, 'Ціна');
    if (acceleration_0_to_100)  this.checkAcceleration(acceleration_0_to_100);
  }
}

// ─── Service 
export class CarService {
  car;

  constructor(carData) {
    this.car = new Car(carData);
  }

  async create() {
    const { car_brand, car_model, engine_type, horsepower, weight, acceleration_0_to_100, price, image_url } = this.car;

    try {
      const query = `
        INSERT INTO cars (car_brand, car_model, engine_type, horsepower, weight, acceleration_0_to_100, price, image_url)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`;

      const res = await db.query(query, [
        car_brand, car_model, engine_type, horsepower,
        weight, acceleration_0_to_100, price, image_url
      ]);

      console.log(`✓ Автомобіль додано: ${res.rows[0].car_brand} ${res.rows[0].car_model}`);
      return res.rows[0];
    } catch (err) {
      console.error('Помилка створення автомобіля:', err);
      throw err;
    }
  }

  async update(id) {
    const fields = [];
    const values = [];
    let index = 1;

    for (const [key, value] of Object.entries(this.car.toJSON())) {
      if (value !== undefined && value !== '') {
        fields.push(`${key} = $${index}`);
        values.push(value);
        index++;
      }
    }

    if (fields.length === 0) throw new Error('Немає даних для оновлення');

    values.push(id);
    const query = `UPDATE cars SET ${fields.join(', ')} WHERE id = $${index} RETURNING *`;

    try {
      const res = await db.query(query, values);
      if (res.rows.length === 0) throw new Error('Автомобіль не оновлено');

      console.log(`✓ Автомобіль оновлено: ${res.rows[0].car_brand} ${res.rows[0].car_model}`);
      return res.rows[0];
    } catch (err) {
      console.error('Помилка оновлення автомобіля:', err);
      throw err;
    }
  }

  static async delete(id) {
    try {
      const res = await db.query('DELETE FROM cars WHERE id = $1 RETURNING *', [id]);
      if (res.rows.length === 0) throw new Error('Автомобіль не знайдено');

      console.log(`✓ Автомобіль ${res.rows[0].car_brand} ${res.rows[0].car_model} був видалений.`);
      return true;
    } catch (err) {
      console.error('Помилка видалення авто:', err);
      throw err;
    }
  }
}
