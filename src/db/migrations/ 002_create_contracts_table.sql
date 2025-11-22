USE sigecon;

-- Remove tabelas antigas para evitar conflitos (ambiente de dev)
DROP TABLE IF EXISTS contract_items;
DROP TABLE IF EXISTS contracts;

-- ======================
-- TABELA DE CONTRATOS
-- ======================
CREATE TABLE contracts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    number VARCHAR(120) NOT NULL,
    supplier VARCHAR(255),
    start_date DATE,
    end_date DATE,
    pdf_path VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================
-- ITENS DO CONTRATO
-- ===========================
CREATE TABLE contract_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    contract_id INT NOT NULL,
    item_no INT,
    description TEXT,
    unit VARCHAR(50),
    quantity DECIMAL(14,2),
    unit_price DECIMAL(14,2),
    total_price DECIMAL(14,2),
    CONSTRAINT fk_contract_items_contract
        FOREIGN KEY (contract_id)
            REFERENCES contracts(id)
            ON DELETE CASCADE
);

CREATE INDEX idx_contract_items_contract_id
    ON contract_items (contract_id);
