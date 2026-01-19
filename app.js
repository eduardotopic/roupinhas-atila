import { db } from "./firebase.js";
import {
  collection,
  query,
  orderBy,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const grid = document.getElementById("productGrid");

// restaura scroll ao voltar da PDP
const savedScroll = sessionStorage.getItem("scrollY");
if (savedScroll) {
  window.scrollTo(0, parseInt(savedScroll, 10));
  sessionStorage.removeItem("scrollY");
}

function formatBRL(value) {
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  } catch {
    return `R$ ${value}`;
  }
}

function createCard(p) {
  const card = document.createElement("div");
  card.className = "card";

  const photos = Array.isArray(p.fotos) ? p.fotos.filter(Boolean) : [];
  const img = document.createElement("img");
  let imgIndex = 0;

  img.src = photos[0] || "https://picsum.photos/300/300?fallback";

  // swipe simples (se tiver mais de 1 foto)
  let startX = 0;
  img.addEventListener("touchstart", e => (startX = e.touches[0].clientX));
  img.addEventListener("touchend", e => {
    const diff = e.changedTouches[0].clientX - startX;
    if (Math.abs(diff) > 40 && photos.length > 1) {
      imgIndex = (imgIndex + 1) % photos.length;
      img.src = photos[imgIndex];
    }
  });

  // abre PDP
  img.onclick = () => {
    sessionStorage.setItem("scrollY", String(window.scrollY));
    location.href = `item.html?id=${p.id}`;
  };

  const content = document.createElement("div");
  content.className = "card-content";

  const badge = p.status === "reservado"
    ? `<div class="badge">Reservado 💛</div>`
    : "";

  content.innerHTML = `
    <h3>${p.titulo || "Sem título"}</h3>
    <div class="size">Tam: ${p.tamanho || "-"}</div>
    <div class="price">${formatBRL(p.preco ?? 0)}</div>
    ${badge}
  `;

  card.appendChild(img);
  card.appendChild(content);

  return card;
}

// Lê produtos em tempo real
const q = query(collection(db, "produtos"), orderBy("criadoEm", "desc"));

onSnapshot(q, (snap) => {
  grid.innerHTML = "";

  snap.forEach(doc => {
    const data = doc.data();

    // vendido não aparece para cliente
    if (data.status === "vendido") return;

    grid.appendChild(createCard({ id: doc.id, ...data }));
  });
});
