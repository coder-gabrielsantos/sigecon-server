const app = require("./app");
const { PORT } = require("./config/env");

app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT}`);
});
