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
