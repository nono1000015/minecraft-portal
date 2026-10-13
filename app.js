(() => {
  const cfg = window.MC_SITE_CONFIG || {};
  const $ = (id) => document.getElementById(id);
  const address = cfg.serverAddress || "mc.example.net";
  $("serverAddress").textContent = address;

  let toastTimer;
  function toast(text) {
    const el = $("toast");
    el.textContent = text;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
  }

  $("copyIp").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(address);
      toast("IP скопирован: " + address);
    } catch {
      const area = document.createElement("textarea");
      area.value = address; document.body.appendChild(area);
      area.select(); document.execCommand("copy"); area.remove();
      toast("IP: " + address);
    }
  });

  async function refreshStatus() {
    const dot = $("statusDot");
    try {
      const response = await fetch(cfg.statusUrl, {cache: "no-store"});
      if (!response.ok) throw new Error("status unavailable");
      const data = await response.json();
      const online = Boolean(data.online);
      dot.className = "dot " + (online ? "online" : "offline");
      const text = online
        ? `Онлайн · ${data.players?.online ?? "?"}/${data.players?.max ?? "?"}`
        : "Сервер офлайн";
      $("statusText").textContent = text;
      $("heroStatus").textContent = text;
    } catch {
      dot.className = "dot";
      $("statusText").textContent = "Статус недоступен";
      $("heroStatus").textContent = "Не удалось получить статус";
    }
  }
  refreshStatus();
  setInterval(refreshStatus, 60000);

  function safeText(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    node.textContent = text;
    return node;
  }
  function addChat(entry) {
    const log = $("chatLog");
    if (log.querySelector(".system-line")) log.innerHTML = "";
    const row = document.createElement("div");
    row.className = "chat-line";
    row.append(
      safeText("span", "time", `[${entry.time || new Date().toLocaleTimeString("ru-RU", {hour:"2-digit",minute:"2-digit"})}] `),
      safeText("span", "kind", `${entry.kind || "EVENT"} `),
      safeText("span", "player", entry.player ? `${entry.player}: ` : ""),
      safeText("span", "message", entry.message || "")
    );
    log.appendChild(row);
    while (log.children.length > 250) log.firstElementChild.remove();
    log.scrollTop = log.scrollHeight;
  }

  // SSE: backend отправляет игровые события из Paper-плагина.
  function connectEventStream() {
    const source = new EventSource("/events");
    source.onmessage = (event) => {
      try { addChat(JSON.parse(event.data)); } catch {}
    };
    source.onerror = () => {
      // EventSource переподключается автоматически.
    };
  }
  connectEventStream();

  async function loadNews() {
    try {
      const response = await fetch(cfg.newsUrl || "/news.json", {cache:"no-store"});
      if (!response.ok) throw new Error("news unavailable");
      const news = await response.json();
      const root = $("newsList");
      root.innerHTML = "";
      news.forEach(item => {
        const card = document.createElement("article");
        card.className = "news-card";
        card.appendChild(safeText("div", "news-date", item.date || ""));
        card.appendChild(safeText("h3", "", item.title || "Без заголовка"));
        card.appendChild(safeText("p", "", item.text || ""));
        if (item.image && /^https?:\/\//i.test(item.image)) {
          const img = document.createElement("img");
          img.src = item.image; img.alt = item.title || "Изображение новости"; img.loading = "lazy";
          card.appendChild(img);
        }
        root.appendChild(card);
      });
    } catch {
      $("newsList").textContent = "Не удалось загрузить новости. Проверь news.json.";
    }
  }
  loadNews();

  const mapUrl = (cfg.mapUrl || "").trim();
  if (mapUrl && /^https?:\/\//i.test(mapUrl)) {
    const frame = document.createElement("iframe");
    frame.src = mapUrl;
    frame.title = "Интерактивная карта Minecraft";
    frame.loading = "lazy";
    frame.allowFullscreen = true;
    $("mapFrame").replaceChildren(frame);
    $("openMap").href = mapUrl;
  } else {
    $("openMap").addEventListener("click", e => {
      e.preventDefault();
      toast("Укажи mapUrl в website/config.js");
    });
    $("openMap").href = "#";
  }
})();
