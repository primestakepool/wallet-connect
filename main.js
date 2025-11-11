// main.js
import { Lucid, Blockfrost } from "https://cdn.jsdelivr.net/npm/lucid-cardano@0.9.8/dist/lucid.js";

// ------------------ Configuration ------------------
const BACKEND_URL = "https://wallet-proxy-five.vercel.app/api/epoch-params"; // replace with your deployed backend
const POOL_ID = "pool1w2duw0lk7lxjpfqjguxvtp0znhaqf8l2yvzcfd72l8fuk0h77gy"; // replace with your stake pool ID
// ---------------------------------------------------

const messageEl = document.getElementById("message");
const buttonsContainer = document.getElementById("wallet-buttons");

async function detectWallets() {
  const wallets = [];

  if (window.cardano?.nami) wallets.push("nami");
  if (window.cardano?.yoroi) wallets.push("yoroi");
  if (window.cardano?.lace) wallets.push("lace");
  if (window.cardano?.flint) wallets.push("flint");

  return wallets;
}

async function connectWallet(walletName) {
  try {
    messageEl.textContent = `Connecting to ${walletName}...`;

    const walletApi = await window.cardano[walletName].enable();

    // Initialize Lucid
    const lucid = await Lucid.new(
      new Blockfrost("https://cardano-mainnet.blockfrost.io/api/v0", ""), // empty API key
      "Mainnet"
    );
    lucid.selectWallet(walletApi);

    messageEl.textContent = `${walletName} connected. Fetching network parameters...`;

    // Get epoch parameters securely from backend
    const epochParams = await fetch(BACKEND_URL).then((r) => r.json());
    if (epochParams.error) {
      messageEl.textContent = "❌ Could not fetch network parameters from backend.";
      console.error(epochParams.error);
      return;
    }

    messageEl.textContent = "Ready to delegate! Building transaction...";

    const delegationTx = await lucid
      .newTx()
      .delegateTo(POOL_ID)
      .complete();

    const signedTx = await lucid.signTx(delegationTx);
    const txHash = await lucid.submitTx(signedTx);

    messageEl.textContent = `✅ Delegation submitted! Tx Hash: ${txHash}`;
    console.log("Transaction hash:", txHash);
  } catch (err) {
    console.error("Connection or delegation failed:", err);
    messageEl.textContent = `⚠️ Error: ${err.message}`;
  }
}

async function main() {
  const wallets = await detectWallets();

  if (wallets.length === 0) {
    messageEl.textContent =
      "No Cardano wallet found. Please unlock or install Nami, Yoroi, Lace, or Flint.";
    return;
  }

  messageEl.textContent = "Select your wallet to delegate:";

  wallets.forEach((walletName) => {
    const btn = document.createElement("button");
    btn.textContent = walletName.toUpperCase();
    btn.onclick = () => connectWallet(walletName);
    buttonsContainer.appendChild(btn);
  });

  console.log("Detected wallets:", wallets);
}

// Wait until DOM and wallets are ready
window.addEventListener("DOMContentLoaded", main);
