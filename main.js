// main.js
const BACKEND_URL = "https://cardano-wallet-backend.vercel.app/api";

let wallet = null;
let walletName = null;
let userAddress = null;

const message = document.getElementById("message");
const walletButtonsDiv = document.getElementById("wallet-buttons");
const delegateSection = document.getElementById("delegate-section");

// List of supported wallets
const SUPPORTED_WALLETS = ["yoroi", "nami", "flint", "eternl", "gerowallet"];

function detectWallets() {
  walletButtonsDiv.innerHTML = "";
  const detectedWallets = [];

  SUPPORTED_WALLETS.forEach(name => {
    if (window.cardano?.[name]) detectedWallets.push(name);
  });

  if (detectedWallets.length === 0) {
    message.innerHTML = 'No supported wallets found. Install one of these: <a href="https://yoroi-wallet.com/">Yoroi</a>, <a href="https://namiwallet.io/">Nami</a>.';
    return;
  }

  message.innerText = "Select a wallet to connect:";

  detectedWallets.forEach(name => {
    const btn = document.createElement("button");
    btn.innerText = name.charAt(0).toUpperCase() + name.slice(1);
    btn.onclick = () => connectWallet(name);
    walletButtonsDiv.appendChild(btn);
  });
}

async function connectWallet(name) {
  if (!window.cardano?.[name]) {
    message.innerText = `${name} wallet not found!`;
    return;
  }

  try {
    wallet = await window.cardano[name].enable();
    walletName = name;

    // Small delay to ensure the wallet is ready
    await new Promise(resolve => setTimeout(resolve, 300));

    const usedAddresses = await wallet.getUsedAddresses();

    if (!usedAddresses || usedAddresses.length === 0) {
      message.innerText = "No addresses found in wallet.";
      return;
    }

    userAddress = usedAddresses[0];
    message.innerText = `✅ Connected: ${userAddress.slice(0, 10)}...`;
    showDelegateButton();

  } catch (err) {
    console.error(`Failed to connect ${name} wallet:`, err);
    message.innerText = `❌ Could not connect ${name}. Make sure you approve the connection in the wallet.`;
  }
}

function showDelegateButton() {
  delegateSection.innerHTML = "";
  const btn = document.createElement("button");
  btn.innerText = "Delegate ADA to PSP";
  btn.className = "delegate-btn";
  btn.onclick = submitDelegation;
  delegateSection.appendChild(btn);
}

async function submitDelegation() {
  if (!wallet || !userAddress) {
    message.innerText = "Wallet not connected!";
    return;
  }

  try {
    message.innerText = "Preparing transaction...";

    // Fetch UTXOs from your backend
    const utxoResp = await fetch(`${BACKEND_URL}/utxos?address=${userAddress}`);
    const utxos = await utxoResp.json();

    if (!utxos || utxos.length === 0) {
      message.innerText = "No UTXOs found for this address.";
      return;
    }

    // Fetch protocol params
    const paramsResp = await fetch(`${BACKEND_URL}/epoch-params`);
    const protocolParams = await paramsResp.json();

    // Build transaction payload for backend
    const txPayload = {
      address: userAddress,
      utxos,
      protocolParams,
      stakePool: "pool1w2duw0lk7lxjpfqjguxvtp0znhaqf8l2yvzcfd72l8fuk0h77gy" // replace with your pool ID
    };

    // Send to backend to construct & submit transaction
    const submitResp = await fetch(`${BACKEND_URL}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(txPayload)
    });

    const result = await submitResp.json();

    if (result.success) {
      message.innerText = `🎉 Delegation successful! Tx Hash: ${result.txHash}`;
    } else {
      message.innerText = `❌ Delegation failed: ${result.error || "Unknown error"}`;
    }

  } catch (err) {
    console.error("Delegation error:", err);
    message.innerText = "❌ An error occurred during delegation. Check console.";
  }
}

// Initialize
detectWallets();
