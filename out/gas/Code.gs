/**
 * 圍棋入門教室 - Google Apps Script 網頁應用程式
 *
 * 專案裡需要的檔案：Code.gs、index.html、lib.html、content.html、ldbank.html、app.html
 * 部署：部署 > 新增部署作業 > 類型「網頁應用程式」
 *   執行身分：存取網頁應用程式的使用者（每個人的進度存在自己的 Google 帳號）
 *   誰可以存取：擁有 Google 帳戶的任何使用者
 */
var PROGRESS_KEY = 'weiqi_state_v2';

function doGet() {
  return HtmlService.createTemplateFromFile('index').evaluate()
    .setTitle('圍棋入門教室')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// 把其他 HTML 檔的內容嵌進 index.html
function include(name) {
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}

// 讀取目前使用者的學習進度（存在該使用者自己的 UserProperties）
function loadProgress() {
  return PropertiesService.getUserProperties().getProperty(PROGRESS_KEY) || '';
}

// 儲存目前使用者的學習進度；單一值上限約 9KB
function saveProgress(json) {
  if (typeof json !== 'string' || json.length > 9000) throw new Error('進度資料格式不正確或太大');
  JSON.parse(json);
  PropertiesService.getUserProperties().setProperty(PROGRESS_KEY, json);
  return true;
}
