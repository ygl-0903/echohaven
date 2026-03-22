# 在 GitHub 上配置与使用「Build Desktop」工作流

本文说明如何让仓库中的 [`.github/workflows/build-desktop.yml`](../.github/workflows/build-desktop.yml) 在 GitHub 上生效，以及如何手动运行、下载安装包。**一般不需要在仓库里再写额外配置文件**，以网页设置与推送代码为主。

---

## 1. 让 Workflow 出现在 GitHub 上

1. 将 `.github/workflows/build-desktop.yml` **提交并推送到 GitHub**。  
2. YAML 里 `on.push.branches` 当前为 **`main`**、**`master`**。若你的默认分支是别的名字（例如 `develop`），要么把默认分支改成 `main`/`master`，要么修改 workflow 里的分支列表。  
3. 文件路径必须为：  
   `.github/workflows/build-desktop.yml`  
   （文件名可改，但扩展名应为 `.yml` / `.yaml`，且必须在 `workflows` 目录下。）

---

## 2. 打开 GitHub Actions（必做）

1. 打开仓库 → **Settings**（设置）。  
2. 左侧 **Actions** → **General**。  
3. **Actions permissions** 选择：  
   - **Allow all actions and reusable workflows**（或你所在组织允许的策略）。  
   - 不要选 **Disable actions**。  

**Fork 的仓库**：首次使用需进入 **Actions** 标签页，按页面提示 **启用 workflows**（例如确认「了解后将运行 workflows」），否则不会执行。

---

## 3. 如何触发构建

### 方式 A：手动运行（适合先试一次）

1. 仓库顶部进入 **Actions**。  
2. 左侧选择 **Build Desktop (Windows + macOS)**（与 YAML 中 `name:` 字段一致）。  
3. 右侧点击 **Run workflow**。  
4. 选择分支（一般为 `main`）→ 再点 **Run workflow**。

### 方式 B：推送自动运行

- 向 **`main` 或 `master`** 分支 **push** 代码时，会自动触发（与当前 YAML 中 `on.push` 一致）。  
- 若不希望每次推送都构建，可删掉 workflow 中的 `push:` 整段，只保留 `workflow_dispatch:`，则仅支持手动运行。

---

## 4. 下载安装包（Artifacts）

1. 在 **Actions** 中打开**最近一次成功**的运行记录（绿色勾）。  
2. 滚动到页面最下方 **Artifacts**。  
3. 下载：  
   - **echohaven-windows-bundle**：解压后查看 **`nsis/`** 下的 `.exe` 安装向导。  
   - **echohaven-macos-bundle**：解压后查看 **`dmg/`** 下的 `.dmg`（当前 `macos-latest` 一般为 **Apple Silicon** 构建）。

若看不到 Artifacts：检查是否已登录、对仓库是否有读权限；组织仓库可能另有 Artifact 策略。

---

## 5. 常见问题

| 现象 | 处理 |
|------|------|
| 左侧列表里没有这条 workflow | 确认 YAML 已推到**默认分支**；路径与扩展名是否正确。 |
| Actions 整体不可用 | **Settings → Actions** 是否禁用；Fork 是否未启用 Actions。 |
| 没有 **Run workflow** 按钮 | 确认 YAML 顶层包含 `workflow_dispatch:`。 |
| Artifact 无法下载 | 权限不足或组织限制；私有仓库需具备相应访问权限。 |

---

## 6. 费用与额度（简要）

- 公开仓库：通常可使用 GitHub 提供的 Actions 分钟数。  
- 私有仓库：有每月免费额度，超出部分按账户/组织的 **Billing** 计费。  
- 以 GitHub 官网当前说明为准。

---

## 7. 与签名、密钥的关系

当前 workflow **未配置** Apple / 微软 **代码签名**，无需在 **Settings → Secrets** 中配置证书即可打出未签名安装包。  

若日后要签名，再在仓库 **Secrets** 中存放证书与密码，并在 workflow 中增加对应步骤即可。

---

## 相关文档

- [windows-build-from-mac.md](./windows-build-from-mac.md) — 为何用 CI 打 Windows 包、本地与交叉编译说明  
- [introduction.md](./introduction.md) — 项目介绍与文档索引  
