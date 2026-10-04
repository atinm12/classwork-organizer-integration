// Placeholder wiring. Canvas OAuth and third party syncing will be added later.

const STORAGE_KEY = "classwork-sites";

const dialog = document.getElementById("site-dialog");
const form = document.getElementById("site-form");
const list = document.getElementById("site-list");
const empty = document.getElementById("site-empty");

function loadSites() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveSites(sites) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sites));
  } catch {
    // Storage unavailable; sites just won't persist.
  }
}

let sites = loadSites();

function render() {
  list.innerHTML = "";
  sites.forEach((site, i) => {
    const li = document.createElement("li");
    const link = document.createElement("a");
    link.href = site.url;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = site.name;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "secondary";
    remove.textContent = "Remove";
    remove.addEventListener("click", () => {
      sites.splice(i, 1);
      saveSites(sites);
      render();
    });
    li.append(link, remove);
    list.append(li);
  });
  empty.hidden = sites.length > 0;
}

document.getElementById("add-site").addEventListener("click", () => {
  form.reset();
  dialog.showModal();
});

document.getElementById("cancel-site").addEventListener("click", () => dialog.close());

form.addEventListener("submit", () => {
  const data = new FormData(form);
  sites.push({ name: data.get("name").trim(), url: data.get("url").trim() });
  saveSites(sites);
  render();
});

document.getElementById("connect-canvas").addEventListener("click", () => {
  document.getElementById("canvas-status").textContent =
    "Canvas integration coming soon.";
});

render();
