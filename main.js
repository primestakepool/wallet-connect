if (!window.Cardano) {
  console.error("Cardano serialization lib not loaded!");
  document.getElementById("message").textContent = "⚠️ Serialization library not loaded!";
}

const API_BASE = "https://cardano-wallet-backend.vercel.app/api/";

const messageEl = document.getElementById("message");
const walletButtonsDiv = document.getElementById("wallet-buttons");
const delegateSection = document.getElementById("delegate-section");

const SUPPORTED_WALLETS = ["nami", "eternl", "yoroi", "lace"];
let selectedWallet = null;
let walletApi = null;
let bech32Address = null;

// Utility: wait
const sleep = ms => new Promise(res => setTimeout(res, ms));

// ✅ Wait for wallets to inject
async function detectWallets() {
  messageEl.textContent = "🔍 Detecting wallets...";
  for (let i = 0; i < 10; i++) {
    if (window.cardano && Object.keys(window.cardano).length > 0) break;
    await sleep(500);
  }

  if (!window.cardano) {
    messageEl.textContent =
      "⚠️ No Cardano wallets detected. Install Nami, Eternl, Yoroi, or Lace.";
    return;
  }

  renderWalletButtons();
}

// ✅ Render wallet buttons
function renderWalletButtons() {
  walletButtonsDiv.innerHTML = "";
  SUPPORTED_WALLETS.forEach(name => {
    const wallet = window.cardano[name];
    if (wallet) {
      const btn = document.createElement("button");
      btn.textContent = `Connect ${wallet.name || name}`;
      btn.onclick = () => connectWallet(name);
      walletButtonsDiv.appendChild(btn);
    }
  });

  if (walletButtonsDiv.innerHTML === "") {
    messageEl.textContent = "⚠️ No supported wallets found.";
  } else {
    messageEl.textContent = "💡 Select your Cardano wallet to connect:";
  }
}

// ✅ Connect to wallet
async function connectWallet(walletName) {
  try {
    messageEl.textContent = `🔌 Connecting to ${walletName}...`;

    const wallet = window.cardano[walletName];
    if (!wallet) throw new Error(`${walletName} not found`);

    await wallet.enable();
    walletApi = await wallet.enable();
    selectedWallet = walletName;

    messageEl.textContent = `✅ Connected: ${walletName}`;

    // Get address
    const usedAddresses = await walletApi.getUsedAddresses();
    if (!usedAddresses || usedAddresses.length === 0)
      throw new Error("No used addresses found");

    const addrHex = usedAddresses[0];
    const addrBytes = Cardano.Address.from_bytes(
      Buffer.from(addrHex, "hex")
    );
    bech32Address = addrBytes.to_bech32();

    messageEl.textContent = `✅ Wallet connected: ${bech32Address.substring(0, 15)}...`;
    console.log("Bech32 Address:", bech32Address);

    showDelegateButton();
  } catch (err) {
    console.error("Wallet connection error:", err);
    messageEl.textContent = `❌ Wallet connection failed: ${err.message}`;
  }
}

// ✅ Show delegate button
function showDelegateButton() {
  delegateSection.innerHTML = "";
  const btn = document.createElement("button");
  btn.className = "delegate-btn";
  btn.textContent = "Delegate to PSP Pool";
  btn.onclick = submitDelegation;
  delegateSection.appendChild(btn);
}

// ✅ Call backend for delegation
async function submitDelegation() {
  try {
    messageEl.textContent = "⏳ Preparing delegation transaction...";

    // Fetch UTxOs
    const utxosRes = await fetch(`${API_BASE}utxos?address=${bech32Address}`);
    if (!utxosRes.ok) throw new Error(`UTxO fetch failed: ${utxosRes.status}`);
    const utxos = await utxosRes.json();

    // Get current epoch params
    const paramsRes = await fetch(`${API_BASE}epoch-params`);
    const params = await paramsRes.json();

    console.log("Fetched backend data", { utxos, params });

    // Create transaction (you can modify this later)
    const txBody = {
      address: bech32Address,
      poolId: "pool1w2duw0lk7lxjpfqjguxvtp0znhaqf8l2yvzcfd72l8fuk0h77gy", // replace with your PSP pool id
    };

    // Send to backend for transaction building
    const submitRes = await fetch(`${API_BASE}submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(txBody),
    });

    const result = await submitRes.json();

    if (!submitRes.ok) throw new Error(result.error || "Transaction failed");

    messageEl.textContent = `🎉 Delegation submitted! TxHash: ${result.txHash}`;
    console.log("Delegation success:", result);
  } catch (err) {
    console.error("Delegation error:", err);
    messageEl.textContent = `❌ Delegation failed: ${err.message}`;
  }
}

// Start app
detectWallets();
