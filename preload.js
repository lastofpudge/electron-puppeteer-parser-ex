window.ipcRenderer = require('electron').ipcRenderer;


document.addEventListener('DOMContentLoaded', () => {
  const startButton = document.getElementById("startScrapingButton");

  startButton.addEventListener("click", () => {
    const startPage = document.getElementById("startPageInput").value
    const endPage = document.getElementById("endPageInput").value
    const limit = document.getElementById("limit").value
    
    ipcRenderer.send("startScraping", { startPage, endPage, limit })
  });
});