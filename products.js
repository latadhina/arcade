/* Product catalog — Store listings and local product art */
window.LATA_PRODUCTS = [
  {
    id: "clario-studio",
    name: "CLARIO Studio",
    blurb: "Local transcription and mute/bleep — private on your PC.",
    tile: "assets/products/clario-studio/tile.png",
    shot: "assets/products/clario-studio/shot.png",
    logo: "assets/products/clario-studio/logo.png",
    storeDeep: "ms-windows-store://pdp/?productid=9NR703SWNXND",
    storeWeb: "https://apps.microsoft.com/detail/9NR703SWNXND?hl=en-US&gl=US",
    cta: "Get on Microsoft Store"
  },
  {
    id: "clario-clip",
    name: "CLARIO Clip",
    blurb: "Transcript-based vertical clips with burned captions.",
    tile: "assets/products/clario-clip/tile.png",
    shot: "assets/products/clario-clip/shot.png",
    logo: "assets/products/clario-clip/logo.png",
    storeDeep: "ms-windows-store://pdp/?productid=9PDVV4QLXM87",
    storeWeb: "https://apps.microsoft.com/detail/9PDVV4QLXM87?hl=en-US&gl=US",
    cta: "Get on Microsoft Store"
  },
  {
    id: "livecloud",
    name: "LIVECLOUD",
    blurb: "Share files on your Wi‑Fi — QR access, no cloud upload.",
    tile: "assets/products/livecloud/tile.png",
    shot: "assets/products/livecloud/shot.png",
    logo: "assets/products/livecloud/logo.png",
    storeDeep: "ms-windows-store://pdp/?productid=9N14ZQ6ZL972",
    storeWeb: "https://apps.microsoft.com/detail/9N14ZQ6ZL972?hl=en-US&gl=US",
    cta: "Get on Microsoft Store"
  }
];

/** Prefer Store deep link on Windows; otherwise web listing. */
window.lataStoreUrl = function (p) {
  var isWin = /Windows/i.test(navigator.userAgent || "");
  if (isWin && p.storeDeep) return p.storeDeep;
  return p.storeWeb;
};
