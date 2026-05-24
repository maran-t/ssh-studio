import { escapeHtml, showToast } from './ui.js';

// DOM Selectors
const transferListEl = () => document.querySelector("#transferList");

export function addTransferQueue(name, direction) {
  const id = "tx-" + Math.random().toString(36).substring(2, 9);
  const item = document.createElement("article");
  item.className = "transfer-item";
  item.id = id;
  
  item.innerHTML = `
    <strong>${escapeHtml(name)}</strong>
    <span>${direction} queueing...</span>
    <div class="progress"><i style="width: 0%;"></i></div>
    <div class="transfer-item-meta">
      <span class="transfer-speed">Pending...</span>
      <button class="transfer-cancel-btn" type="button">Cancel</button>
    </div>
  `;
  
  const cancelBtn = item.querySelector(".transfer-cancel-btn");
  cancelBtn.addEventListener("click", () => {
    item.remove();
    showToast(`Cancelled transfer of "${name}"`, "info");
  });

  const list = transferListEl();
  if (list) list.prepend(item);
  return id;
}

export function updateTransferProgress(id, percentage, status, isFailed = false) {
  const item = document.getElementById(id);
  if (!item) return;
  
  const progress = item.querySelector(".progress i");
  const text = item.querySelector("span");
  const speed = item.querySelector(".transfer-speed");
  
  if (progress) progress.style.width = `${percentage}%`;
  if (text) text.textContent = status;
  if (speed) {
    if (isFailed) {
      speed.textContent = "Failed";
      speed.style.color = "#ef5f57";
    } else if (percentage === 100) {
      speed.textContent = "Finished";
      speed.style.color = "#10b981";
    } else {
      speed.textContent = `${percentage}%`;
    }
  }
  
  if (isFailed || percentage === 100) {
    const cancel = item.querySelector(".transfer-cancel-btn");
    if (cancel) cancel.remove();
  }
}
