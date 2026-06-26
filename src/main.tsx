import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

function isUnsupportedBrowser() {
  const userAgent = window.navigator.userAgent;
  return /MSIE|Trident/.test(userAgent) || !window.Promise || !window.fetch || !window.localStorage;
}

const root = document.getElementById("root") as HTMLElement;

if (isUnsupportedBrowser()) {
  root.innerHTML = `
    <main class="unsupported-browser">
      <section>
        <h1>浏览器版本过旧</h1>
        <p>本游戏不支持 IE，请使用最新版 Chrome / Edge / Safari 打开。</p>
      </section>
    </main>
  `;
} else {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
