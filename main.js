import { Lucid, Transaction } from "https://cdn.jsdelivr.net/npm/lucid-cardano@0.10.7/web/mod.js";

// ----------------------------------
// CONFIG
// ----------------------------------
const BACKEND_URL = "https://wallet-proxy-pi.vercel.app/api/epoch-params";
const POOL_ID = "pool1w2duw0lk7lxjpfqjguxvtp0znhaqf8l2yvzcfd72l8fuk0h77gy"; // your pool ID

// ----------------------------------
// DOM ELEMENTS
// ----------------------------------
const messageEl = document.getElementById("message");
const buttonsContainer = document.getElementById("wallet-buttons");

let lucid;
let walletApi;

// ----------------------------------
// MAIN
// ----------------------------------
async function main() {
    messageEl.textContent = "Detecting wallets…";

    if (!window.cardano) {
        messageEl.textContent = "No Cardano wallet found. Please install Nami, Yoroi, Lace, or Flint.";
        return;
    }

    const walletNames = Object.keys(window.cardano);
    if (walletNames.length === 0) {
        messageEl.textContent = "No Cardano wallet found. Please unlock or install a wallet.";
        return;
    }

    messageEl.textContent = "Select your wallet to delegate:";
    buttonsContainer.innerHTML = "";

    walletNames.forEach(name => {
        const btn = document.createElement("button");
        btn.textContent = name.toUpperCase();
        btn.onclick = () => connectWallet(name);
        buttonsContainer.appendChild(btn);
    });

    console.log("Detected wallets:", walletNames);
}

// ----------------------------------
// CONNECT WALLET
// ----------------------------------
async function connectWallet(name) {
    try {
        messageEl.textContent = `Connecting to ${name}…`;
        walletApi = await window.cardano[name].enable();

        // Get protocol parameters from backend
        const res = await fetch(BACKEND_URL);
        if (!res.ok) throw new Error("Failed to fetch protocol parameters");
        const protocolParams = await res.json();

        // Initialize Lucid with protocol params from backend
        lucid = await Lucid.new(
            async () => protocolParams, // <-- function returning protocol params
            "Mainnet"
        );
        lucid.selectWallet(walletApi);

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

// ----------------------------------
// ADD "DELEGATE NOW" BUTTON
// ----------------------------------
function showDelegateButton(address) {
    const delegateBtn = document.createElement("button");
    delegateBtn.textContent = "Delegate Now";
    delegateBtn.style.cssText = "display:block;margin-top:20px;padding:10px 25px;font-size:16px;";
    delegateBtn.onclick = () => delegateToPool(address);
    buttonsContainer.appendChild(delegateBtn);
}

// ----------------------------------
// DELEGATION LOGIC
// ----------------------------------
async function delegateToPool(address) {
    try {
        messageEl.textContent = "Building delegation transaction…";

        // Build delegation transaction
        const tx = await lucid.newTx()
            .delegateTo(address, POOL_ID)
            .complete();

        messageEl.textContent = "Signing transaction…";
        const signedTx = await tx.sign().complete();

        messageEl.textContent = "Submitting to network…";
        const txHash = await signedTx.submit();

        messageEl.textContent = `🎉 Delegation submitted! Tx hash: ${txHash}`;
        console.log("Delegation transaction hash:", txHash);
    } catch (err) {
        console.error("Delegation error:", err);
        messageEl.textContent = `❌ Delegation failed: ${err.message}`;
    }
}

// ----------------------------------
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", main);
} else {
    main();
}
