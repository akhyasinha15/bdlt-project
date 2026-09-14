/**
 * Backend for the Blockchain-Based Document Verification System.
 *
 * What this file does:
 *  1. Starts a small web server (Express) that serves the frontend
 *     and exposes two APIs: /api/register and /api/verify.
 *  2. Talks to the smart contract deployed on your local blockchain
 *     using ethers.js.
 *  3. /api/register  -> takes an uploaded file, hashes it (SHA-256),
 *     writes that hash on-chain, and returns a QR code encoding the hash.
 *  4. /api/verify     -> takes an uploaded file, hashes it again, looks
 *     up that hash on-chain, and tells you MATCH or MODIFIED/UNREGISTERED.
 */

const express = require("express");
const multer = require("multer");
const crypto = require("crypto");
const cors = require("cors");
const QRCode = require("qrcode");
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const upload = multer({ dest: path.join(__dirname, "uploads") });

// ---------------------------------------------------------------------
// 1. Load the deployed contract's address + ABI (written by scripts/deploy.js)
// ---------------------------------------------------------------------
const configPath = path.join(__dirname, "contract-config.json");
if (!fs.existsSync(configPath)) {
  console.error(
    "\nERROR: backend/contract-config.json not found.\n" +
      "Run the deploy script first (see README step 4) — it creates this file automatically.\n"
  );
  process.exit(1);
}
const { address: CONTRACT_ADDRESS, abi: CONTRACT_ABI } = JSON.parse(
  fs.readFileSync(configPath, "utf8")
);

// ---------------------------------------------------------------------
// 2. Connect to the local blockchain node (Hardhat node or Ganache)
// ---------------------------------------------------------------------
const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545"; // Hardhat node default
// Default Hardhat account #0 private key (well-known, publicly documented,
// safe ONLY on local test networks). Override with env var ISSUER_PRIVATE_KEY
// if you're using Ganache (copy a private key from the Ganache UI instead).
const ISSUER_PRIVATE_KEY =
  process.env.ISSUER_PRIVATE_KEY ||
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(ISSUER_PRIVATE_KEY, provider);
const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);

// ---------------------------------------------------------------------
// Helper: compute SHA-256 hash of a file's contents
// ---------------------------------------------------------------------
function hashFile(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(fileBuffer).digest("hex");
}

// ---------------------------------------------------------------------
// POST /api/register  — issuer registers a new document
// form fields: file (the document), certificateId (text)
// ---------------------------------------------------------------------
app.post("/api/register", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const certificateId = req.body.certificateId || `CERT-${Date.now()}`;

    const documentHash = hashFile(req.file.path);

    // Write the hash on-chain
    const tx = await contract.registerDocument(documentHash, certificateId);
    const receipt = await tx.wait();

    // Generate a QR code that encodes the hash + certificate id,
    // so a verifier can scan it instead of retyping the hash.
    const qrPayload = JSON.stringify({ documentHash, certificateId });
    const qrDataUrl = await QRCode.toDataURL(qrPayload);

    // Clean up the temp uploaded file
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      documentHash,
      certificateId,
      issuer: wallet.address,
      txHash: receipt.hash,
      qrCode: qrDataUrl, // base64 image, ready to <img src="..."> in frontend
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.reason || err.message || "Registration failed" });
  }
});

// ---------------------------------------------------------------------
// POST /api/verify  — anyone verifies a document
// form field: file (the document to check)
// ---------------------------------------------------------------------
app.post("/api/verify", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const documentHash = hashFile(req.file.path);
    fs.unlinkSync(req.file.path);

    const [isValid, certificateId, issuer, timestamp] = await contract.verifyDocument(
      documentHash
    );

    res.json({
      success: true,
      documentHash,
      isValid,
      certificateId: isValid ? certificateId : null,
      issuer: isValid ? issuer : null,
      timestamp: isValid ? new Date(Number(timestamp) * 1000).toISOString() : null,
      status: isValid ? "AUTHENTIC / UNCHANGED" : "MODIFIED OR NOT REGISTERED",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.reason || err.message || "Verification failed" });
  }
});

// ---------------------------------------------------------------------
// GET /api/stats — quick sanity check endpoint
// ---------------------------------------------------------------------
app.get("/api/stats", async (req, res) => {
  try {
    const total = await contract.totalDocuments();
    res.json({ contractAddress: CONTRACT_ADDRESS, totalDocuments: total.toString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`\nServer running at http://localhost:${PORT}`);
  console.log(`Contract address: ${CONTRACT_ADDRESS}`);
  console.log(`Connected to RPC: ${RPC_URL}\n`);
});
