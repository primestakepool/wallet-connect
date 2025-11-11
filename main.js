import { Lucid } from "https://cdn.jsdelivr.net/npm/lucid-cardano@0.10.7/web/mod.js";

// Backend URL (already deployed on Vercel)
const BACKEND_URL = "https://wallet-proxy-five.vercel.app/api/epoch-params";

const messageEl = document.getElementById("message");
const buttonsContainer = document.getElementById("wallet-buttons");

async function main() {
  // Check if Cardano wallets exist
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

  // Create buttons for each detected wallet
  walletNames.forEach(walletName => {
    const btn = document.createElement("button");
    btn.textContent = walletName.toUpperCase();

    btn.onclick = async () => {
      try {
        messageEl.textContent = `Connecting to ${walletName}...`;
        const walletApi = await window.cardano[walletName].enable();

        // Fetch epoch parameters from your backend
        const epochParamsRes = await fetch(BACKEND_URL);
        const epochParams = await epochParamsRes.json();

        // Initialize Lucid with the wallet API and epoch params
        const lucid = await Lucid.new(undefined, "Mainnet"); // Using undefined provider; backend will handle Blockfrost
        lucid.selectWallet(walletApi);

        messageEl.textContent = `${walletName} connected! Epoch params loaded.`;
        console.log("Wallet API:", walletApi);
        console.log("Epoch params from backend:", epochParams);

        // Here you can proceed to build your transaction and delegate
        // For example:
        // const tx = await lucid.buildTx({...});
        // const signedTx = await lucid.signTx(tx);
        // const txHash = await lucid.submitTx(signedTx);

      } catch (err) {
        console.error(err);
        messageEl.textContent = `Failed to connect ${walletName}: ${err.message}`;
      }
    };

    buttonsContainer.appendChild(btn);
  });

  console.log("Detected wallets:", walletNames);
}

// Run main once DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", main);
} else {
  main();
}
