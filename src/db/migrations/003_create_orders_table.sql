USE sigecon;

-- ======================
-- TABELA DE ORDENS
-- ======================
CREATE TABLE orders (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        contract_id INT NOT NULL,
                        order_type VARCHAR(50) NOT NULL,
                        order_number VARCHAR(120),
                        issue_date DATE,
                        reference_period VARCHAR(255),
                        justification TEXT,
                        total_amount DECIMAL(14,2) DEFAULT 0,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        CONSTRAINT fk_orders_contract
                            FOREIGN KEY (contract_id)
                                REFERENCES contracts(id)
                                ON DELETE CASCADE
);

-- =======================
-- ITENS DA ORDEM
-- =======================
CREATE TABLE order_items (
                             id INT AUTO_INCREMENT PRIMARY KEY,
                             order_id INT NOT NULL,
                             contract_item_id INT NOT NULL,
                             description TEXT,
                             unit VARCHAR(50),
                             quantity DECIMAL(14,2) NOT NULL,
                             unit_price DECIMAL(14,2),
                             total_price DECIMAL(14,2),
                             CONSTRAINT fk_order_items_order
                                 FOREIGN KEY (order_id)
                                     REFERENCES orders(id)
                                     ON DELETE CASCADE,
                             CONSTRAINT fk_order_items_contract_item
                                 FOREIGN KEY (contract_item_id)
                                     REFERENCES contract_items(id)
                                     ON DELETE RESTRICT
);

CREATE INDEX idx_orders_contract_id ON orders (contract_id);
CREATE INDEX idx_order_items_order_id ON order_items (order_id);
