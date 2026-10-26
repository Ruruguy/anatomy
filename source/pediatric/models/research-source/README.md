# 研究來源與重建

IBA 原始 pial VTK 以 gzip 無損保存，對應原始 ZIP 的 MD5 與表面 SHA256 在上層 research-provenance.json。完整資料及授權見 https://zenodo.org/records/7044932 。

PIPER 幾何與部件定義以 piper-6yo-source.tar.gz 保存，授權與附加條款見本目錄的 PIPER 文件。模型來源 https://gitlab.com/piper-project.org/child_pedestrian 。

轉換工具在 ../../tools/。使用 Python 與 numpy；IBA 腳本參數為包含官方 IBA-06Months.zip / IBA-60Months.zip 的目錄。PIPER 腳本參數為解開 tar.gz 後包含 piper-source/ 的目錄。輸出到其 converted/。

只建立表面視覺化，沒有改動模型點位以模擬不同年齡。生物力學模型不等於臨床解剖圖譜。
