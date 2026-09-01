const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
const app = express();
app.use(cors({ origin: "https://conecta.inducaosolar.com" }));
app.use(express.json({ limit: "50mb" }));

const AUTENTIQUE_TOKEN = "e79737005eb0181a0aa1544bf0fcadf4765d20c199463e7cd052dd417517740a";

// Precisa bater exatamente com o e-mail de login da conta dona do token acima
const CONTA_INTERNA_EMAIL = "adm@inducaosolar.com";
const CONTA_INTERNA_NOME = "Maxwel Tarquino Nunes";

app.post("/criar", async (req, res) => {
  try {
    const { name, fileUrl, signerName, signerEmail } = req.body;
    const query = `
  mutation CreateDocument($document: DocumentInput!, $signers: [SignerInput!]!, $file: Upload!) {
    createDocument(document: $document, signers: $signers, file: $file) {
      id
      name
      signatures {
        public_id
        name
        email
        link { short_link }
      }
    }
  }
`;
    // Baixa o arquivo do Cloudinary
    const fileRes = await fetch(fileUrl);
    const fileBuffer = await fileRes.buffer();
    const base64File = fileBuffer.toString("base64");
    const variables = {
      document: { name },
      signers: [
        { email: signerEmail, name: signerName, action: "SIGN" },
        { email: CONTA_INTERNA_EMAIL, name: CONTA_INTERNA_NOME, action: "SIGN" },
      ],
      file: null,
    };
    const map = { file: ["variables.file"] };
    const formData = new (require("form-data"))();
    formData.append("operations", JSON.stringify({ query, variables }));
    formData.append("map", JSON.stringify(map));
    formData.append("file", Buffer.from(base64File, "base64"), { filename: "contrato.docx", contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
    const response = await fetch("https://api.autentique.com.br/v2/graphql", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + AUTENTIQUE_TOKEN,
        ...formData.getHeaders(),
      },
      body: formData,
    });
    const data = await response.json();

    const docId = data?.data?.createDocument?.id;
    if (docId) {
      try {
        const signQuery = `
          mutation SignDocument($documentId: UUID!) {
            signDocument(id: $documentId)
          }
        `;
        const signResp = await fetch("https://api.autentique.com.br/v2/graphql", {
          method: "POST",
          headers: {
            "Authorization": "Bearer " + AUTENTIQUE_TOKEN,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query: signQuery, variables: { documentId: docId } }),
        });
        const signData = await signResp.json();
        data.autoSignResult = signData;
      } catch (signErr) {
        data.autoSignError = signErr.message;
      }
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get("/verificar/:id", async (req, res) => {
  try {
    const query = `
  query {
    document(id: "${req.params.id}") {
      id
      name
      signatures {
        signed { created_at }
        email
        name
      }
    }
  }
`;
    const response = await fetch("https://api.autentique.com.br/v2/graphql", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + AUTENTIQUE_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });
    const data = await response.json();
    console.log("Autentique response:", JSON.stringify(data));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Proxy rodando na porta " + PORT));
