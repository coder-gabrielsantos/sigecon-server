const express = require("express");
const {
  importFromExtract,
  createEmptyContractHandler,
  getContracts,
  getContract,
  updateContractHandler,
  deleteContractHandler,
  upsertContractItemHandler,
  deleteContractItemHandler,
} = require("../controllers/contractController");
const { requireAuth } = require("../middleware/auth"); // ⬅ middleware de auth

const router = express.Router();

// Todas as rotas de contratos exigem usuário autenticado
router.use(requireAuth);

router.get("/", getContracts);
router.post("/", createEmptyContractHandler);
router.post("/import", importFromExtract);

router.get("/:id", getContract);
router.put("/:id", updateContractHandler);
router.put("/:id/items", upsertContractItemHandler);

router.delete("/:id/items/:itemNo", deleteContractItemHandler);
router.delete("/:id", deleteContractHandler);

module.exports = router;