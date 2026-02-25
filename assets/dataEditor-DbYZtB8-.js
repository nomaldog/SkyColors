import"./modulepreload-polyfill-B5Qt9EMX.js";const u=["cards.json","config.json","enemies.json","messages.json"],g=document.getElementById("editor-app");if(!g)throw new Error("#editor-app not found");const h=document.createElement("style");h.textContent=`
:root {
  color-scheme: dark;
  font-family: "Yu Gothic UI", "Meiryo", sans-serif;
}
* {
  box-sizing: border-box;
}
body {
  margin: 0;
  background: #0c111d;
  color: #dce5ff;
}
.data-editor {
  max-width: 1200px;
  margin: 0 auto;
  padding: 18px;
}
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-bottom: 10px;
}
.toolbar select,
.toolbar button {
  height: 36px;
  border: 1px solid #36415f;
  background: #151d31;
  color: #dce5ff;
  border-radius: 6px;
  padding: 0 12px;
  font-size: 14px;
}
.toolbar button {
  cursor: pointer;
}
.toolbar button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.spacer {
  flex: 1;
}
.dirty {
  min-width: 72px;
  text-align: right;
  font-weight: 700;
  font-size: 13px;
}
.dirty.clean {
  color: #75d798;
}
.dirty.dirtying {
  color: #ff9c9c;
}
.status {
  min-height: 24px;
  margin-bottom: 8px;
  font-size: 13px;
}
.status.info {
  color: #bcc8e8;
}
.status.ok {
  color: #79d997;
}
.status.error {
  color: #ff8e8e;
}
.editor {
  width: 100%;
  height: calc(100vh - 120px);
  min-height: 520px;
  resize: vertical;
  border: 1px solid #36415f;
  border-radius: 8px;
  background: #0a1020;
  color: #e9efff;
  padding: 12px;
  font-family: Consolas, Menlo, Monaco, monospace;
  font-size: 14px;
  line-height: 1.45;
}
`;document.head.appendChild(h);g.innerHTML=`
  <main class="data-editor">
    <div class="toolbar">
      <label for="file-select">JSON:</label>
      <select id="file-select"></select>
      <button id="reload-btn" type="button">再読込</button>
      <button id="validate-btn" type="button">検証</button>
      <button id="format-btn" type="button">整形</button>
      <button id="save-btn" type="button">保存 (Ctrl/Cmd+S)</button>
      <span class="spacer"></span>
      <span id="dirty-indicator" class="dirty clean">保存済み</span>
    </div>
    <div id="status" class="status info">初期化中...</div>
    <textarea id="json-editor" class="editor" spellcheck="false"></textarea>
  </main>
`;function i(t){const e=document.getElementById(t);if(!e)throw new Error(`#${t} not found`);return e}const s=i("file-select"),w=i("reload-btn"),x=i("validate-btn"),v=i("format-btn"),E=i("save-btn"),b=i("dirty-indicator"),m=i("status"),d=i("json-editor");for(const t of u){const e=document.createElement("option");e.value=t,e.textContent=t,s.appendChild(e)}let a=u[0],f="",r=!1;function l(){return d.value!==f}function o(t,e="info"){m.className=`status ${e}`,m.textContent=t}function c(){const t=l();b.textContent=t?"未保存あり":"保存済み",b.className=`dirty ${t?"dirtying":"clean"}`,s.disabled=r,w.disabled=r,x.disabled=r,v.disabled=r,E.disabled=r||!t}function p(){return JSON.parse(d.value)}function S(t){return`${JSON.stringify(t,null,2)}
`}async function k(t){if((t.headers.get("content-type")??"").includes("text/html"))return"JSON APIではなくHTMLが返りました。`npm run dev` または `npm run preview` で開いてください。";try{const n=await t.json();if(typeof n.error=="string"&&n.error.length>0)return n.error}catch{}return`${t.status} ${t.statusText}`}async function C(t){const e=await t.text();try{return JSON.parse(e)}catch{const n=e.slice(0,80).replace(/\s+/g," ").trim();throw new Error(`JSONレスポンス解析に失敗しました: ${n}`)}}async function y(t){r=!0,c(),o(`${t} を読み込み中...`);try{const e=await fetch(`__data-editor/file?name=${encodeURIComponent(t)}`);if(!e.ok)throw new Error(await k(e));const n=await C(e);a=t,s.value=t,d.value=n.content,f=n.content,o(`${t} を読み込みました`,"ok")}catch(e){o(`読込失敗: ${e instanceof Error?e.message:String(e)}`,"error")}finally{r=!1,c()}}function J(){try{p(),o("JSONは有効です","ok")}catch(t){o(`JSONエラー: ${t instanceof Error?t.message:String(t)}`,"error")}}function L(){try{const t=p();d.value=S(t),o("JSONを整形しました","ok"),c()}catch(t){o(`整形失敗: ${t instanceof Error?t.message:String(t)}`,"error")}}async function $(){let t;try{t=p()}catch(e){o(`保存前検証エラー: ${e instanceof Error?e.message:String(e)}`,"error");return}r=!0,c(),o(`${a} を保存中...`);try{const e=S(t),n=await fetch("__data-editor/file",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:a,content:e})});if(!n.ok)throw new Error(await k(n));d.value=e,f=e,o(`${a} を保存しました`,"ok")}catch(e){o(`保存失敗: ${e instanceof Error?e.message:String(e)}`,"error")}finally{r=!1,c()}}s.addEventListener("change",async()=>{const t=s.value;if(!u.includes(t)){s.value=a;return}if(l()&&!window.confirm("未保存の変更があります。破棄して切り替えますか？")){s.value=a;return}await y(t)});w.addEventListener("click",async()=>{l()&&!window.confirm("未保存の変更があります。破棄して再読込しますか？")||await y(a)});x.addEventListener("click",()=>{J()});v.addEventListener("click",()=>{L()});E.addEventListener("click",async()=>{await $()});d.addEventListener("input",()=>{c()});window.addEventListener("keydown",t=>{(t.ctrlKey||t.metaKey)&&t.key.toLowerCase()==="s"&&(t.preventDefault(),$())});window.addEventListener("beforeunload",t=>{l()&&(t.preventDefault(),t.returnValue="")});y(a);
