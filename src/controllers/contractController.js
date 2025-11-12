const {
  createContractFromExtract,
  listContracts,
  getContractById,
  updateContract,
  removeContract
} = require("../services/contractService");

/**
 * POST /contracts/import
 * Body esperado:
 * {
 *   fileName,
 *   columns,
 *   rows,
 *   soma_valor_total,
 *   soma_valor_unit,
 *   issues
 * }
 */
async function importFromExtract(req, res, next) {
  try {
    const { fileName, ...extractData } = req.body;

    if (!extractData || !Array.isArray(extractData.rows)) {
      return res
        .status(400)
        .json({ error: "Payload de extração inválido para importação." });
    }

    const contract = await createContractFromExtract(extractData, fileName);

    return res.status(201).json(contract);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /contracts
 */
async function getContracts(req, res, next) {
  try {
    const contracts = await listContracts();
    return res.json(contracts);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /contracts/:id
 */
async function getContract(req, res, next) {
  try {
    const { id } = req.params;
    const contract = await getContractById(id);

    if (!contract) {
      return res.status(404).json({ error: "Contrato não encontrado." });
    }

    return res.json(contract);
  } catch (err) {
    next(err);
  }
}

async function updateContractHandler(req, res, next) {
  try {
    const { id } = req.params;
    const updated = await updateContract(id, req.body);
    return res.json(updated);
  } catch (err) {
    next(err);
  }
}

async function deleteContractHandler(req, res, next) {
  try {
    const { id } = req.params;
    await removeContract(id);
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  importFromExtract,
  getContracts,
  getContract,
  updateContractHandler,
  deleteContractHandler
};
