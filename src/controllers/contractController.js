const {
  createContractFromExtract,
  createEmptyContract,
  listContracts,
  getContractById,
  updateContract,
  removeContract,
  upsertContractItem,
  deleteContractItem,
} = require("../services/contractService");

/**
 * Descobre qual é o "admin dono" para a requisição atual.
 * - Se usuário for ADMIN  -> ele mesmo
 * - Se for OPERADOR       -> adminId vinculado
 */
function getOwnerAdminId(req) {
  const { id, role, adminId } = req.user || {};

  if (!id || !role) {
    const err = new Error("Usuário não autenticado");
    err.status = 401;
    throw err;
  }

  if (role === "ADMIN") {
    return id;
  }

  if (role === "OPERADOR" && adminId) {
    return adminId;
  }

  const err = new Error("Usuário não está vinculado a um administrador");
  err.status = 403;
  throw err;
}

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
 *
 * Cria contrato a partir da extração e vincula ao admin "dono"
 */
async function importFromExtract(req, res, next) {
  try {
    const { fileName, ...extractData } = req.body;

    if (!extractData || !Array.isArray(extractData.rows)) {
      return res
        .status(400)
        .json({ error: "Payload de extração inválido para importação." });
    }

    const ownerAdminId = getOwnerAdminId(req);

    const contract = await createContractFromExtract(
      extractData,
      fileName,
      ownerAdminId
    );

    return res.status(201).json(contract);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /contracts
 * Cria um contrato "em branco" vinculado ao admin dono
 */
async function createEmptyContractHandler(req, res, next) {
  try {
    const ownerAdminId = getOwnerAdminId(req);

    const payload = {
      ...(req.body || {}),
      adminId: ownerAdminId,
    };

    const contract = await createEmptyContract(payload);
    return res.status(201).json(contract);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /contracts
 * Lista apenas contratos do admin dono
 */
async function getContracts(req, res, next) {
  try {
    const ownerAdminId = getOwnerAdminId(req);
    const contracts = await listContracts(ownerAdminId);
    return res.json(contracts);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /contracts/:id
 * Busca contrato do admin dono (admin ou operador vinculado)
 */
async function getContract(req, res, next) {
  try {
    const { id } = req.params;
    const ownerAdminId = getOwnerAdminId(req);

    const contract = await getContractById(id, ownerAdminId);

    if (!contract) {
      return res.status(404).json({ error: "Contrato não encontrado." });
    }

    return res.json(contract);
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /contracts/:id
 * - ADMIN pode atualizar todos os campos
 * - Não-admin só consegue enviar "quantity" (regra que você definiu)
 * Sempre respeitando o admin dono do contrato.
 */
async function updateContractHandler(req, res, next) {
  try {
    const { id } = req.params;
    const ownerAdminId = getOwnerAdminId(req);
    const isAdmin = req.user && req.user.role === "ADMIN";

    // Se não for admin -> só permitir alterar "quantity"
    if (!isAdmin) {
      const allowed = {};

      if (typeof req.body.quantity !== "undefined") {
        allowed.quantity = req.body.quantity;
      } else {
        return res.status(403).json({
          error:
            "Somente administradores podem atualizar outros campos além de 'quantidade'.",
        });
      }

      const updated = await updateContract(id, allowed, ownerAdminId);
      return res.json(updated);
    }

    // ADMIN -> pode atualizar tudo
    const updated = await updateContract(id, req.body, ownerAdminId);
    return res.json(updated);
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /contracts/:id
 * Remove contrato do admin dono
 */
async function deleteContractHandler(req, res, next) {
  try {
    const { id } = req.params;
    const ownerAdminId = getOwnerAdminId(req);

    await removeContract(id, ownerAdminId);
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /contracts/:id/items
 * Body:
 * {
 *   itemNo?,        // se presente, tenta atualizar esse item_no
 *   description?,
 *   unit?,
 *   quantity?,
 *   unitPrice?,
 *   totalPrice?     // opcional, normalmente o servidor recalcula o total
 * }
 *
 * Sempre garantindo que o contrato pertence ao admin dono.
 */
async function upsertContractItemHandler(req, res, next) {
  try {
    const { id } = req.params;
    const ownerAdminId = getOwnerAdminId(req);

    const updatedContract = await upsertContractItem(
      id,
      req.body || {},
      ownerAdminId
    );
    return res.json(updatedContract);
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /contracts/:id/items/:itemNo
 * Remove item do contrato do admin dono e retorna contrato atualizado.
 */
async function deleteContractItemHandler(req, res, next) {
  try {
    const { id, itemNo } = req.params;
    const ownerAdminId = getOwnerAdminId(req);

    const updatedContract = await deleteContractItem(
      id,
      itemNo,
      ownerAdminId
    );
    return res.json(updatedContract);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  importFromExtract,
  createEmptyContractHandler,
  getContracts,
  getContract,
  updateContractHandler,
  deleteContractHandler,
  upsertContractItemHandler,
  deleteContractItemHandler,
};
