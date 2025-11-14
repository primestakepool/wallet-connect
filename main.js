// ================= CHECK CSL AND START APP ===================
window.addEventListener("load", async () => {
  const messageEl = document.getElementById("message");
  const walletButtonsDiv = document.getElementById("wallet-buttons");
  const delegateSection = document.getElementById("delegate-section");

  if (!window.Cardano) {
    console.error("❌ CSL NOT LOADED!");
    messageEl.textContent = "⚠️ Serialization library not loaded!";
    return;
  }
  console.log("✅ CSL Loaded:", window.Cardano);

  const API_BASE = "https://cardano-wallet-backend.vercel.app/api/";
  const SUPPORTED_WALLETS = ["nami", "eternl", "yoroi", "lace"];
  let selectedWallet = null;
  let walletApi = null;
  let bech32Address = null;

  const sleep = ms => new Promise(res => setTimeout(res, ms));

  // ================= WALLET DETECTION ===================
  async function detectWallets() {
    messageEl.textContent = "🔍 Detecting wallets...";

    let attempts = 0;
    while (attempts < 20) {
      if (window.cardano && Object.keys(window.cardano).length > 0) {
        console.log("Wallets detected:", window.cardano);
        break;
      }
      await sleep(300);
      attempts++;
    }

    if (!window.cardano || Object.keys(window.cardano).length === 0) {
      messageEl.textContent = "⚠️ No Cardano wallets detected.";
      return;
    }

    renderWalletButtons();
  }

  // ================= RENDER WALLET BUTTONS ===================
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

  // ================= CONNECT WALLET ===================
  async function connectWallet(walletName) {
    try {
      messageEl.textContent = `🔌 Connecting to ${walletName}...`;

      const wallet = window.cardano[walletName];
      if (!wallet) throw new Error(`${walletName} not found`);

      walletApi = await wallet.enable();
      selectedWallet = walletName;

      // Get wallet address
      const usedAddresses = await walletApi.getUsedAddresses();
      if (!usedAddresses || usedAddresses.length === 0)
        throw new Error("No used addresses found");

      const addrHex = usedAddresses[0];

      // Convert hex → bech32 in browser
      const addrBytes = window.Cardano.Address.from_bytes(
        Uint8Array.from(addrHex.match(/.{1,2}/g).map(b => parseInt(b, 16)))
      );
      bech32Address = addrBytes.to_bech32();

      messageEl.textContent = `✅ Connected: ${bech32Address.substring(0, 15)}...`;

      showDelegateButton();
    } catch (err) {
      console.error("Wallet connection error:", err);
      messageEl.textContent = `❌ Wallet connection failed: ${err.message}`;
    }
  }

  // ================= SHOW DELEGATE BUTTON ===================
  function showDelegateButton() {
    delegateSection.innerHTML = "";

    const btn = document.createElement("button");
    btn.className = "delegate-btn";
    btn.textContent = "Delegate to PSP Pool";
    btn.onclick = submitDelegation;

    delegateSection.appendChild(btn);
  }

  // ================= SUBMIT DELEGATION ===================
  async function submitDelegation() {
    try {
      messageEl.textContent = "⏳ Preparing delegation...";

      const utxosRes = await fetch(`${API_BASE}utxos?address=${bech32Address}`);
      const utxos = await utxosRes.json();

      const paramsRes = await fetch(`${API_BASE}epoch-params`);
      const params = await paramsRes.json();

      const body = {
        address: bech32Address,
        poolId: "pool1w2duw0lk7lxjpfqjguxvtp0znhaqf8l2yvzcfd72l8fuk0h77gy",
      };

      const submitRes = await fetch(`${API_BASE}submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = await submitRes.json();

      if (!submitRes.ok) throw new Error(result.error);

      messageEl.textContent = `🎉 Delegation submitted! TxHash: ${result.txHash}`;
    } catch (err) {
      console.error("Delegation error:", err);
      messageEl.textContent = `❌ Delegation failed: ${err.message}`;
    }
  }

  // ================= START APP ===================
  detectWallets();
});
