# 圍棋入門教室（GO-classroom）

從零開始學圍棋的網頁程式，架在 Google Apps Script（GAS）上，也可以直接開 `out/preview.html` 單機使用。

## 內容

- **課程**：十八課分三級（規則與吃子 → 戰術與死活 → 全局與實戰），每課有課文、圖例與練習。
- **固定題庫**：課程題目、額外題目與死活題庫（`ldgen.js` 由眼形產生並經求解程式驗算）。
- **無限練習**：程式隨機出題並驗算答案，包括數氣、提子、叫吃、逃跑、雙叫吃、征子與枷、補斷點、死活判斷、做活與殺棋、數目。
- **經典題庫**：1526 題，分一到三星。
  - Go Game Guru Weekly Go Problems：420 題，附完整變化，原作者講解已翻譯成中文。
  - 《官子譜》：1106 題，依正解手數分級。
- **詳解**：每一手都有程式自動產生的說明（叫吃、提子、打劫、破眼、連接、分斷、氣數）；有原作者講解的題目會一併顯示。
- **電腦對弈**：9／13／19 路，入門與進階兩種電腦。
- 進度存在瀏覽器，也會同步到使用者自己的 Google 帳號（GAS UserProperties）。

## 檔案結構

| 路徑 | 說明 |
| --- | --- |
| `src/engine.js` | 規則、吃子搜尋、局部死活求解、數地 |
| `src/ai.js` | 電腦對手（規則式與 MCTS） |
| `src/gen.js` | 無限練習的出題程式 |
| `src/lessons.js`、`src/problems.js` | 課程、參考來源、固定題庫 |
| `src/ld_bank.js` | 死活題庫（由 `ldgen.js` 產生） |
| `src/classic_data.js` | 經典題庫（由 `tools/classic_build.js` 產生） |
| `src/app.js` | 介面與練習邏輯 |
| `src/index.src.html` | 頁面外殼與樣式 |
| `src/Code.gs` | GAS 後端：`doGet`、進度讀寫 |
| `out/gas/` | 建置好的 GAS 專案檔案（直接貼進 Apps Script） |
| `out/preview.html` | 單一檔案版本 |

## 建置

```sh
# 1. 取得經典題庫的原始資料（只有要重新產生 classic_data.js 時才需要）
mkdir -p ext && cd ext
git clone --depth 1 https://github.com/gogameguru/go-problems   # 使用 commit eee12b2
git clone --depth 1 https://github.com/tasuki/tsumego           # 使用 commit 3e69319
cd ..
node tools/classic_build.js     # 產生 src/classic_data.js
node tools/classic_verify.js    # 用規則引擎檢查每一手都合法，裁切後的提子結果與全盤一致

# 2. 組合輸出檔案
python3 build.py                # 產生 out/gas/* 與 out/preview.html
```

重新產生死活題庫：`node ldgen.js`。

## 部署到 Google Apps Script

1. 在 Apps Script 專案裡建立 `Code.gs`，以及 `index`、`lib`、`content`、`ldbank`、`classic`、`app` 六個 HTML 檔，內容分別貼上 `out/gas/` 對應的檔案。
2. 部署 → 新增部署作業 → 網頁應用程式；執行身分選「存取網頁應用程式的使用者」，存取權選「所有已登入 Google 帳戶的使用者」。

## 來源與授權

請見 [NOTICE.md](NOTICE.md)。經典題庫中的 Go Game Guru 題目與其中文翻譯採 **CC BY-NC-SA 4.0**，只能用於非商業用途。
