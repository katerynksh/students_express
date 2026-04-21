import express from "express";
const router = express.Router();
import db from "../db/connector.js";

router.get("/", async function (req, res, next) {
  const account = await db.query("SELECT * FROM accounts");
  const rowAccounts = account.rows.map((a) => {
    return {
      ...a,
      adding_time: a.adding_time.toLocaleDateString(),
    };
  });

  res.render("accounts", { accounts: rowAccounts || [] });
});

// ADD
router.get("/createAccount", async function (req, res, next) {
  res.render("forms/accounts_form", {
    title: "Create Account",
    mode: "form",
    pageTitle: "Add New Account",
    action: "/accounts/createAccount",
    buttonText: "Create",
    item: {},
  });
});

router.post("/createAccount", async function (req, res, next) {
  console.log("Submitted data: ", req.body);

  const { email, user_name, password } = req.body;
  if (!email || !user_name || !password) {
    return res.render("forms/accounts_form", {
      title: "Create Account",
      mode: "form",
      pageTitle: "Add New Account",
      action: "/accounts/createAccount",
      buttonText: "Create",
      error:
        "Some of params are empty. Please, fill the whole form and try again.",
      item: { email, user_name, password },
    });
  }
  async function addAccount(email, user_name, password) {
    try {
      const query = `
      INSERT INTO accounts (email, user_name, password) 
      VALUES ($1, $2, $3) 
      RETURNING *`;
      const res = await db.query(query, [email, user_name, password]);
    } catch (err) {
      console.error(err);
      throw err;
    }
  }
  try {
    await addAccount(email, user_name, password);

    res.redirect("/accounts");
  } catch (err) {
    res.status(500).send("Adding error. Try again");
  }
});

//EDIT
router.get("/edit/:id", async function (req, res, next) {
  try {
    const result = await db.query("SELECT * FROM accounts WHERE id = $1", [
      req.params.id,
    ]);

    const item = result.rows[0];

    if (!item) {
      return res.status(404).render("error", {
        message: "account is not found",
        error: {},
      });
    }

    res.render("forms/accounts_form", {
      title: "Edit accounts",
      mode: "form",
      pageTitle: "Edit accounts",
      action: `/accounts/edit/${item.id}`,
      buttonText: "Save changes",
      item,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/edit/:id", async function (req, res, next) {
  try {
    const { email, user_name } = req.body;
    const { id } = req.params;

    if (!email || !user_name) {
      return res.render("forms/accounts_form", {
        title: "Edit accounts",
        mode: "form",
        pageTitle: "Edit accounts",
        error:
          "Some of params are empty. Please, fill the whole form and try again.",
        item: { id, email, user_name },
        buttonText: "Save changes",
        action: `/accounts/edit/${id}`,
      });
    }

    await db.query(
      `UPDATE accounts SET email = $1, user_name = $2 WHERE id = $3`,
      [email, user_name, id],
    );

    res.redirect("/accounts");
  } catch (err) {
    next(err);
  }
});

// DELETE
router.get("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("DELETE FROM accounts WHERE id = $1", [id]);
    res.redirect("/accounts");
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).send("Could not delete this account");
  }
});

export default router;
