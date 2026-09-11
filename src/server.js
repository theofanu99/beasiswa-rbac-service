require("dotenv").config();

const app = require("./app");

const PORT = Number(process.env.PORT) || 3001;

app.listen(PORT, () => {
  console.log(`RBAC service running on port ${PORT}`);
});