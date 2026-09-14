# Blockchain-Based Document Verification and Trust Management System

This is a working implementation of your project: a document (certificate,
degree, ID, etc.) is fingerprinted with SHA-256, the fingerprint is stored on
a blockchain via a smart contract, and anyone can later re-upload the
document to check whether it's still authentic (unmodified) — matching the
architecture from your slides (SHA-256 → Smart Contract → Blockchain Record
→ Hash Comparison → Match/Mismatch).

---

## 1. What you're actually building (in plain terms)

Think of it in three layers, exactly like your "System Architecture" slide:

1. **Smart contract (`contracts/DocumentVerification.sol`)** — this is the
   "database" that lives on the blockchain. It never stores the actual file
   — only its SHA-256 fingerprint, an issuer address, a certificate ID, and
   a timestamp. This is Layers 3–4 in your slides (Blockchain + Trust &
   Verification).

2. **Backend server (`backend/server.js`)** — a small Node.js/Express app.
   When someone uploads a file to *register* it, the backend hashes the
   file, calls the smart contract to store that hash, and generates a QR
   code. When someone uploads a file to *verify* it, the backend re-hashes
   it and asks the smart contract "does this hash exist?" This is Layer 2
   (Application/Gateway) talking to Layer 3.

3. **Frontend (`backend/public/index.html`)** — a simple webpage with two
   tabs: **Register** and **Verify**. This is Layer 5 (User/Application
   Layer) from your slides.

**The whole point:** instead of trusting a person's word or a photocopy,
anyone can re-run the SHA-256 hash of a document and compare it against
the tamper-proof copy stored on the blockchain. If even one character in
the document changes, the hash changes completely, and verification fails.

---

## 2. Tools you need to install (one-time setup)

You do **not** need any special "blockchain IDE." Regular tools work fine:

| Tool | What it's for | Link |
|---|---|---|
| **VS Code** | The code editor you'll work in | https://code.visualstudio.com |
| **Node.js (LTS, v18 or v20)** | Runs both Hardhat (blockchain) and the backend server | https://nodejs.org |
| **Solidity extension for VS Code** | Syntax highlighting for `.sol` files (search "Solidity" by Juan Blanco in the Extensions tab) | inside VS Code |
| **MetaMask (browser extension)** | Optional — only needed if you want to connect a real wallet in-browser later. Not required for the version below, since the backend signs transactions itself. | https://metamask.io |

You do **not** need to separately install "Ganache" as a program — Hardhat
comes with its own built-in local blockchain, which is simpler for a first
run. (Your slides mention Ganache as an option; instructions for that are
in section 6 if you specifically want to use it.)

Verify installation by opening a terminal and running:
```bash
node --version
npm --version
```
Both should print a version number.

---

## 3. Project structure

```
bdlt-project/
├── contracts/
│   └── DocumentVerification.sol   ← the smart contract
├── scripts/
│   └── deploy.js                  ← deploys the contract, saves its address
├── test/
│   └── DocumentVerification.test.js
├── hardhat.config.js
├── package.json
└── backend/
    ├── server.js                  ← Express API (register/verify)
    ├── package.json
    └── public/
        └── index.html             ← the webpage UI
```

---

## 4. Running it — step by step

Open a terminal in the **project root folder** (`bdlt-project/`).

### Step 1 — Install blockchain-side dependencies
```bash
npm install
```
This installs Hardhat and its toolbox (compiler, testing library, ethers.js).

### Step 2 — Compile the smart contract
```bash
npx hardhat compile
```
You should see `Compiled 1 Solidity file successfully`. This checks your
contract has no syntax errors and produces the ABI (a JSON description of
the contract's functions, which the backend needs to talk to it).

### Step 3 — Start a local blockchain
Open a **new terminal window** (keep it running) and type:
```bash
npx hardhat node
```
This starts a fake local Ethereum network on `http://127.0.0.1:8545` with
20 test accounts, each pre-loaded with 10,000 fake ETH. This stands in for
a real blockchain so you don't spend real money or need internet access to
a live network — exactly like Ganache would, just built into Hardhat.
**Leave this terminal running for the rest of the project.**

### Step 4 — Deploy the smart contract
In your **original terminal** (project root):
```bash
npx hardhat run scripts/deploy.js --network localhost
```
You'll see output like:
```
Deploying contract with account: 0xf39F...
DocumentVerification deployed to: 0x5FbDB2...
Saved contract address + ABI to backend/contract-config.json
```
That second file, `backend/contract-config.json`, is how the backend server
knows where to find your contract. It's created automatically — don't edit
it by hand.

### Step 5 — Install backend dependencies
```bash
cd backend
npm install
```

### Step 6 — Start the backend + frontend server
```bash
npm start
```
You should see:
```
Server running at http://localhost:4000
Contract address: 0x5FbDB2...
Connected to RPC: http://127.0.0.1:8545
```

### Step 7 — Open the app
Go to **http://localhost:4000** in your browser.

- Under **Register a Document**: type a certificate ID (e.g.
  `VIT-2026-CS-0045`), choose any file (a PDF, image, or text file), click
  **Register on Blockchain**. You'll see the hash, the issuer's wallet
  address, the transaction hash, and a QR code appear.
- Under **Verify a Document**: upload the *same* file. You should see
  **AUTHENTIC ✅**. Now try uploading a *different* file, or edit the
  original file slightly and re-upload it — you'll see
  **MODIFIED / NOT REGISTERED ❌**. That's the core "tamper-evidence" your
  project is about.

---

## 5. What "expected outcome" looks like for your report/demo

For your evaluation, you can demonstrate and screenshot:

1. **Successful registration** — a document's hash, issuer address, and
   transaction hash all appearing after registration (proves Layers 2–3
   work).
2. **Successful verification of an unmodified file** — same hash, "AUTHENTIC".
3. **Failed verification of a tampered file** — even a 1-byte change (e.g.
   opening a text file and adding a space) produces a completely different
   SHA-256 hash, so verification correctly returns "MODIFIED".
4. **The Hardhat terminal log** — showing each transaction being mined,
   which you can point to as proof the data is genuinely going through a
   blockchain, not just a regular database.
5. **Run `npx hardhat test`** (from the project root) to show your automated
   test suite passing — this covers your "System Testing" and "Security &
   Integrity Evaluation" methodology steps: registering, verifying,
   rejecting unauthorized issuers, rejecting duplicate hashes, and admin
   authorization of a new issuer.

This directly maps to your slide's evaluation parameters: verification
correctness ✅, detection of modified documents ✅, verification time
(near-instant on local chain) ✅, security (only authorized issuers can
register) ✅.

---

## 6. Optional: using Ganache instead of Hardhat's local node

Your slides mention Ganache specifically. If your faculty wants to see
Ganache:

1. Install Ganache (GUI app or `npm install -g ganache`, then run `ganache`).
2. It will typically run on `http://127.0.0.1:7545`.
3. Copy a private key for one of the funded accounts shown in the Ganache UI.
4. Deploy with: `npx hardhat run scripts/deploy.js --network ganache`
5. Before starting the backend, set the private key as an environment
   variable so it uses the Ganache account instead of the Hardhat default:
   ```bash
   export ISSUER_PRIVATE_KEY=0xyourganacheprivatekey
   export RPC_URL=http://127.0.0.1:7545
   npm start
   ```

---

## 7. Extending it (matches your "IoT integration is the proposed extension" note)

Your slides flag IoT data sources as a *proposed* extension (Layer 1),
not yet implemented. A simple way to add it later: have an IoT
device/sensor (or a script simulating one) POST a JSON payload
(e.g. `{ "sensorId": "...", "reading": "...", "timestamp": "..." }`) to a
new `/api/register-iot-event` endpoint, hash that JSON the same way you
hash a file, and register it on-chain exactly like a document. This keeps
the same architecture — only the "document" being fingerprinted changes.

---

## 8. Troubleshooting

- **`contract-config.json not found`** → you skipped Step 4 (deploy), or
  you deployed but the `backend/` folder didn't exist yet when you ran
  `npm init` in step 1 — just re-run Step 4.
- **`ECONNREFUSED 127.0.0.1:8545`** → your `npx hardhat node` terminal
  (Step 3) isn't running or was closed. Restart it.
- **Nonce/transaction errors after restarting `hardhat node`** → the local
  blockchain resets every time you stop and restart it, but MetaMask/your
  wallet may cache old data. For this project (backend signs directly),
  simply re-run Step 4 (redeploy) after restarting the node.
- **`npx hardhat compile` fails to download the compiler** → you need an
  active internet connection the first time only (it downloads the
  Solidity compiler binary once and caches it).
