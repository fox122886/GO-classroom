# 來源與授權說明

## 本專案自行撰寫的部分

課文、比喻、圖例、課程題目、固定題庫、無限練習出題程式、死活題庫產生程式、規則引擎、電腦對手與介面，都是本專案自行撰寫。課程的主題範圍與先後順序參考了下列教材（只參考結構，沒有使用其題目或內文）；各課參考了哪些來源，列在 `src/lessons.js` 的 `SOURCES` 與 `LESSON_REFS`，網頁的「資源」頁也有列出：

- British Go Association：Beginners' Puzzle Sheets、Teaching Go to Beginners
- American Go Association：The Way to Go
- 《速成圍棋：入門篇》、《曹薰鉉和李昌鎬圍棋教室・初級篇》（付費書籍，只參考章節順序）
- Online Go Server：Learn to Play Go

## 經典題庫（`src/classic_data.js`、`tools/classic_notes_*.json`）

### Go Game Guru：Weekly Go Problems

- 來源：https://github.com/gogameguru/go-problems （commit `eee12b2e39d59dbe81a8b9eaa7d4f103978d9224`）
- 作者：An Younggil（職業八段）、David Ormerod，Go Game Guru
- 授權：Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International（CC BY-NC-SA 4.0），https://creativecommons.org/licenses/by-nc-sa/4.0/
- 本專案的修改：
  - 裁切盤面，轉成精簡的互動格式。
  - 依原作者的 easy／intermediate／hard 分成一到三星。
  - 把原作者的英文講解翻譯成中文（`tools/classic_notes_zh.json`）。英文原文保存在 `tools/classic_notes_en.json`。
- 依照「相同方式分享」條款，上述改作（題目資料與中文翻譯）同樣以 **CC BY-NC-SA 4.0** 提供，不得用於商業用途。

### 《官子譜》

- 明代過百齡原著，清代陶式玉編注，屬公有領域。
- SGF 資料：由 Flygo 整理，Ulrich Goertz 在 https://www.u-go.net/classic/ 發布並註明可轉載。本專案使用 https://github.com/tasuki/tsumego （commit `3e6931959f13d33fc390ad8adbaabc301e4dd404`）收錄的版本，以及該專案去除重複後的 1107 題編號（`books/sources/guanzi-pu/source-map.csv`）。
- 本專案的修改：
  - 原書多為白先，本專案把黑白對調成黑先。
  - 依正解手數分成一到三星。
  - 每一手的文字說明由程式自動產生，不是原書內容。

### 未收錄

《玄玄棋經》目前找不到附答案、授權又清楚的公開資料，所以沒有收錄。

## 第三方服務

網頁使用 Google Fonts 載入字型。
