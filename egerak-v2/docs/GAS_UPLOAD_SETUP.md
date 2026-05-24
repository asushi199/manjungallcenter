# 用 Google Apps Script 上传 OPR 照片（无需 Service Account JSON）

适合：**单位 Google 组织禁止创建 Service Account 密钥**（`iam.managed.disableServiceAccountKeyCreation`）的情况。

eGerak 服务器把图片 POST 到你的 GAS Web App → 脚本用 **PPD 官方 Google 账号** 写入 Drive 文件夹。

---

## 你需要准备

1. PPD 的 Google 账号（能登录 Drive）
2. 一个 Drive 文件夹，例如 `eGerak OPR Photos`
3. 约 15 分钟

---

## 第一步：建文件夹并记下 Folder ID

1. 打开 [Google Drive](https://drive.google.com)，用 PPD 账号登录。
2. 新建文件夹 `eGerak OPR Photos`。
3. 打开文件夹，浏览器地址类似：  
   `https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUvWxYz`  
4. 复制 `folders/` 后面那一串 → 这就是 **Folder ID**。

---

## 第二步：创建 Apps Script

1. 打开 [script.google.com](https://script.google.com)（同一 PPD 账号）。
2. **新项目**。
3. 删除默认代码，把仓库里 **`egerak-v2/gas/Code.gs`** 的全部内容粘贴进去。
4. 在文件顶部修改两行：

   ```javascript
   var SETUP_FOLDER_ID = "你的FolderID";
   var SETUP_UPLOAD_SECRET = "自己编一长串密码至少32位";
   ```

   `SETUP_UPLOAD_SECRET` 要够长、够随机（可 openssl rand -hex 32）。

5. 保存项目（名称如 `eGerak OPR Upload`）。
6. 菜单 **运行** → 选函数 **`setupScriptProperties`** → 第一次会要求 **授权**（允许访问 Drive）→ 允许。
7. 查看 **执行记录**，应显示 `OK — Script Properties disimpan.`。

---

## 第三步：部署 Web App

1. 右上角 **部署** → **新建部署**。
2. 类型：**Web 应用**。
3. 设置：
   - **执行身份**：我（Me）
   - **有权访问的用户**：**任何人**（Anyone）  
     （靠密钥保护；只有知道 `GAS_UPLOAD_SECRET` 的服务器能成功上传）
4. **部署** → 复制 **Web 应用 URL**（必须以 `/exec` 结尾，不是 `/dev`）。

---

## 第四步：配置 eGerak `.env.local`

在 `egerak-v2/.env.local` 添加：

```env
OPR_PHOTO_STORAGE=gas

GAS_WEB_APP_URL=https://script.google.com/macros/s/xxxxxxxx/exec
GAS_UPLOAD_SECRET=与Code.gs里SETUP_UPLOAD_SECRET完全相同
```

保存后重启：

```powershell
cd c:\Cursorproject\Manjungallcenter\egerak-v2
npm run dev
```

---

## 照片限制（系统已强制）

- 每份 OPR **最多 4 张**活动照片（浏览器 + 服务器双重检查）。
- **建议横向 / melintang**；竖图也可上传（系统会提示横图更适合打印）。
- 大图会在上传前**自动压缩**（长边 ≤1920px，JPEG），减轻 GAS 超时风险。
- 打印时 4 张图在页面**右侧纵向排列**（横图比例 3:2）。

---

## 第五步：测试

1. 打开某条 pergerakan → **OPR** → 上传一张小图。
2. Drive 文件夹里应出现 `opr-数字-时间_xxx.jpg`。
3. 页面上能看到缩略图；**Cetak / PDF** 里也能显示。

可在 Apps Script 编辑器运行 **`testUpload`**，执行记录里应返回 `"ok":true`。

---

## 安全提醒

| 项目 | 说明 |
|------|------|
| `GAS_UPLOAD_SECRET` | 不要提交 Git、不要发群；与 `.env.local` 和 Script 里保持一致 |
| Web App「任何人」 | 没有密钥的请求会被拒绝；但仍建议密钥足够长 |
| 文件夹 | 仅放 OPR 活动照片，不要放机密文件 |
| 脚本归属 | 离职前把脚本**转移所有权**给接替同事，或 IT 账号 |

---

## 常见问题

| 现象 | 处理 |
|------|------|
| `Unauthorized` | `.env` 里的 `GAS_UPLOAD_SECRET` 与 GAS 里不一致；重新运行 `setupScriptProperties` |
| `Jalankan setupScriptProperties()` | 还没运行第 2 步第 6 点 |
| `Folder not found` | `SETUP_FOLDER_ID` 错，或脚本账号无权访问该文件夹 |
| 不是 JSON / HTML 错误 | URL 用了 `/dev` 应改为正式部署的 `/exec` |
| 超时 / 失败 | 图片超过 8MB；压缩后再传 |
| 单位禁用 Apps Script | 联系 Workspace 管理员放行，或改用 Supabase Storage |

---

## 与 Service Account 方案对比

| | Service Account JSON | **GAS（本方案）** |
|--|---------------------|-------------------|
| 组织策略禁密钥 | ❌ 不可用 | ✅ 可用 |
| 维护 | IT / GCP | 会 GAS 的同事 + PPD 账号 |
| 日上传量 | 高 | 中等（你们一天 OPR 不多 → 足够） |
