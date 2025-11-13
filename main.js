// main.js
import { Address } from "@emurgo/cardano-serialization-lib-browser";

// Backend URL
const BACKEND_URL = "https://cardano-wallet-backend.vercel.app/api";

// Global wallet object
let wallet = null;
let userAddress = null;

// Utility: Convert hex address to Bech32
function hexToBech32(hex) {
  try {
    const addr = Address.from_bytes(Buffer.from(hex, "hex"));
    return addr.to_bech32();
  } catch (err) {
    console.error("Invalid address hex:", hex, err);
    return null;
  }
}

// Detect available wallets
async function detectWallets() {
  const walletButtonsDiv = document.getElementById("wallet-buttons");
  walletButtonsDiv.innerHTML = "";

  const walletList = [
    { name: "Yoroi", key: "yoroi" },
    { name: "Nami", key: "nami" },
    { name: "Gero", key: "gerowallet" },
    { name: "Flint", key: "flint" }
  ];

  walletList.forEach(w => {
    if (window.cardano && window.cardano[w.key]) {
      const btn = document.createElement("button");
      btn.innerText = `Connect ${w.name}`;
      btn.onclick = () => connectWallet(w.key);
      walletButtonsDiv.appendChild(btn);
    }
  });

  if (walletButtonsDiv.childElementCount === 0) {
    document.getElementById("message").innerText = "No compatible wallets found.";
  }
}

// Connect wallet
async function connectWallet(walletKey) {
  try {
    const w = window.cardano[walletKey];
    if (!w) throw new Error(`${walletKey} not found`);

    await w.enable();
    wallet = w;

    // Get used addresses (hex)
    const usedAddresses = await wallet.getUsedAddresses();
    if (!usedAddresses || usedAddresses.length === 0) throw new Error("No addresses found");

    userAddress = hexToBech32(usedAddresses[0]);
    if (!userAddress) throw new Error("Failed to convert address");

    document.getElementById("message").innerText = `Connected: ${userAddress}`;

    // Fetch UTxOs from backend
    const utxosResp = await fetch(`${BACKEND_URL}/utxos?address=${userAddress}`);
    if (!utxosResp.ok) throw new Error(`UTxO fetch failed: ${utxosResp.status}`);
    const utxos = await utxosResp.json();
    console.log("UTXOs:", utxos);

    document.getElementById("delegate-section").innerHTML = `
      <button class="delegate-btn" onclick="submitDelegation()">Delegate ADA</button>
    `;
  } catch (err) {
    console.error("Connect wallet error:", err);
    document.getElementById("message").innerText = `Error: ${err.message}`;
  }
}

// Submit delegation to backend
async function submitDelegation() {
  try {
    if (!wallet || !userAddress) throw new Error("Wallet not connected");

    const resp = await fetch(`${BACKEND_URL}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: userAddress })
    });

    if (!resp.ok) throw new Error(`Delegation submit failed: ${resp.status}`);
    const data = await resp.json();
    console.log("Delegation result:", data);
    alert("Delegation submitted successfully!");
  } catch (err) {
    console.error("Delegation error:", err);
    alert(`Delegation error: ${err.message}`);
  }
}

// Initialize
window.addEventListener("load", detectWallets);
window.submitDelegation = submitDelegation; // make it global for onclick
