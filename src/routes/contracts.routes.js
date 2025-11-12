const express = require("express");
const {
  importFromExtract,
  getContracts,
  getContract,
  updateContractHandler,
  deleteContractHandler,
} = require("../controllers/contractController");

const router = express.Router();

router.get("/", getContracts);
router.post("/import", importFromExtract);
router.get("/:id", getContract);
router.put("/:id", updateContractHandler);
router.delete("/:id", deleteContractHandler);

module.exports = router;
