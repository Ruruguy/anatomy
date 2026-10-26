# Baby cranium

作者：nevitdilmen（Nevit Dilmen）

來源：[NIH 3D，3DPX-003169，Version 2](https://3d.nih.gov/entries/3DPX-003169?version=2)

授權：[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)

來源描述：13 個月幼兒、顱縫開放。此資料不代表 6 個月嬰兒、6 歲兒童或新生兒。來源摘要未明確提供影像方法、診斷或專家校核，本專案不宣稱其為正常標準或 NIH 認證。

GLB 原檔未修改；網頁只在顯示時旋轉、置中、等比縮放、改色。未平滑、補洞或減面，沒有增加或猜測骨塊標籤。

若分享模型或改作，須保留姓名標示、來源、授權與修改說明，並依 CC BY-SA 4.0 的相同方式分享條件處理。其他原創網站程式的授權不由這份模型授權說明自動決定。

取得於 2026-10-05；檔案校驗碼與下載路徑見 provenance.json。


# 新增研究來源模型（2026-10-26）

## IBA：6 個月與 60 個月腦皮質

Sahar Ahmad、Pew-Thian Yap（UNC-Chapel Hill），Surface-Volume Atlases of the Infant Brain, v1.0，https://zenodo.org/records/7044932 。CC BY-NC-SA 4.0：https://creativecommons.org/licenses/by-nc-sa/4.0/ 。論文：https://doi.org/10.1038/s41592-022-01703-z 。

使用 IBA-06Months 與 IBA-60Months 的左右 pial VTK。轉換成 GLB，保留來源頂點與拓撲，僅轉換座標軸、生成顯示法線；沒有平滑、簡化或生成腦回。GLB 衍生模型沿用 CC BY-NC-SA 4.0。這是研究群體圖譜，只有大腦皮質表面，並非完整腦部或單一病患解剖。

## PIPER：6 歲兒童行人模型

PIPER Child Pedestrian HBM 1.0.2；UCBL/Ifsttar、KTH、TU Berlin、PDB 等，足部來源含 CEESAR（CC BY 4.0）。https://gitlab.com/piper-project.org/child_pedestrian 。原始模型採 GNU GPL v3 或更新版本，附責任與 Open Science 條款；原文完整保存於 research-source/。

衍生 GLB 沿用原模型授權及附加條款。從原始有限元素節點與連接擷取外表面，四邊形對角剖為三角形；保留點位與部件名稱，僅轉換座標軸。未顯示梁元素、感測器及未具表面元素。這是生物力學模型的可視化，不是精細臨床圖譜。原始對應資料以 research-source/piper-6yo-source.tar.gz 提供，轉換程式在 ../tools/。

引用：Beillas et al., Development and performance of the PIPER scalable child human body models, Protection of Children in Cars (2016)；Peres, A pedestrian version of the PIPER 6 year old child model, IRCOBI (2018)。
