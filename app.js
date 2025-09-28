const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("테스트 페이지");
});

const PORT = 8000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
