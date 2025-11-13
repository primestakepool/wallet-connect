// main.js

const btn = document.getElementById("connectWalletBtn");
const delegateBtn = document.getElementById("delegateBtn");

let walletApi = null;
let userAddressBech32 = null;

// Convert hex address from Yoroi to Bech32
function hexToBech32(hexAddress) {
  try {
    const bytes = Buffer.from(hexAddress, "hex");
    const baseAddr = Cardano.BaseAddress.from_bytes(bytes);
    return baseAddr.to_address().to_bech32();
  } catch (err) {
    console.error("Invalid address hex:", hexAddress, err);
    return null;
  }
}

// Connect wallet
btn.onclick = async () => {
  if (!window.cardano || !window.cardano.yoroi) {
    alert("Yoroi wallet not detected!");
    return;
  }

  try {
    walletApi = await window.cardano.yoroi.enable();
    const usedAddresses = await walletApi.getUsedAddresses(); // returns hex
    if (!usedAddresses || usedAddresses.length === 0) {
      console.error("No used addresses found");
      return;
    }

    userAddressBech32 = hexToBech32(usedAddresses[0]);
    if (!userAddressBech32) return;

    console.log("Connected address:", userAddressBech32);
    alert("Wallet connected: " + userAddressBech32);
  } catch (err) {
    console.error("Wallet connection error:", err);
  }
};

// Fetch UTxOs from backend
async function fetchUTxOs(address) {
  try {
    const res = await fetch(`https://cardano-wallet-backend.vercel.app/api/utxos?address=${address}`);
    if (!res.ok) throw new Error(`UTxO fetch failed: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error(err);
    return null;
  }
}

// Submit delegation
delegateBtn.onclick = async () => {
  if (!userAddressBech32) {
    alert("Connect wallet first!");
    return;
  }

  try {
    const utxos = await fetchUTxOs(userAddressBech32);
    if (!utxos) throw new Error("No UTxOs found");

    const txData = {
      address: userAddressBech32,
      utxos: utxos,
      poolId: "YOUR_POOL_ID_HERE"
    };

    const res = await fetch("https://cardano-wallet-backend.vercel.app/api/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(txData)
    });

    if (!res.ok) throw new Error(`Delegation failed: ${res.status}`);
    const result = await res.json();
    console.log("Delegation successful:", result);
    alert("Delegation submitted successfully!");
  } catch (err) {
    console.error("Delegation error:", err);
    alert("Delegation failed: see console");
  }
};

