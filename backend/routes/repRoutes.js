const express = require("express");
const repRoutes = express.Router();
const { CalculateRep } = require("../controllers/RepController");

repRoutes.get("/:id", CalculateRep);

module.exports = repRoutes;
