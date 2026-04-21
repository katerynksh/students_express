import express from 'express';
const router = express.Router();
import db from '../db/connector.js';

const regexBarcode = /^([0-9]{8,13})$/
const regexName = /^([A-ZА-Я][a-zа-я0-9\s]{3,20})$/
const regexPrice = /^([0-9][0-9]*)$/
const regexQuantity = /^[0-9]+$/

router.get('/', async function(req, res, next) {
  const product = await db.query('SELECT * FROM product');
  const rowProduct = product.rows.map(s => {
    return {
      ...s, 
      //created_at_date: s.created_at.toLocaleDateString()
    }
  })

  res.render('product', { product: rowProduct || [] });
});

router.get("/add", (req, res) => {
  res.render("forms/product_form", { 
    isEdit: false, 
    action: "/product/add"
  });
});

router.post("/add", async (req, res) => {
  try {
    const id = req.params.id;
    const barcode =req.body.barcode;
    const name = req.body.name;
    const price = req.body.price;
    const quantity = req.body.quantity

    if(!regexBarcode.test(barcode)) {
    return res.status(400).send("Invalid product barcode you can use only numbers, min 8, max 13");
}
    if(!regexName.test(name)) {
    return res.status(400).send("Invalid product name you can use only letters, numbers and spaces and it should start with capital letter or number / only english and ukraine letters");
}
    if(!regexPrice.test(price)) {
    return res.status(400).send("Invalid product price you can use only numbers and must be $ at the end");
}
    if(!regexQuantity.test(quantity)) {
    return res.status(400).send("Invalid product quantity you can use only numbers");
}

    const query = `
      INSERT INTO product (barcode, name, price, quantity)
      VALUES ($1, $2, $3, $4)
    `;
    const values = [id, barcode, name, price, quantity];

    await db.query(query, [
      barcode || "Unknown",
      name || "Unknown",
      price || "Unknown",
      quantity || "Unknown"
    ]);
    res.redirect("/product"); 
  } catch (err) {
    console.error("DATABASE ERROR:", err.message);
    res.status(500).send("Database Error: " + err.message);
  }
});

router.get("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("DELETE FROM product WHERE id = $1", [id]);
    res.redirect("/product");
  } catch (err) {
    res.status(500).send("Could not delete product"); 
  }
});

router.get("/edit/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query("SELECT * FROM product WHERE id = $1", [id]);
    if (result.rows.length === 0) return res.status(400).send("Product not found");

    const product = result.rows[0];
    res.render("forms/product_form", { 
      product, 
      isEdit: true,
      action: `/product/update/${id}` 
    });
  } catch (err) {
    res.status(500).send("Error loading edit form");
  }
});

router.post("/update/:id", async (req, res) => {
  try {

    const id = req.params.id;
    const barcode =req.body.barcode;
    const name = req.body.name;
    const price = req.body.price;
    const quantity = req.body.quantity

    if(!regexBarcode.test(barcode)) {
    return res.status(400).send("Invalid product barcode you can use only numbers, min 8, max 13");
}
    if(!regexName.test(name)) {
    return res.status(400).send("Invalid product name you can use only letters, numbers and spaces and it should start with capital letter or number / only english and ukraine letters");
}
    if(!regexPrice.test(price)) {
    return res.status(400).send("Invalid product price you can use only numbers and must be $ at the end");
}
    if(!regexQuantity.test(quantity)) {
    return res.status(400).send("Invalid product quantity you can use only numbers");
}

    const query = `
      UPDATE product
      SET barcode = $1, name = $2, price = $3, quantity = $4
      WHERE id = $5
    `;

    await db.query(query, [barcode, name, price, quantity, id]);
    res.redirect("/product");
  } catch (err) {
    res.status(500).send("Error updating product data");
  }
});

export default router;