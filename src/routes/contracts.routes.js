const express = require("express");
const {
  importFromExtract,
  getContracts,
  getContract,
  updateContractHandler,
  deleteContractHandler,
  upsertContractItemHandler,
} = require("../controllers/contractController");

const router = express.Router();

router.get("/", getContracts);
router.post("/import", importFromExtract);
router.get("/:id", getContract);
router.put("/:id", updateContractHandler);
router.put("/:id/items", upsertContractItemHandler);
router.delete("/:id", deleteContractHandler);

module.exports = router;
