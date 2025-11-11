import { Lucid } from "https://cdn.jsdelivr.net/npm/lucid-cardano@0.10.7/web/mod.js";

// Backend for epoch parameters (your existing one)
const BACKEND_URL = "https://wallet-proxy-five.vercel.app/api/epoch-params";

const messageEl = document.getElementById("message");
const buttonsContainer = document.getElementById("wallet-buttons");
const walletInfoDiv = document.getElementById("wallet-info");
const walletNameSpan = document.getElementById("wallet-name");
const walletAddrSpan = document.getElementById("wallet-address");
const walletBalSpan = document.getElementById("wallet-balance");
const disconnectBtn = document.getElementById("disconnect-btn");

let lucid;
let currentWalletName = null;

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

    const epochParams = await fetch(BACKEND_URL).then(r => r.json());
    if (epochParams.error) {
      messageEl.textContent = "❌ Could not fetch network parameters.";
      console.error(epochParams.error);
      return;
    }

    lucid = await Lucid.new(undefined, "Mainnet");
    lucid.selectWallet(walletApi);

    const address = await lucid.wallet.address();
    const balanceLovelace = await lucid.wallet.getBalance();
    const balanceAda = Number(balanceLovelace) / 1_000_000;

    currentWalletName = walletName;
    walletNameSpan.textContent = walletName.toUpperCase();
    walletAddrSpan.textContent = address;
    walletBalSpan.textContent = balanceAda.toFixed(6);

    messageEl.textContent = `✅ ${walletName} connected.`;
    walletInfoDiv.style.display = "block";
    buttonsContainer.style.display = "none";

    console.log("Connected wallet:", walletName);
    console.log("Address:", address);
    console.log("Balance:", balanceAda);
  } catch (err) {
    console.error("Connection failed:", err);
    messageEl.textContent = `⚠️ Error: ${err.message}`;
  }
}

function disconnectWallet() {
  lucid = null;
  currentWalletName = null;
  walletInfoDiv.style.display = "none";
  buttonsContainer.style.display = "block";
  messageEl.textContent = "Select your wallet to delegate:";
}

async function main() {
  messageEl.textContent = "Detecting wallets...";

  // Wait up to 3 seconds for wallet injection
  let wallets = [];
  for (let i = 0; i < 6; i++) {
    wallets = await detectWallets();
    if (wallets.length > 0) break;
    await new Promise(r => setTimeout(r, 500));
  }

  if (wallets.length === 0) {
    messageEl.textContent = "No Cardano wallet found. Please unlock or install one.";
    return;
  }

  messageEl.textContent = "Select your wallet to delegate:";
  buttonsContainer.innerHTML = ""; // Clear any previous buttons

  wallets.forEach(walletName => {
    const btn = document.createElement("button");
    btn.textContent = walletName.toUpperCase();
    btn.onclick = () => connectWallet(walletName);
    buttonsContainer.appendChild(btn);
  });

  disconnectBtn.onclick = disconnectWallet;

  console.log("✅ Detected wallets:", wallets);
}


window.addEventListener("DOMContentLoaded", main);
