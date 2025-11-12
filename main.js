import { Lucid, Blockfrost } from "https://cdn.jsdelivr.net/npm/lucid-cardano@0.10.7/web/mod.js";

// ----------------------
// CONFIG
// ----------------------
const BACKEND_URL = "https://wallet-proxy-pi.vercel.app/api/epoch-params";
const POOL_ID = "pool1w2duw0lk7lxjpfqjguxvtp0znhaqf8l2yvzcfd72l8fuk0h77gy";

// ----------------------
// DOM ELEMENTS
// ----------------------
const messageEl = document.getElementById("message");
const buttonsContainer = document.getElementById("wallet-buttons");

let lucid, walletApi, connectedWallet;

// ----------------------
// ROBUST WALLET DETECTION
// ----------------------
async function detectWallets() {
  messageEl.textContent = "Detecting wallets…";

  if (window.cardano && Object.keys(window.cardano).length > 0) {
    return Object.keys(window.cardano);
  }

  // Poll for wallet injection (some wallets inject after page load)
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const timeout = 5000;
    const interval = setInterval(() => {
      if (window.cardano && Object.keys(window.cardano).length > 0) {
        clearInterval(interval);
        resolve(Object.keys(window.cardano));
      } else if (Date.now() - start > timeout) {
        clearInterval(interval);
        reject(new Error("No Cardano wallets detected. Make sure the wallet is installed and unlocked."));
      }
    }, 200);
  });
}

// ----------------------
// MAIN
// ----------------------
async function main() {
  try {
    const walletNames = await detectWallets();
    buttonsContainer.innerHTML = "";

    walletNames.forEach(name => {
      const btn = document.createElement("button");
      btn.textContent = name.toUpperCase();
      btn.onclick = () => connectWallet(name);
      buttonsContainer.appendChild(btn);
    });

    console.log("Detected wallets:", walletNames);
    messageEl.textContent = "Select your wallet to delegate:";
  } catch (err) {
    console.error(err);
    messageEl.textContent = `❌ ${err.message}`;
  }
}

// ----------------------
// CONNECT WALLET
// ----------------------
async function connectWallet(name) {
  try {
    messageEl.textContent = `Connecting to ${name}…`;
    walletApi = await window.cardano[name].enable();
    connectedWallet = name;

    // Fetch protocol parameters from backend (CORS-enabled)
    const res = await fetch(BACKEND_URL);
    const protocolParams = await res.json();

    // Initialize Lucid with backend-provided protocol parameters
    lucid = await Lucid.new(undefined, "Mainnet");
    lucid.selectWallet(walletApi);
    lucid._protocolParameters = protocolParams; // inject backend protocol params

    const address = await lucid.wallet.address();
    messageEl.textContent = `✅ ${name.toUpperCase()} connected`;
    console.log("Connected wallet:", name, address);
    console.log("Protocol params:", protocolParams);

    showDelegateButton(address);
  } catch (err) {
    console.error(err);
    messageEl.textContent = `❌ Failed to connect ${name}: ${err.message}`;
  }
}

// ----------------------
// ADD "DELEGATE NOW" BUTTON
// ----------------------
function showDelegateButton(address) {
  const delegateBtn = document.createElement("button");
  delegateBtn.textContent = "Delegate Now";
  delegateBtn.style.cssText = "display:block;margin-top:20px;padding:10px 25px;font-size:16px;";
  delegateBtn.onclick = () => delegateToPool(address);
  buttonsContainer.appendChild(delegateBtn);
}

// ----------------------
// DELEGATION LOGIC
// ----------------------
async function delegateToPool(address) {
  try {
    messageEl.textContent = "Building delegation transaction…";

    const delegation = await lucid.newTx()
      .delegateTo(address, POOL_ID)
      .complete();

    messageEl.textContent = "Signing transaction…";
    const signedTx = await delegation.sign().complete();

    messageEl.textContent = "Submitting to network…";
    const txHash = await signedTx.submit();

    messageEl.textContent = `🎉 Delegation submitted! Tx hash: ${txHash}`;
    console.log("Delegation transaction hash:", txHash);
  } catch (err) {
    console.error("Delegation error:", err);
    messageEl.textContent = `❌ Delegation failed: ${err.message}`;
  }
}

// ----------------------
// INIT
// ----------------------
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", main);
} else {
  main();
}
