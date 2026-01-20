import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  doc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/**
 * ============================
 * CONFIG
 * ============================
 */
const WIFE_PHONE_E164 = "5511976761117";

// LocalStorage keys
const LS_NOME = "buyer_nome";
const LS_APTO = "buyer_apto";
const LS_TORRE = "buyer_torre";

// Controle: quando abrir modal, se salvar deve abrir WhatsApp?
let pendingWhatsAfterSave = false;
let lastProductForWhats = null;

/**
 * ============================
 * HELPERS
 * ============================
 */
function moneyBR(v) {
  const n = Number(v || 0);
  return `R$ ${n.toFixed(2).replace(".", ",")}`;
}

function getBuyerData() {
  return {
    nome: (localStorage.getItem(LS_NOME) || "").trim(),
    apto: (localStorage.getItem(LS_APTO) || "").trim(),
    torre: (localStorage.getItem(LS_TORRE) || "").trim(),
  };
}

function setBuyerData({ nome, apto, torre }) {
  localStorage.setItem(LS_NOME, (nome || "").trim());
  localStorage.setItem(LS_APTO, (apto || "").trim());
  localStorage.setItem(LS_TORRE, (torre || "").trim());
}

function buyerDataComplete() {
  const { nome, apto, torre } = getBuyerData();
  return Boolean(nome && apto && torre);
}

function currentProductUrl() {
  // Garante link completo (bom para WhatsApp)
  return window.location.href;
}

function mensagemWhatsApp(produto, urlProduto) {
  const { nome, apto, torre } = getBuyerData();

  return `
Oi! 😊
Tenho interesse nesse produto.

Nome: ${nome}
Apto: ${apto}
Torre: ${torre}

Link do anúncio: ${urlProduto}
`.trim();
}

function linkWhatsApp(produto) {
  const urlProduto = currentProductUrl();
  const text = mensagemWhatsApp(produto, urlProduto);
  return `https://wa.me/${WIFE_PHONE_E164}?text=${encodeURIComponent(text)}`;
}

/**
 * ============================
 * HOME: LISTAGEM
 * ============================
 */
export async function carregarProdutos() {
  const grid = document.getElementById("productGrid");
  if (!grid) return;

  grid.innerHTML = "";

  const q = query(
    collection(db, "produtos"),
    where("status", "==", "disponivel"),
    orderBy("criadoEm", "desc")
  );

  const snap = await getDocs(q);

  snap.forEach(docSnap => {
    const p = docSnap.data();
    const id = docSnap.id;

    const foto = Array.isArray(p.fotos) && p.fotos.length ? p.fotos[0] : "";

    const a = document.createElement("a");
    a.className = "card";
    a.href = `item.html?id=${id}`;

    a.innerHTML = `
      ${foto ? `<img src="${foto}" alt="${p.titulo || ""}">` : `<div style="height:170px;"></div>`}
      <div class="card-body">
        <div class="card-title">${p.titulo || "Produto"}</div>
        <div class="card-meta">${p.tamanho || ""}</div>
        <div class="card-price">${moneyBR(p.preco)}</div>
      </div>
    `;

    grid.appendChild(a);
  });
}

/**
 * ============================
 * ITEM PAGE: PRODUTO + OUTROS + WHATS
 * ============================
 */
export async function carregarProdutoPage() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  if (!id) return;

  const container = document.getElementById("produto");
  const btnWhats = document.getElementById("btnWhats");

  const snap = await getDoc(doc(db, "produtos", id));
  if (!snap.exists()) {
    if (container) container.innerHTML = `<div class="meta2">Produto não encontrado.</div>`;
    return;
  }

  const produto = { id: snap.id, ...snap.data() };
  lastProductForWhats = produto;

  if (container) {
    const fotos = Array.isArray(produto.fotos) ? produto.fotos : [];
    const fotosHtml = fotos.map(f => `<img src="${f}" alt="foto">`).join("");

    container.innerHTML = `
      <div class="photos">${fotosHtml}</div>
      <div class="title2">${produto.titulo || ""}</div>
      <div class="meta2">${produto.tamanho || ""}</div>
      <div class="price2">${moneyBR(produto.preco)}</div>
      ${produto.descricao ? `<div class="desc">${produto.descricao}</div>` : ""}
    `;
  }

  if (btnWhats) {
    btnWhats.onclick = () => {
      // Se não tiver dados, abre modal e depois abre WhatsApp
      if (!buyerDataComplete()) {
        pendingWhatsAfterSave = true;
        abrirModalDados({ openWhatsAfterSave: true });
        return;
      }
      window.location.href = linkWhatsApp(produto);
    };
  }

  await carregarOutrosProdutos(id);
}

/**
 * OUTROS ITENS
 */
async function carregarOutrosProdutos(idAtual) {
  const grid = document.getElementById("relatedGrid");
  if (!grid) return;

  grid.innerHTML = "";

  const q = query(
    collection(db, "produtos"),
    where("status", "==", "disponivel"),
    orderBy("criadoEm", "desc"),
    limit(12)
  );

  const snap = await getDocs(q);
  const lista = [];
  snap.forEach(d => {
    if (d.id === idAtual) return;
    lista.push({ id: d.id, ...d.data() });
  });

  lista.slice(0, 8).forEach(p => {
    const foto = Array.isArray(p.fotos) && p.fotos.length ? p.fotos[0] : "";
    const a = document.createElement("a");
    a.className = "card";
    a.href = `item.html?id=${p.id}`;

    a.innerHTML = `
      ${foto ? `<img src="${foto}" alt="${p.titulo || ""}">` : `<div style="height:170px;"></div>`}
      <div class="card-body">
        <div class="card-title">${p.titulo || "Produto"}</div>
        <div class="card-meta">${p.tamanho || ""}</div>
        <div class="card-price">${moneyBR(p.preco)}</div>
      </div>
    `;
    grid.appendChild(a);
  });
}

/**
 * ============================
 * MODAL DADOS (Nome/Apto/Torre)
 * ============================
 */

// Essa função abre/fecha o modal e conecta o "Salvar e abrir WhatsApp"
export function abrirModalDados(opts = {}) {
  const backdrop = document.getElementById("modalBackdrop");
  if (!backdrop) return;

  const close = Boolean(opts.close);
  if (close) {
    backdrop.style.display = "none";
    pendingWhatsAfterSave = false;
    return;
  }

  backdrop.style.display = "flex";

  // Preenche com dados já salvos, se tiver
  const { nome, apto, torre } = getBuyerData();
  const mNome = document.getElementById("mNome");
  const mApto = document.getElementById("mApto");
  const mTorre = document.getElementById("mTorre");

  if (mNome) mNome.value = nome;
  if (mApto) mApto.value = apto;
  if (mTorre) mTorre.value = torre;

  // Clique fora para fechar (opcional)
  backdrop.onclick = (e) => {
    if (e.target === backdrop) {
      backdrop.style.display = "none";
      pendingWhatsAfterSave = false;
    }
  };

  // Intercepta o botão "Salvar e abrir WhatsApp" (em item.html já chama setPendingWhatsApp(true))
  const btnSalvar = document.getElementById("modalSalvar");
  if (btnSalvar) {
    btnSalvar.onclick = () => {
      const nn = (mNome?.value || "").trim();
      const aa = (mApto?.value || "").trim();
      const tt = (mTorre?.value || "").trim();

      if (!nn || !aa || !tt) {
        alert("Preencha Nome, Apartamento e Torre.");
        return;
      }

      setBuyerData({ nome: nn, apto: aa, torre: tt });
      backdrop.style.display = "none";

      if (pendingWhatsAfterSave && lastProductForWhats) {
        pendingWhatsAfterSave = false;
        window.location.href = linkWhatsApp(lastProductForWhats);
      } else {
        pendingWhatsAfterSave = false;
      }
    };
  }
}

// Permite que o item.html marque que deve abrir WhatsApp após salvar
export function setPendingWhatsApp(v) {
  pendingWhatsAfterSave = Boolean(v);
}
