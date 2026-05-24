# eGerak PPD Manjung — 一站式平台 (v5)

官员行程、部门/总日历同步、**Dewan Bestari** / **Bilik Budiman** 预约、年度计划批量导入、**OPR**（Gemini 草稿 dapatan/rumusan）。

## 文档语言

| 类型 | 语言 |
|------|------|
| `docs/` 部署与维护 | **中文** |
| Web App、OPR、官员提示 | **马来文** |

## 仓库结构

```
apps-script/     Google Apps Script + Web App HTML
calendar/        eMARS 日历 ID 对照
docs/            部署、Sheet 结构、Looker、OPR 模板
```

## 快速开始

1. 阅读 **[docs/SETUP.md](docs/SETUP.md)**（中文部署指南）
2. 运行 `setupMasterSpreadsheet()` → `applyEmarsCalendarFromConfig()`
3. 在 Script Properties 设置 `GEMINI_API_KEY`、OPR 模板与文件夹 ID
4. 部署 Web App

## clasp（本地推送代码）

```bash
npm i -g @google/clasp
clasp login
# 在 .clasp.json 填入 scriptId
cd c:\Cursorproject\Manjungallcenter
clasp push
```

## 成本

在现有 Google Workspace 下，Apps Script + Gemini 免费额度内基本 **RM0**。

## 维护

PPD Manjung USTP（基于既有 PSS/DPD 自动化经验）。
