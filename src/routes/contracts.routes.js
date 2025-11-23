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

const router = express.Router();

router.get("/", getContracts);
router.post("/", createEmptyContractHandler);
router.post("/import", importFromExtract);

router.get("/:id", getContract);
router.put("/:id", updateContractHandler);
router.put("/:id/items", upsertContractItemHandler);

router.delete("/:id/items/:itemNo", deleteContractItemHandler);
router.delete("/:id", deleteContractHandler);

module.exports = router;
