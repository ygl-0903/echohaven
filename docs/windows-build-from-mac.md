# 在 Mac 上产出 Windows 安装包：难度与可行流程

## 结论（先看这个）

| 方式 | 麻烦程度 | 说明 |
|------|----------|------|
| **在 Windows 真机 / 虚拟机里 `npm run tauri build`** | 低～中 | 环境搭好即一条命令，最省心。 |
| **GitHub Actions（`windows-latest`）自动打 Windows 包** | 中 | 一次配置，以后推送即出产物；**推荐作为 Mac 开发者的默认方案**。 |
| **在 Mac 上交叉编译出 Windows 的 Tauri 包** | **高** | 涉及 Windows 目标链接、WebView2/Wry 等平台相关依赖，**官方不把它当作常规路径**，易踩坑、难维护。 |

**一句话**：在 Mac 上「本机交叉打 Win 包」**偏麻烦且不稳定**；更合理的做法是 **CI 用 Windows 跑构建**，或 **开 Windows 再打**。

---

## 为什么 Mac 本机交叉编译 Windows 会麻烦？

1. **Tauri 不是纯 Rust 逻辑**：桌面端依赖各系统 **原生 WebView**（Windows 为 **WebView2**），链接与运行库都按 **目标操作系统** 来，和「只交叉编译一个无 GUI 的 Rust 程序」不是同一难度。
2. **工具链**：`x86_64-pc-windows-msvc` 在 macOS 上需要 **Windows 版链接器 / SDK** 一类环境（常见是远程、容器或特殊封装），配置和版本组合容易出问题。
3. **维护成本**：Rust / Tauri / 系统依赖升级后，交叉环境往往要跟着重调。

因此文档优先写 **可复现、团队常用** 的两条路：**远程 Windows 构建（CI）** 与 **本机 Windows 构建**。

---

## 流程 A：在 Windows 上打包（参考）

适用于：你有一台 PC、或 Parallels / VMware 里的 Windows。

### 1. 安装依赖（只做一次）

- [Node.js](https://nodejs.org/)（与项目一致，例如 22）
- [Rust](https://rustup.rs/)（`stable`，`rustup default stable`）
- **Microsoft C++ 生成工具** 或带「使用 C++ 的桌面开发」的 Visual Studio（提供 MSVC 与 Windows SDK）
- 系统或运行时中的 **WebView2**（Win10/11 通常已具备）

### 2. 配置安装包格式（可选）

本仓库已在 **`src-tauri/tauri.windows.conf.json`** 里为 **仅在 Windows 上构建** 时合并配置：`bundle.targets` 为 **`["nsis"]`**，不影响你在 Mac 上用 `tauri.conf.json` 的 `targets: "all"` 打 dmg/app。

若在别的项目里要写在主配置里，也可在 `tauri.conf.json` 的 `bundle` 中指定 `targets`（注意别误伤 macOS 产物）。更多格式见 [Tauri：Windows 安装包](https://tauri.app/distribute/windows-installer/)。

### 3. 构建

在项目**根目录**（与 `package.json` 同级）：

```bash
npm ci
npm run tauri build
```

### 4. 产物在哪

- **可执行文件**：`src-tauri/target/release/` 下以 `productName` 命名的 `.exe`（本项目 `productName` 为「余音」，实际文件名以构建输出为准）。
- **安装包**：例如 `src-tauri/target/release/bundle/nsis/` 下的 NSIS 安装程序（具体路径随 Tauri 版本略有差异，以 `target/release/bundle/` 下为准）。

---

## 流程 B：用 GitHub Actions 出安装包（推荐，本仓库已配置）

推送代码后由 **云端 Windows + 云端 macOS** 各打一份包，在 Actions 里分别下载 Artifact（无需本机交叉编译）。

### 1. 准备仓库

- 代码托管在 **GitHub**（或把同样 Workflow 迁到你用的 CI）。
- 默认即可上传 Artifact；Fork 仓库若受限，检查仓库 Settings → Actions → General 权限。

### 2. 本仓库已包含的工作流与配置

| 文件 | 作用 |
|------|------|
| [`.github/workflows/build-desktop.yml`](../.github/workflows/build-desktop.yml) | 并行 Job：**Windows (NSIS)** + **macOS (DMG)**，各上传一份 Artifact |
| [`src-tauri/tauri.windows.conf.json`](../src-tauri/tauri.windows.conf.json) | 在 **Windows** 上构建时合并 **`bundle.targets: ["nsis"]`**（含本机 Windows） |
| [`src-tauri/ci-bundle-macos-dmg.json`](../src-tauri/ci-bundle-macos-dmg.json) | **仅** GitHub macOS Job 通过 `tauri build -c` 合并，只打 DMG，**不**改你本机 Mac 的 `targets: all` |

**触发方式**：

- **手动**：GitHub 仓库 → **Actions** → **Build Desktop (Windows + macOS)** → **Run workflow**。
- **自动**：推送到 **`main`** 或 **`master`** 时会跑一遍（不需要可删掉 workflow 里的 `push:`，只保留 `workflow_dispatch`）。

### 3. 你得到什么

打开对应运行记录 → 底部 **Artifacts**：

- **`echohaven-windows-bundle`**：解压后看 **`nsis/`** 下的 **`.exe` 安装向导**。
- **`echohaven-macos-bundle`**：解压后看 **`dmg/`** 下的 **`.dmg`**（当前 `macos-latest` 一般为 **Apple Silicon arm64**；Intel Mac 需另配 runner 或 universal 构建）。

若需 **代码签名、发 Release 资产**，在官方文档基础上给同一 Job 增加签名步骤与 `softprops/action-gh-release` 等即可。

---

## 若坚持在 Mac 上交叉编译 Windows（不推荐）

仅作方向提示，**不作为本项目承诺可跑通的步骤**：

- 需自行查阅当前 Tauri / Rust 社区关于 **`x86_64-pc-windows-msvc`（或 `*-windows-gnu`）在 macOS 上交叉** 的最新讨论与工具链（如 `cargo-xwin`、`zig`、专用 Docker 等）。
- 每次升级 Tauri 或 Rust 可能要重验。
- 团队规模较小时，**优先用流程 B**。

---

## 与本项目相关的文件

| 文件 | 作用 |
|------|------|
| `src-tauri/tauri.conf.json` | `productName`、通用 `bundle`、图标路径 |
| `src-tauri/tauri.windows.conf.json` | 仅 Windows 构建合并：**NSIS** |
| `src-tauri/ci-bundle-macos-dmg.json` | 仅 CI 合并：**DMG**（本机 Mac 不受影响） |
| `.github/workflows/build-desktop.yml` | 云端打 **Windows + macOS** 包并上传 Artifact |
| `package.json` | `tauri build` 脚本 |
| `src-tauri/icons/icon.ico` 等 | Windows 图标资源 |

---

## 参考链接

- [Tauri：Windows 安装包](https://tauri.app/distribute/windows-installer/)
- [Tauri：构建概览](https://tauri.app/develop/)
- [GitHub Actions：上传 Artifact](https://github.com/actions/upload-artifact)
