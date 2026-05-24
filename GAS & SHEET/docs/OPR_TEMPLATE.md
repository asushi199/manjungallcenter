# OPR Google Docs 模板占位符

模板标题示例：**LAPORAN SEKTOR PEJABAT PENDIDIKAN DAERAH MANJUNG**（官员可见，马来文）

## 页眉

| 占位符 | 表格/位置 |
|--------|-----------|
| `{{NAMA}}` | Nama Pegawai Pelapor |
| `{{JAWATAN}}` | Jawatan |
| `{{SEKTOR}}` | Sektor |

## 表格正文

| 栏位（马来文） | 占位符 |
|----------------|--------|
| TARIKH | `{{TARIKH}}` |
| NAMA PROGRAM | `{{URUSAN}}` |
| TEMPAT | `{{LOKASI}}` |
| ISU / DAPATAN | `{{DAPATAN}}` |
| IMPAK | `{{RUMUSAN}}` |
| REFLEKSI / TINDAK SUSUL / PENAMBAHBAIKAN | **`{{REFLEKSI}}`** |

请将模板里原来的 `{{NOTA_AI}}` **改成** `{{REFLEKSI}}`（脚本仍会兼容旧占位符 `{{NOTA_AI}}`，填入相同内容）。

也可选用别名 `{{TINDAKAN_SUSULAN}}`（与 `{{REFLEKSI}}` 填入相同文字）。

## 照片

`{{GAMBAR_1}}` … `{{GAMBAR_5}}`

## 已有试算表升级

若 Pergerakan 表在 `rumusan_draft` 后尚无 `refleksi_draft` 列，请在 `source` 列**左侧**插入一列，表头命名为 `refleksi_draft`。
