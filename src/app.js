const express = require("express");
const app = express();
const errorHandler = require("./middleware-error/errorHandler");

app.use(express.json());

// rotas
app.use("/auth", require("./routes/auth.routes"));
app.use("/usuarios", require("./routes/users.routes"));
// futuramente:
// app.use("/contratos", require("./routes/contracts.routes"));
// app.use("/ordens", require("./routes/orders.routes"));

app.use(errorHandler);

module.exports = app;
