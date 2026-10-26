# Anatomy｜成人・兒童・嬰兒解剖教室

**開啟網站：https://ruruguy.github.io/anatomy/**

整合成人全身／右上肢與兒童、嬰兒解剖教學。在上方切換教室；模型位於中央，知識說明在下方全寬區塊。支援平移、旋轉、系統探索、構造選取與教學問答。兒科教室可匯入本機模型、切換清晰材質並儲存教學包。

切換教室保留本次開啟的狀態。匯入模型、筆記和教學包不會自動上傳；關閉頁面前請自行下載儲存。

## 模型與授權

成人來源模型、13 個月幼兒顱骨與兒科幾何示意的適用範圍不同。成人模型不會縮小當成兒科模型；兒科示意未經精細解剖校核。來源收錄不代表醫學認證。

完整作者、來源、改作與授權見 [ATTRIBUTION.md](docs/ATTRIBUTION.md) 與 [THIRD_PARTY_LICENSES.txt](docs/THIRD_PARTY_LICENSES.txt)。部分素材有非商業限制，不能將本專案視為全部可無限制商用或全部採 MIT 授權。

## 原始碼與建置

- `site/`：共用導覽、橫向閱讀版型與背景動畫暫停。
- `source/adult/`：成人原始碼、模型、授權及既有編譯檔。
- `source/pediatric/`：兒童／嬰兒原始碼、模型及授權。
- `docs/`：GitHub Pages 正式部署內容。

僅重新包裝已編譯的成人教室、兒科原始碼與共用介面，不需安裝 Node.js：

```
python3 build-pages.py
```

另產生可雙擊的完整離線 HTML：

```
python3 build.py
```

修改成人 React 原始碼後，需先依成人子專案的建置流程更新 `source/adult/docs/`。共用版型或兒科內容修改則直接執行上述 Python 指令即可。

## GitHub Pages

設定 main 分支的 `/docs` 資料夾。網站不需要後端、API 金鑰或第三方模型帳號。

```
node validation/test-pages.mjs
```

建置、檔案與切換邏輯可由程式檢查；不等同醫學精度驗證。實際 WebGL 顯示及觸控效果仍需在支援 WebGL 的瀏覽器確認。

## 醫療教育視覺更新（2026-10-26）

成人預設開啟組合狀態的全身來源模型，可切換灰白標本，並在選取構造後單獨觀察、恢復周圍構造。改善霧面材質與光影，區分腦部和周邊神經的顯示色；色彩用於教學識別。兩個教室共用深藍模型區、淺色橫向教材與高對比文字。兒科提高既有曲面的取樣，不代表增加經核對的解剖結構。所有來源模型原始檔及授權均保留。

## 兒科研究來源模型（2026-10-26）

兒童教室預設開啟 PIPER 6 歲全身來源模型（286 個表面分件，並非 286 個器官）；另有 IBA 6 個月與 60 個月（5 歲）MRI 腦皮質。兩套腦皮質各有左右半球、655,360 個三角面，頂點逐一比對來源，只作座標軸轉換。6 個月和 5 歲形狀並非等比縮放。只含皮質外表面，不包含腦幹、小腦、腦室或功能區。

PIPER 為生物力學有限元素模型，有幾何簡化與缺少構造，不是精細臨床圖譜，也不代表嬰兒。預設隱藏外層皮膚、填充軟組織及部分重疊層；系統篩選只使用來源已有表面。舊版另標為「簡化示意（舊版）」。

IBA 原作者 Sahar Ahmad、Pew-Thian Yap（UNC-Chapel Hill），資料集 https://zenodo.org/records/7044932 ，衍生模型沿用 CC BY-NC-SA 4.0。PIPER 原始模型與衍生表面遵循原 GPLv3 或更新版本以及責任／Open Science 附加條款，來源 https://gitlab.com/piper-project.org/child_pedestrian 。原始資料、完整通知與校驗碼見 source/pediatric/models/research-source/ 和 research-provenance.json，轉換程式見 source/pediatric/tools/。模型授權互相獨立，不代表整個網站都採同一授權。

線上版按需載入新 GLB，避免一次載入全部模型。離線單檔約 105 MiB。來源模型及打包檢查可執行：

```
python3 build.py
python3 build-pages.py
node --experimental-loader ./source/pediatric/validation/model-loader.mjs ./validation/test-research-models.mjs
```
