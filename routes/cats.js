import express from "express";
const router = express.Router();
import db from "../db/connector.js";

// Відображення списку котиків
router.get("/", async function (req, res, next) {
  try {
    const cats = await db.query("SELECT * FROM cats ORDER BY id ASC");

    const modCats = cats.rows.map((c) => {
      return {
        ...c,
        created_at: c.created_at.toLocaleDateString(),
      };
    });
    res.render("cats", { cats: modCats || [] });
  } catch (err) {
    console.log("Error loading cats:", err);
    res.status(503).send("Error loading cats list");
  }
});

// Форма додавання нового котика
router.get("/add", (req, res) => {
  res.render("forms/cats_form");
});

// Обробка додавання нового котика
router.post("/add", async (req, res) => {
  try {
    const {
      cat_name,
      breed,
      age,
      weight,
      favorite_food,   
      microchip,
      owner_contact,
      character_notes,
    } = req.body;


    const hasMicrochip = req.body.microchip === 'true';

    const query = `
    INSERT INTO cats (name, breed, age_years, weight_kg, favorite_food,  has_microchip, owner_contact, character_notes)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;

    await db.query(query, [
      cat_name || "Unknown",
      breed || "Unknown",
      age ? parseInt(age) : 0,
      weight ? parseFloat(weight) : null,,
      favorite_food,
      hasMicrochip,
      owner_contact,
      character_notes,
    ]);

    res.redirect("/cats");
  } catch (err) {
    console.error("DATABASE ERROR:", err.message);
    res.status(400).send("Database Error: " + err.message);
  }
});

// Видалення котика(по id)
router.get("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("DELETE FROM cats WHERE id = $1", [id]);
    res.redirect("/cats");
  } catch (err) {
    console.error("Delete error:", err);
    res.status(404).send("Could not delete cat");
  }
});

// Форма редагування (отримуємо дані існуючого кота)
router.get("/edit/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query("SELECT * FROM cats WHERE id = $1", [id]);
    if (result.rows.length === 0) {
      return res.status(404).send("Cat not found");
    }

    const cat = result.rows[0];
    res.render("forms/cats_form", {
      cat,
      isEdit: true,
    });
  } catch (err) {
    console.error("Edit form error:", err);
    res.status(404).send("Error loading edit form");
  }
});

//Обробка оновлення
router.post("/update/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      cat_name, breed, age, weight, favorite_food, microchip, owner_contact, character_notes
    } = req.body;
    
    const hasMicrochip = req.body.microchip === 'true';
    const query = `
    UPDATE cats
    SET name = $1, breed = $2, age_years = $3, weight_kg = $4,  favorite_food = $5,
    has_microchip = $6, owner_contact = $7, character_notes =$8
    WHERE id = $9
    `;

    await db.query(query, [
      cat_name, 
      breed, 
      age ? parseInt(age) : 0,
      weight ? parseFloat(weight) : null,
      favorite_food,
      hasMicrochip, 
      owner_contact, 
      character_notes, 
      id
    ]);
    res.redirect("/cats");
  } catch (err) {
    console.error("Update error:", err);
    res.status(400).send("Error updating cat data");
  }
});

export default router;