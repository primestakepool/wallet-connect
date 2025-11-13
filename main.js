// main.js

// Backend API base URL
const API_BASE = "https://cardano-wallet-backend.vercel.app/api";

let walletApi = null;
let userAddress = null;

const messageEl = document.getElementById("message");
const walletButtonsEl = document.getElementById("wallet-buttons");
const delegateSectionEl = document.getElementById("delegate-section");

// Helper: Convert hex to Bech32 safely
function hexToBech32(hex) {
  try {
    const bytes = Buffer.from(hex, "hex");
    const addr = Cardano.Address.from_bytes(bytes);
    const bech32 = addr.to_bech32();
    if (!bech32.startsWith("addr1")) {
      console.warn("Address is not Shelley-era:", bech32);
      return null;
    }
    return bech32;
  } catch (err) {
    console.error("Invalid address hex:", hex, err);
    return null;
  }
}

// Detect wallets
function detectWallets() {
  const wallets = [];

  if (window.cardano?.yoroi) wallets.push({ name: "Yoroi", api: window.cardano.yoroi });
  if (window.cardano?.nami) wallets.push({ name: "Nami", api: window.cardano.nami });
  if (window.cardano?.gerowallet) wallets.push({ name: "GeroWallet", api: window.cardano.gerowallet });
  // Add more wallets here if needed

  if (!wallets.length) {
    messageEl.innerText = "No Cardano wallets detected. Please install one!";
    return;
  }

  wallets.forEach(w => {
    const btn = document.createElement("button");
    btn.innerText = `Connect ${w.name}`;
    btn.onclick = async () => connectWallet(w.api, w.name);
    walletButtonsEl.appendChild(btn);
  });
}

// Connect wallet
async function connectWallet(api, name) {
  try {
    await api.enable();
    walletApi = api;

    const usedAddresses = await walletApi.getUsedAddresses();
    userAddress = hexToBech32(usedAddresses[0]);

    if (!userAddress) {
      messageEl.innerText = `${name} wallet does not have a Shelley-era address (addr1...).`;
      return;
    }

    messageEl.innerText = `Connected: ${userAddress}`;
    showDelegateButton();
  } catch (err) {
    console.error("Wallet connection error:", err);
    messageEl.innerText = `Failed to connect ${name} wallet.`;
  }
}

// Show delegate button
function showDelegateButton() {
  delegateSectionEl.innerHTML = ""; // clear existing
  const btn = document.createElement("button");
  btn.className = "delegate-btn";
  btn.innerText = "Delegate ADA";
  btn.onclick = submitDelegation;
  delegateSectionEl.appendChild(btn);
}

// Submit delegation
async function submitDelegation() {
  if (!userAddress) return;

  try {
    messageEl.innerText = "Fetching UTxOs...";
    const utxosResp = await fetch(`${API_BASE}/utxos?address=${userAddress}`);
    if (!utxosResp.ok) throw new Error(`UTxOs fetch failed: ${utxosResp.status}`);
    const utxos = await utxosResp.json();

    messageEl.innerText = "Fetching epoch parameters...";
    const epochResp = await fetch(`${API_BASE}/epoch-params`);
    if (!epochResp.ok) throw new Error(`Epoch params fetch failed: ${epochResp.status}`);
    const epochParams = await epochResp.json();

    messageEl.innerText = "Submitting delegation...";
    const submitResp = await fetch(`${API_BASE}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: userAddress, utxos, epochParams })
    });

    if (!submitResp.ok) throw new Error(`Delegation submit failed: ${submitResp.status}`);
    const result = await submitResp.json();

    messageEl.innerText = `Delegation submitted successfully! TxHash: ${result.txHash}`;
  } catch (err) {
    console.error("Delegation error:", err);
    messageEl.innerText = `Delegation error: ${err.message}`;
  }
}

// Initialize
detectWallets();
