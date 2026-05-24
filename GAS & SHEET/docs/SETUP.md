# eGerak PPD Manjung — 部署指南（一次性）

> **语言约定**：本文件及 `docs/` 内技术文档用**中文**（给 USTP / 开发维护）。**Web App 界面、OPR 正文、官员看到的提示**保持**马来文**。

---

## A. 创建 Master 试算表

1. 打开 [script.google.com](https://script.google.com) → **新建项目**。
2. 将 `apps-script/` 下所有文件复制到项目（或在本机执行 `clasp push`，见 README）。
3. 在编辑器中选择函数 **`setupMasterSpreadsheet`** → **运行**。
4. 在**执行日志**中复制 **Spreadsheet ID** 和 URL。
5. **项目设置 → Script properties** 添加：
   - `EGerak_SPREADSHEET_ID` = 上一步的 ID  
   （运行 `setupMasterSpreadsheet` 时通常已自动写入，请核对。）
6. **菜单 eGerak**：独立脚本项目默认**没有**试算表菜单。创建/配置好表后，在 [script.google.com](https://script.google.com) 运行一次 **`installSpreadsheetMenuTrigger`**（或 **`installEgerakSpreadsheetAutomation`**），再刷新试算表。详见 FAQ「找不到 eGerak 菜单」。
7. 可选：把 Apps Script **绑定**到该试算表（`.clasp.json` 加 `parentId` 后 `clasp push`）。
8. 底部若有多余的 **Sheet1**（Google 默认空白页）：**可以删除**，脚本不会用到；只保留 `Users`、`Pergerakan`、`Rancangan_Tahunan`、`Room_Log`、`Audit`。

---

## B. Google 日历（eMARS 已有 ID）

部门日历 ID 见 [`calendar/calendar.txt`](../calendar/calendar.txt) 与 [`calendar/calendar-ids.md`](../calendar/calendar-ids.md)。

| 用途 | Script Property | 说明 |
|------|-----------------|------|
| **总日历 TAKWIM（Main）** | `EGerak_CAL_MASTER` | 嵌入链接里第 8 个日历，**不在** calendar.txt 的 8 个部门里 |
| 各部门 | `EGerak_CAL_<部门名>` | 已与 `Config.gs` 中 `SEKTOR` 对应 |
| Dewan Bestari | `EGerak_CAL_DEWAN` | 需另建房间日历后填写 |
| Bilik Budiman | `EGerak_CAL_BUDIMAN` | 同上 |

**Main 日历 ID（写入 `MASTER`）：**

```
c_5458a401004ee468862942871b65f87819427db963d7fe1542b979ec13e4b463@group.calendar.google.com
```

### 一键写入日历配置（推荐）

1. `clasp push` 上传最新 `Config.gs`（已含 eMARS 各部门 + Main）。
2. 在 Apps Script 运行 **`applyEmarsCalendarFromConfig`**（在 `SheetSetup.gs`）。
3. 执行日志应显示 `eMARS calendar IDs applied`。

### 手动写入（可选）

在编辑器运行（ID 已写在 `Config.gs` 时可改用上面的「一键」）：

```javascript
applyEmarsCalendarFromConfig();
// 或
setCalendarIds({
  MASTER: 'c_5458a401004ee468862942871b65f87819427db963d7fe1542b979ec13e4b463@group.calendar.google.com',
  DEWAN_BESTARI: '你的 Dewan 日历 ID',
  BILIK_BUDIMAN: '你的 Bilik 日历 ID',
  SEKTOR: EGerakConfig.CALENDARS.SEKTOR
});
```

**权限**：每个日历需对 PPD 官员开放**查看**；运行脚本的账号需有**修改活动**权限。

---

## C. Script Properties（密钥与配置）

路径：**Apps Script → 项目设置（齿轮）→ 脚本属性 → 添加脚本属性**。

| 属性名 | 说明 | 如何获取 |
|--------|------|----------|
| `EGerak_SPREADSHEET_ID` | Master 试算表 ID | `setupMasterSpreadsheet` 日志或试算表 URL 中段 |
| `EGerak_CAL_MASTER` | 总日历 | 见上文 Main ID；或运行 `applyEmarsCalendarFromConfig` |
| `EGerak_CAL_*` | 部门日历 | 同上「一键」 |
| `GEMINI_API_KEY` | Gemini API 密钥 | [Google AI Studio](https://aistudio.google.com) → Get API key |
| `GEMINI_MODEL` | 可选，默认 `gemini-2.0-flash` | 不填则用代码默认值 |
| `EGerak_OPR_TEMPLATE_DOC_ID` | OPR 模板 | **必须是 Google 文档**（见下方 .docx 说明），不是仅上传的 Word 文件 |
| `EGerak_OPR_FOLDER_ID` | 生成 OPR **存入的文件夹** | 必须是**文件夹** URL：`.../drive/folders/XXXXXXXX`（**不要**填文档 ID） |
| `EGerak_PHOTO_ROOT` | OPR 照片归档根文件夹 ID | 同上 |
| `EGerak_ADMIN_EMAIL` | 日历同步异常告警邮箱 | 如 USTP 维护人员邮箱 |

**注意**：不要把 `GEMINI_API_KEY` 写进 `Config.gs` 或提交到 Git。

### OPR 模板 Doc 占位符（生成时替换）

详见 [OPR_TEMPLATE.md](./OPR_TEMPLATE.md)。模板正文建议用马来文，占位符保持英文键名：

```
{{NAMA}} {{JAWATAN}} {{SEKTOR}}
{{URUSAN}} {{LOKASI}} {{TARIKH}}
{{DAPATAN}} — ISU/DAPATAN  
{{RUMUSAN}} — IMPAK  
{{REFLEKSI}} — REFLEKSI / TINDAK SUSUL / PENAMBAHBAIKAN（勿再用 `{{NOTA_AI}}`，可保留于模板中作兼容）  
{{GAMBAR_1}} … {{GAMBAR_5}}
```

已有 Pergerakan 表请在 `rumusan_draft` 与 `source` 之间新增列 **`refleksi_draft`**。

---

## D. 部署 Web App（官员入口）

1. **部署** → **新建部署** → 类型选 **网页应用**。
2. **执行身份**：访问网页应用的用户（`USER_ACCESSING`）。
3. **访问权限**：仅 [你的组织] 域内用户。
4. 复制 **网页应用 URL**，发给官员（界面为马来文）。

每次改 `WebApp.html` 或后端逻辑后需 **新版本部署** 或更新现有部署版本。

### 部署时「执行身份」选什么？（重要）

| 选项（界面可能是英文） | 是否选用 | 说明 |
|------------------------|----------|------|
| **访问网页应用的用户** / User accessing the web app | **选这个** | 每位官员用自己的 Google 账号登录；`Users` 表按**其邮箱**校验；日历写在**其个人日历** |
| **我** / Execute as: Me (yourself) | **不要选** | 所有人都会变成用你的账号跑脚本，官员邮箱对不上、权限混乱 |

**访问权限**怎么选：

| 选项（英文界面） | 谁能打开链接 | 建议 |
|------------------|--------------|------|
| **仅 [你的组织] 内用户** / Only within your domain | 与**部署此脚本的那个 Google Workspace 网域**相同的公司邮箱（例如全是 `@ppdmanjung.edu.my`） | **首选**：PPD 同事都在同一域时用这个 |
| **任何拥有 Google 账号的用户** / Anyone with Google account | 任意 `@gmail.com`、`@moe.gov.my` 等，只要能用 Google 登录 | 仅当官员邮箱**不在** PPD 那一域、但必须用本系统时考虑 |
| **仅我自己** | 只有你能开 | 不要用于正式发放 |

**`@moe.gov.my` 能不能用？**

- 可以打开的前提：访问权限不能是「仅 PPD 域内」——若官员登录的是 **MOE 中央 Workspace（@moe.gov.my）**，而脚本部署在 **PPD 自己的域**，则必须选 **Anyone with Google account**（或把 MOE 账号也纳入同一 Workspace，由 IT 统一，那是另一类方案）。
- 即使用 `@moe.gov.my` 能打开网页，仍须在 **Users** 表里登记该邮箱，且 `aktif=TRUE`，否则会提示未注册。
- **MOE 总部 IT** 可能禁止校外/非白名单 Apps Script 应用；上线前让 MOE/PPD IT 确认是否允许「以访问者身份执行」的第三方 Web App。
- **安全**：「任何 Google 账号」范围更大，链接泄露时理论上更多账号能尝试打开（仍需登录 Google）；正式环境更推荐 **域内 + 域内账号**，或 MOE 规定的共享方式。

**执行身份**仍选 **访问网页应用的用户**，与访问权限是两项不同设置。

### 日历为什么官员账号写不进去？（重要）

Web App 若选 **「访问网页应用的用户」**：

| 日历 | 谁需要权限 | 做法 |
|------|------------|------|
| **官员个人日历** | 官员本人 | 提交时自动写入（一般成功） |
| **部门 + TAKWIM + Dewan/Bilik** | **USTP / 部署脚本的账号** | 官员通常**没有**编辑共享日历权限 → **不能**靠官员账号写入 |

**现方案（已实现）：**

1. 官员提交 → 先写入 **Pergerakan 表** + **个人日历**（若有）。  
2. **部门 / 总日历 / 房间** 标为待同步，由 **USTP 账号** 在后台写入。  
3. USTP 同步共享日历（见下方 **「找不到 eGerak 菜单？」**）。  

**USTP 必须先：**

- 用 **自己的 MOE/PPD 账号** 打开 [script.google.com](https://script.google.com) 并 **拥有该脚本项目**；  
- 在 Google Calendar 里对 **9 个共享日历** 有 **「修改活动」** 权限（与 eMARS 相同那些 ID）；  
- 安装定时触发器后，触发器会以 **安装者（USTP）** 身份运行，而不是官员。

**不要**把 Web App 改成「以我身份执行」来迁就日历——那样会变成所有活动都写在 USTP 个人日历里，官员个人日历反而错了。

**显示**：日历活动一律建为 **全天（色块）**；具体几点到几点写在活动说明第一行 `Masa: …`（与 Pergerakan 表一致）。跨日外出会占满涉及的所有日期。

**Cuti / Bercuti**（`jenis` 含 cuti/bercuti）：**不写入任何 Google 日历**（个人 / 部门 / TAKWIM / 房间均无）；只记在 **Pergerakan** 表。旧记录若已有日历活动，再跑 `syncSharedCalendarsDeployer` 会清掉。

---

## E. 登记用户

在 Master 试算表 **Users** 工作表填写每位官员：

| 列 | 示例 |
|----|------|
| email | `nama@ppdmanjung.edu.my` |
| nama | `EN. ...` |
| jawatan | 职务（马来文） |
| sektor | 须与 `Config.gs` 里 `SEKTOR` 键名一致，如 `UNIT SUMBER TEKNOLOGI PENDIDIKAN (USTP)` |
| peranan | `Pengguna` / `Admin` / `Pentadbir` |
| aktif | `TRUE` |

---

## F. 可选：触发器与批量导入

| 功能 | 做法 |
|------|------|
| 每日日历对账 | 触发器 → 时间驱动 → 每天 06:00 → 函数 `reconcileCalendarsDaily` |
| 年初批量活动 | 试算表 **Rancangan_Tahunan** 填好后，菜单 **eGerak → Import Rancangan Tahunan**（需 Admin） |

---

## G. Looker Studio（TAKWIM 看板）

按 [LOOKER_TAKWIM.md](./LOOKER_TAKWIM.md) 连接 **Pergerakan** 表并嵌入 Main 日历。该文档目前为马来文步骤标题，可按中文注释理解操作。

---

## H. 测试 OPR 完整流程（建议用你自己的 Workspace 账号先测）

### 测试前准备

1. Script Properties 已设：`GEMINI_API_KEY`、`EGerak_OPR_TEMPLATE_DOC_ID`、`EGerak_OPR_FOLDER_ID`（可选 `EGerak_PHOTO_ROOT`）。
2. OPR 模板 Doc 里黄色行占位符为 **`{{REFLEKSI}}`**（或保留 `{{NOTA_AI}}` 也可兼容）。
3. **Users** 表有一行：email = **你当前浏览器登录的 Google 邮箱**，`aktif` = `TRUE`。
4. **Pergerakan** 表有列 `refleksi_draft`（没有则在 `rumusan_draft` 右侧插入一列）。
5. Web App 已按上一节部署，用**无痕窗口**或另一浏览器打开 URL（确保已登录 PPD/MOE 账号）。

### 操作步骤

| 步骤 | 做什么 | 预期结果 |
|------|--------|----------|
| 1 | 打开 Web App URL → **Semak Sesi & Masuk** | 进入主页，左侧显示你的名字 |
| 2 | **+ Isi Pergerakan** → 填活动 → **Hantar** | 提示成功；**Pergerakan Saya** 出现一条 |
| 3 | **Pergerakan Saya** → 该条右侧点 **Jana** | 弹出 **Jana OPR** 窗口 |
| 4 | （可选）上传 1～2 张测试照片 | — |
| 5 | （可选）**Nota ringkas** 写一两句马来文要点 | — |
| 6 | 点 **Jana Dapatan, Impak & Refleksi (Gemini)** | 等待几秒；三栏有马来文草稿（无 Key 则 dapatan 里会有提示文字） |
| 7 | 人工改三栏文字 | — |
| 8 | 点 **Jana Dokumen OPR** | 新开标签页打开 Google Doc；Drive 目标文件夹里有副本 |
| 9 | 打开生成的 Doc | 表格中 DAPATAN、IMPAK、REFLEKSI 行有内容；照片占位符有图或已清空 |

### 若失败怎么查

1. Apps Script → **执行** → 看最近一次 `apiOprDraft` / `apiOprFinal` 是否报错。
2. 常见错误：
   - `Akaun tidak berdaftar` → Users 表 email 与当前登录邮箱不一致。
   - `OPR template ID belum dikonfigurasi` → 未设 `EGerak_OPR_TEMPLATE_DOC_ID`。
   - `Tiada kebenaran` → 模板/文件夹需分享给执行脚本的账号（用「访问用户」时即每位官员需能打开模板？）  
     **建议**：模板与 OPR 文件夹分享给 **整个 PPD 域** 或 **脚本项目所有者**，并给「查看者」；生成时用**你的账号**复制模板需你对模板有**查看**权、对文件夹有**编辑**权。若用 USER_ACCESSING，**每位生成 OPR 的官员**也应对模板有读取权限（把模板 Doc 设为域内「知道链接的人可查看」或共享给 `@ppdmanjung.edu.my`）。
3. Gemini 无内容：检查 `GEMINI_API_KEY` 与执行日志里的 `Gemini:` 信息。

### 只测 Gemini、不部署网页时

在 Apps Script 编辑器可手动运行 `generateOprDraft` 较难（需构造参数）；**仍建议用 Web App 测**，与官员实际路径一致。

---

## I. 部署检查清单

- [ ] `setupMasterSpreadsheet` 成功，Users / Pergerakan 等表已创建  
- [ ] `applyEmarsCalendarFromConfig` 已运行（或 Script Properties 日历项齐全）  
- [ ] `GEMINI_API_KEY`、OPR 模板与文件夹 ID 已设置  
- [ ] Web App 已部署，测试账号能登录并 **Isi Pergerakan**  
- [ ] 选 Dewan Bestari / Bilik Budiman 时房间日历有冲突检测（需先填房间日历 ID）  
- [ ] 试生成 OPR：Gemini 草稿 → 编辑 → **Jana Dokumen OPR**

---

## J. 常见问题

**Q：按 Padam 没反应，但 Audit 有 `DELETE_PERGERAKAN`？**

A：删除是**软删除**（把 `aktif` 设为 `FALSE`），不是删行。若表头没有 **`aktif`** 列，或写在错列，网页仍会显示该条。

1. 在 **Pergerakan** 第 1 行确认有列 **`aktif`**（没有则在最后一列右侧添加表头 `aktif`，已删的行填 `FALSE`）。
2. `clasp push --force` + **部署新版本 Web App**（已修复按表头写 `aktif`、列表会隐藏 `FALSE`）。
3. 删除成功会弹出 **「Berjaya padam N rekod」**；若显示 0，检查是否勾选左侧复选框。

**Q：OPR 生成了但里面仍是 `{{NAMA}}` 等占位符，并弹窗 `The document is inaccessible`？**

A：模板是 **Word（.docx）** 时，`makeCopy` 只会复制成 .docx，**`DocumentApp` 无法打开替换占位符**，于是出现「文档无法访问」且占位符原样保留。

**推荐做法（选一种）：**

1. **转成 Google 文档（推荐）**  
   - 在 Drive 打开 [OPR eGerak](https://docs.google.com/document/d/1R9R3ddS-82LmxDd_AFchWTqaSh-2CuOB/edit)  
   - **文件 → 另存为 Google 文档**（或「保存为 Google 文档」）  
   - 打开**新**生成的 Google 文档，复制 URL 里的 ID → 更新 `EGerak_OPR_TEMPLATE_DOC_ID`  
   - 删除 Drive 里那些只含占位符、打不开的旧 .docx 副本（可选）

2. **启用 Drive 高级服务自动转换**  
   - Apps Script 编辑器 → **服务**（+）→ **Google Drive API** → 添加  
   - `clasp push` 后重新部署；代码会用 `convert: true` 把 .docx 转成 Google Doc 再替换  

3. **共享**：转换后的模板 + OPR 文件夹 → 官员 MOE 邮箱 **编辑者**。

`clasp push` + **新版本部署** 后再点 **Jana Dokumen OPR**。

**Q：点「Jana Dokumen OPR」报错 `getFolderById` / Unexpected error？**

A：几乎都是 **`EGerak_OPR_FOLDER_ID` 填错或文件夹未共享**给当前登录账号（如 `xxx@moe.gov.my`）。

1. **两个 ID 不要混用**  
   - 模板：`/document/d/模板ID/...` → 写入 `EGerak_OPR_TEMPLATE_DOC_ID`  
   - 存放目录：`/drive/folders/文件夹ID` → 写入 `EGerak_OPR_FOLDER_ID`  
   - 若把文档 ID 填进 **FOLDER**，就会触发 `getFolderById` 错误。
2. 在 Drive 新建文件夹「OPR eGerak」，右键 **共享** → 你的 MOE 邮箱 → **编辑者**。
3. 模板 Doc 也要共享给同一账号（至少查看者；生成副本建议编辑者）。
4. Script Properties 可暂时**删掉** `EGerak_OPR_FOLDER_ID` 做测试（会存到该账号 **我的云端硬盘** 根目录）— 正式使用仍建议指定文件夹。
5. 部署为 **访问网页应用的用户** 时，是**每位官员自己的账号**去访问文件夹，因此文件夹要共享给**会用 OPR 的每个邮箱**（或域内群组）。

**Q：Pergerakan 表有数据，但网页「Senarai Pergerakan Saya (0)」空白？**

A：

1. **`clasp push` + 部署新版本**（已修复：返回数据里的 `Date` 不能传给网页，会导致列表加载失败）。
2. 确认 **Pergerakan** 表第 1 行表头含 `email`、`aktif`；建议在 `rumusan_draft` 后加列 **`refleksi_draft`**，最后一列 **`aktif`** = `TRUE`。
3. 该行 `email` 与 **Users** 表、当前登录 MOE 邮箱一致（全小写亦可）。
4. 刷新 Web App → 再点 **Pergerakan Saya**。

**Q：`Rancangan_Tahunan` 里只有 `PENDING`、其它列空的？**

A：正常。**即时填写**走 Web App → 数据在 **Pergerakan** 表（你已有那行）。**Rancangan_Tahunan** 只用于**年初批量**：填好多行后，在试算表菜单 **eGerak → Import Rancangan Tahunan** 才会导入，不会自动处理单个 PENDING 占位行。

**Q：点「Semak Sesi & Masuk」弹出 `You do not have permission to access the requested document`？**

A：几乎都是 **Master 试算表 / 模板 / 文件夹未共享**给当前登录账号，与「是不是 MOE」无直接关系。

1. 打开 Master 试算表（`EGerak_SPREADSHEET_ID` 对应那份）→ **共享**。
2. 加入官员使用的邮箱（如 `xxx@moe.gov.my`），权限至少 **编辑者**（要写入 Pergerakan）或 **查看者**（若仅测登录可先查看者，正式使用建议编辑者）。
3. 或对 **MOE 域** 开放：`moe.gov.my` 域内知道链接者可编辑（视 IT 政策）。
4. 创建试算表的账号若与个人 Gmail 混用：MOE 账号**默认看不到**只分享给 Gmail 的表，必须显式共享给 MOE 邮箱。
5. OPR 模板 Doc、OPR 文件夹、照片文件夹同样要共享给会使用 OPR 的人。
6. 改共享后刷新 Web App，再点 **Semak Sesi & Masuk**；首次可能还要点 **授权**（允许访问试算表、日历等）。

**Q：用私人 Gmail 还是 MOE？会影响脚本次数吗？**

A：**正式环境用 MOE / PPD Workspace（推荐）**；私人 Gmail 只适合个人调试。

| | MOE / PPD Workspace | 私人 Gmail |
|--|---------------------|------------|
| 官员日常登录 | 与学校/PPD 政策一致 | 不适合作为单位系统账号 |
| 试算表、日历共享 | 域内策略由 IT 管理 | 与 MOE 账号跨域，易再出现「无权限」 |
| Apps Script 配额 | 教育/政府域通常较高 | 消费者账号配额较低（每日运行时间等更紧） |
| Web App 部署 | 你当前链接已是 `moe.gov.my` 宏，应用应部署在单位域 | 若用 Gmail 部署，MOE 用户仍要能访问所有资源 |

脚本**执行次数**主要看：**谁部署项目**、**执行身份**（访问者）、以及 Google 对该项目/用户的每日配额；不是「MOE 会更少次」。用 **User accessing** 时，部分操作计入**每位访问者**的配额。

**结论**：继续用 **MOE 账号**测试与上线；把 Master Sheet、模板、文件夹 **共享给该 MOE 邮箱**（或整个域），不要改用私人 Gmail 规避权限（除非整份表改由该 Gmail 创建且只给自己测）。

**Q：`setupMasterSpreadsheet` 报错 rows do not match？**  
A：请 `clasp push` 最新 `SheetSetup.gs`（已修正 `getRange` 行数）。

**Q：官员提示「Akaun tidak berdaftar」？**  
A：其 Google 邮箱未在 **Users** 表或 `aktif` 不是 `TRUE`。

**Q：打开 Master 试算表，找不到顶部菜单「eGerak」？**

A：很常见。用 **clasp** 推送的往往是 **独立脚本项目**（在 [script.google.com](https://script.google.com) 打开），**不会**自动在试算表上出现菜单。试算表里 **扩展程序 → Apps Script** 若打开的是**另一个空项目**，也看不到 eGerak 菜单。

**办法一（推荐，一次即可）——在 script.google.com 运行：**

1. 打开与 `clasp` 相同的项目（`.clasp.json` 里的 `scriptId`）。  
2. 确认 **项目设置 → 脚本属性** 已有 `EGerak_SPREADSHEET_ID`（= Master 试算表 URL 里那段 ID）。  
3. 在函数下拉选 **`installSpreadsheetMenuTrigger`** → **运行** → 按提示授权。  
4. **关闭并重新打开** Master 试算表（刷新页面）。  
5. 顶部应出现 **eGerak** 菜单；再点 **Sync Kalendar…** 或 **Pasang auto-sync kalendar (10 min)**。

若报错 `script.scriptapp` / `getProjectTriggers` 权限不足：先 **`clasp push`** 更新 `appsscript.json`（已含该 scope），再在编辑器 **重新运行** 同一函数，按提示 **重新授权**（会多一项「管理部署」类权限）。

也可一次跑 **`installEgerakSpreadsheetAutomation`**（同时装菜单触发器 + 每 10 分钟日历同步）。

**办法二（不装菜单）——仍在 script.google.com 运行：**

| 要做的事 | 选的函数 |
|----------|----------|
| 立刻同步部门/TAKWIM/房间日历 | `syncSharedCalendarsDeployer` |
| 每 10 分钟自动同步 | `installCalendarSyncTrigger` |

运行后看 **执行** 日志是否成功；首次需授权日历与试算表。

**办法三（长期）——把脚本绑在试算表上：**

在 `.clasp.json` 增加 `"parentId": ["你的试算表ID"]` 后 `clasp push`，或按上文 A.6 把代码放到试算表容器脚本里。绑定后 `onOpen` 也可能直接出菜单（仍建议跑过一次 `installSpreadsheetMenuTrigger` 更稳）。

**Q：日历没有活动？**  
A：检查 Script Properties 中 `EGerak_CAL_*`、**运行 `syncSharedCalendarsDeployer` 的 USTP 账号**对该日历是否有**编辑**权限；官员提交后共享日历要等 USTP 同步（见上文日历章节）。

**Q：Gemini 无输出？**  
A：确认 `GEMINI_API_KEY`；查看执行日志中 `Gemini:` 错误信息。
