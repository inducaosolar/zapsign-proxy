const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();
app.use(cors({ origin: "https://conecta.inducaosolar.com" }));
app.use(express.json());

const ZAPSIGN_TOKEN = "845cc425-2b34-49d7-9d76-09b324bd2019";

app.post("/criar", async (req, res) => {
  try {
    const response = await fetch("https://api.zapsign.com.br/api/v1/docs/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + ZAPSIGN_TOKEN,
      },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/verificar/:token", async (req, res) => {
  try {
    const response = await fetch("https://api.zapsign.com.br/api/v1/docs/" + req.params.token + "/", {
      headers: { "Authorization": "Bearer " + ZAPSIGN_TOKEN },
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Proxy rodando na porta " + PORT));