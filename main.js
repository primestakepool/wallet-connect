// main.js
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("connectWalletBtn");
  const delegateBtn = document.getElementById("delegateBtn");

  if (!btn || !delegateBtn) {
    console.error("Button elements not found!");
    return;
  }

  // Convert hex address to bech32
  function hexToBech32(hexAddress) {
    try {
      const addr = Cardano.Address.from_bytes(Buffer.from(hexAddress, "hex"));
      return addr.to_bech32();
    } catch (err) {
      console.error("Invalid address hex:", hexAddress, err);
      return null;
    }
  }

  btn.onclick = async () => {
    try {
      if (!window.cardano || !window.cardano.yoroi) {
        console.error("Yoroi wallet not found");
        return;
      }

      const walletApi = await window.cardano.yoroi.enable();

      // Get used addresses
      const addresses = await walletApi.getUsedAddresses(); // Returns array of hex addresses
      const firstAddress = addresses[0];
      const bech32Address = hexToBech32(firstAddress);

      console.log("Connected:", bech32Address);
      alert("Connected wallet: " + bech32Address);
    } catch (err) {
      console.error("Wallet connection error:", err);
    }
  };

  delegateBtn.onclick = async () => {
    try {
      // Example delegation logic
      alert("Delegation function triggered. Add your backend API call here.");
    } catch (err) {
      console.error("Delegation error:", err);
    }
  };
});
