// main.js
import { Address, RewardAddress, BaseAddress } from "https://cdn.jsdelivr.net/npm/@emurgo/cardano-serialization-lib-browser@11.0.0/build/cardano_serialization_lib.min.js";

const messageEl = document.getElementById("message");
const walletButtonsEl = document.getElementById("wallet-buttons");
const delegateSectionEl = document.getElementById("delegate-section");

let walletApi;
let userAddress;

// List of wallets you want to support
const wallets = [
  { name: "Nami", api: window.nami },
  { name: "Yoroi", api: window.yoroi },
  { name: "GeroWallet", api: window.gerowallet },
];

// Helper: hex -> Bech32
function hexToBech32(hex) {
  try {
    const addr = Address.from_bytes(Buffer.from(hex, "hex"));
    return addr.to_bech32();
  } catch (err) {
    console.error("Invalid address hex:", hex, err);
    return null;
  }
}

// Create wallet buttons dynamically
wallets.forEach((wallet) => {
  if (!wallet.api) return;

  const btn = document.createElement("button");
  btn.textContent = `Connect ${wallet.name}`;
  btn.onclick = async () => {
    await connectWallet(wallet.api, wallet.name);
  };
  walletButtonsEl.appendChild(btn);
});

async function connectWallet(api, name) {
  try {
    await api.enable();
    walletApi = api;

    let hexAddress;

    if (name === "Yoroi") {
      // Yoroi: getChangeAddress() returns a hex
      hexAddress = await walletApi.getChangeAddress();
    } else {
      // Nami/GeroWallet
      const usedAddresses = await walletApi.getUsedAddresses();
      hexAddress = usedAddresses[0];
    }

    userAddress = hexToBech32(hexAddress);

    if (!userAddress) {
      messageEl.innerText = `${name} wallet does not have a Shelley-era address (addr1...).`;
      return;
    }

    messageEl.innerText = `Connected: ${userAddress}`;
    showDelegateButton();
  } catch (err) {
    console.error("Wallet connection error:", err);
    messageEl.innerText = `Wallet connection error: ${err.message}`;
  }
}

// Show the delegate button after connecting
function showDelegateButton() {
  delegateSectionEl.innerHTML = "";
  const btn = document.createElement("button");
  btn.textContent = "Delegate ADA";
  btn.className = "delegate-btn";
  btn.onclick = submitDelegation;
  delegateSectionEl.appendChild(btn);
}

// Submit delegation request
async function submitDelegation() {
  if (!userAddress) {
    messageEl.innerText = "Connect a wallet first!";
    return;
  }

  try {
    messageEl.innerText = "Preparing delegation...";

    // 1. Fetch UTxOs from backend
    const utxoRes = await fetch(
      `https://cardano-wallet-backend.vercel.app/api/utxos?address=${userAddress}`
    );
    if (!utxoRes.ok) throw new Error("Failed to fetch UTxOs");
    const utxos = await utxoRes.json();

    // 2. Fetch epoch params
    const paramsRes = await fetch(
      `https://cardano-wallet-backend.vercel.app/api/epoch-params`
    );
    if (!paramsRes.ok) throw new Error("Failed to fetch epoch params");
    const epochParams = await paramsRes.json();

    // 3. Build delegation payload (depends on your backend API)
    const payload = {
      address: userAddress,
      utxos,
      epochParams,
    };

    // 4. Submit delegation
    const submitRes = await fetch(
      "https://cardano-wallet-backend.vercel.app/api/submit",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    if (!submitRes.ok) {
      const errText = await submitRes.text();
      throw new Error(errText);
    }

    messageEl.innerText = "Delegation transaction submitted!";
  } catch (err) {
    console.error("Delegation error:", err);
    messageEl.innerText = `Delegation error: ${err.message}`;
  }
}
