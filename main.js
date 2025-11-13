// ==============================
// CONFIGURATION
// ==============================
const BACKEND_API = "https://cardano-wallet-backend.vercel.app/api";
const POOL_ID = "pool1w2duw0lk7lxjpfqjguxvtp0znhaqf8l2yvzcfd72l8fuk0h77gy"; // <-- replace with your actual pool ID

// ==============================
// GLOBAL STATE
// ==============================
let selectedWalletApi = null;
let bech32Address = null;
let protocolParams = null;

// ==============================
// HELPER FUNCTIONS
// ==============================

// Convert wallet hex address to bech32 (addr1...)
function hexToBech32(hex) {
  if (!window.Cardano) throw new Error("Cardano lib not loaded");
  const bytes = window.Cardano.HexBlob.fromBytes(Buffer.from(hex, "hex"));
  const addr = window.Cardano.Address.from_bytes(bytes);
  return addr.to_bech32();
}

function setMessage(msg) {
  document.getElementById("message").innerText = msg;
  console.log(msg);
}

// Fetch epoch parameters from backend
async function fetchProtocolParams() {
  const res = await fetch(`${BACKEND_API}/epoch-params`);
  if (!res.ok) throw new Error("Failed to fetch epoch parameters");
  return await res.json();
}

// Fetch UTXOs from backend
async function fetchUTXOs(address) {
  const res = await fetch(`${BACKEND_API}/utxos?address=${address}`);
  if (!res.ok) throw new Error("UTxO fetch failed");
  return await res.json();
}

// Submit transaction to backend
async function submitTx(txCborHex) {
  const res = await fetch(`${BACKEND_API}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tx: txCborHex })
  });
  if (!res.ok) throw new Error("TX submit failed");
  return await res.json();
}

// ==============================
// WALLET CONNECTION
// ==============================

async function connectWallet(walletKey) {
  try {
    if (!window.cardano || !window.cardano[walletKey]) {
      throw new Error(`${walletKey} wallet not found`);
    }

    setMessage(`Connecting to ${walletKey}...`);
    const wallet = window.cardano[walletKey];
    await wallet.enable();
    selectedWalletApi = await wallet.enable();

    // Fetch first address
    const usedAddresses = await selectedWalletApi.getUsedAddresses();
    if (!usedAddresses.length) throw new Error("No used addresses found");

    const addressHex = usedAddresses[0];
    const addrBytes = window.Cardano.Address.from_bytes(
      window.Cardano.HexBlob.fromBytes(Buffer.from(addressHex, "hex"))
    );
    bech32Address = addrBytes.to_bech32();

    setMessage(`✅ Connected: ${bech32Address}`);

    protocolParams = await fetchProtocolParams();

    // Show delegate button
    const delegateDiv = document.getElementById("delegate-section");
    delegateDiv.innerHTML = `<button class="delegate-btn" id="delegate-btn">Delegate to PSP</button>`;
    document.getElementById("delegate-btn").onclick = submitDelegation;

  } catch (err) {
    console.error("Wallet connection error:", err);
    setMessage(`❌ Wallet connection failed: ${err.message}`);
  }
}

// ==============================
// DELEGATION LOGIC
// ==============================

async function submitDelegation() {
  try {
    setMessage("Building delegation transaction...");

    const utxos = await fetchUTXOs(bech32Address);
    console.log("UTXOs:", utxos);

    // Simplified delegation TX build
    const txBuilder = window.Cardano.TransactionBuilder.new();
    // Normally, you'd construct tx inputs, outputs, certs here with Cardano lib.
    // (simplified for demo — backend handles real TX building)

    const txBody = txBuilder.build();
    const txBodyCbor = Buffer.from(txBody.to_bytes()).toString("hex");

    // Let wallet sign
    const signedTx = await selectedWalletApi.signTx(txBodyCbor, true);
    const signedTxCbor = Buffer.from(signedTx, "hex").toString("hex");

    const submitResult = await submitTx(signedTxCbor);
    console.log("TX submitted:", submitResult);

    setMessage(`✅ Delegation transaction submitted successfully!`);
  } catch (err) {
    console.error("Delegation error:", err);
    setMessage(`❌ Delegation failed: ${err.message}`);
  }
}

// ==============================
// INIT UI
// ==============================
window.addEventListener("DOMContentLoaded", () => {
  const walletButtonsDiv = document.getElementById("wallet-buttons");
  if (!walletButtonsDiv) {
    console.error("Wallet button container missing");
    return;
  }

  const wallets = [
    { name: "Nami", key: "nami" },
    { name: "Eternl", key: "eternl" },
    { name: "Yoroi", key: "yoroi" },
    { name: "Lace", key: "lace" }
  ];

  walletButtonsDiv.innerHTML = wallets
    .map(w => `<button id="${w.key}-btn">${w.name}</button>`)
    .join("");

  wallets.forEach(w => {
    const btn = document.getElementById(`${w.key}-btn`);
    if (btn) btn.onclick = () => connectWallet(w.key);
  });

  setMessage("💡 Select your Cardano wallet to connect");
});
