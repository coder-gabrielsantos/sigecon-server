const express = require("express");
const {
  importFromExtract,
  getContracts,
  getContract
} = require("../controllers/contractController");
// const auth = require("../middleware/authMiddleware"); // ativa depois

const router = express.Router();

// Lista contratos
router.get("/", /* auth, */ getContracts);

// Importa contrato a partir do resultado do extractor
router.post("/import", /* auth, */ importFromExtract);

// Detalhe de um contrato
router.get("/:id", /* auth, */ getContract);

module.exports = router;
