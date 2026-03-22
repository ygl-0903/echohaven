# 余音（EchoHaven）项目介绍

本文是 **余音 · echohaven** 的完整介绍文档，面向使用者、贡献者与二次开发者。实现细节、命令列表与边界说明等以 [features.md](./features.md) 及源码为准。

---

## 1. 它是什么

**余音**（英文名 **echohaven**）是一款运行在桌面上的 **本地密码管理器**，带 **到期 / 轮换提醒** 与 **系统通知**。你的账号、密码与备注等数据 **只存放在本机的一个加密金库文件里**（`.vault` / `.ehv`），**没有**官方云端账号、**没有**内置云同步，也**不**提供浏览器自动填表或团队共享（当前版本）。

你可以把它理解为：**一把主密码 + 一个加密文件 = 自己的密码金库**；备份时把金库文件拷走即可，换电脑后用同一主密码解锁。

---

## 2. 适合谁、不适合谁

**适合**

- 希望密码数据 **留在本机**、由自己掌控备份与路径的人  
- 需要 **中文界面**、习惯桌面应用（窗口、菜单、系统通知）的人  
- 能接受「**主密码丢失无法找回**」并愿意定期导出加密备份的人  

**当前不太适合**

- 强依赖 **跨设备实时同步**、**浏览器插件自动填表** 的用户  
- 需要 **多人共享同一金库** 的团队场景  
- 期望「忘记主密码也能邮箱找回」的云服务式体验  

---

## 3. 你能用它做什么

以下为能力摘要；逐项说明、界面路径与 IPC 命令见 [features.md](./features.md)。

| 领域 | 说明 |
|------|------|
| **金库** | 创建 / 解锁 / 锁定；支持自定义金库路径、最近路径、多金库文件切换思路 |
| **条目** | 标题、用户名、密码、网址、备注、标签；搜索与标签筛选；新建 / 编辑 / 删除 |
| **安全习惯** | 密码生成器；复制密码后约 30 秒尝试清空剪贴板（受系统限制，非绝对） |
| **提醒** | 条目级提醒（轮换 / 到期等），结合系统通知；当日已提醒会记录，避免重复骚扰 |
| **标签** | 预设标签（名称与颜色），用于筛选与快速打标 |
| **备份** | 导出加密备份（整文件复制）；导出 Markdown 条目文档（可选是否含明文密码） |
| **导入** | 用备份 **整库替换** 当前金库（带导入前落盘与同目录时间戳备份） |
| **外观** | 浅色 / 深色 / 跟随系统（偏好存本机） |

---

## 4. 安全与隐私（必读）

### 4.1 密码学

- **主密码 → 密钥**：**Argon2id** 密钥派生（金库头中保存盐与参数）。  
- **金库内容**：**AES-256-GCM** 认证加密；每次保存使用新的随机 nonce。  
- 文件魔数 **`EHVN`**，格式版本见 [vault-format-v1.md](./vault-format-v1.md)。

### 4.2 你需要知道的限制

- **主密码无法找回**：开发者也无法恢复你的数据，请务必牢记并保管好备份文件。  
- **威胁模型**：主要防护 **金库文件被拷贝后的离线暴力破解**（强度依赖主密码）；**无法**在 **恶意软件已完全控制电脑** 的情况下保证绝对安全。  
- **剪贴板清空**、**自动锁定** 等为体验与降低风险设计，**不是**强安全保证。

更简短的 README 级说明见仓库根目录 [README.md](../README.md)。

---

## 5. 技术架构（实现概览）

| 层级 | 技术 |
|------|------|
| 桌面壳 | **Tauri 2**（Rust + 系统 WebView） |
| 界面 | **React 19**、**TypeScript**、**Vite 6** |
| UI | **Mantine 8**；全局样式辅以 **Tailwind CSS v4** |
| 状态 | **Zustand** |
| 路由 | **react-router-dom** |
| 敏感逻辑与文件读写 | **Rust**（`src-tauri`，金库加解密与持久化） |

**存储选型**：单文件加密金库（非 SQLite 明文库）。设计动机与对比见 [storage-design.md](./storage-design.md)。

---

## 6. 快速开始（开发）

环境要求与命令以仓库 [README.md](../README.md) 为准，此处为常用流程摘要：

1. 安装 **Rust**（建议通过 rustup；本仓库 [rust-toolchain.toml](../rust-toolchain.toml) 固定工具链版本）。  
2. 安装 **Node.js**（20.19+ 或 22+ 推荐）。  
3. 项目根目录执行：`npm install`  
4. 桌面调试：`npm run tauri dev`  
5. 本地完整构建：`npm run tauri build`（在 **当前操作系统** 上产出对应平台的安装包或应用包）

前端单独构建（CI 常用）：`npm run build`

---

## 7. 从 GitHub 下载安装包（Windows / macOS）

仓库配置了 **GitHub Actions**，在云端分别打 **Windows（NSIS）** 与 **macOS（DMG）**，无需在 Mac 上交叉编译 Windows。

- 工作流文件：[`.github/workflows/build-desktop.yml`](../.github/workflows/build-desktop.yml)  
- 触发：推送到 `main` / `master`，或在 Actions 里 **手动运行**  
- 产物：每次运行结束后，在 **Artifacts** 中下载  
  - **`echohaven-windows-bundle`**（内含 `nsis/` 安装向导）  
  - **`echohaven-macos-bundle`**（内含 `dmg/`，当前 runner 一般为 **Apple Silicon** 构建）

背景说明与本地 Windows 打包参考：[windows-build-from-mac.md](./windows-build-from-mac.md)。

**说明**：CI 产物 **未做** Apple / 微软代码签名，首次打开时系统可能提示「未验证的开发者」，需自行权衡信任与签名流程。

---

## 8. 持续集成（CI）

- **[`.github/workflows/ci.yml`](../.github/workflows/ci.yml)**：PR / 推送至 `main`、`master` 时，Ubuntu 上构建前端，macOS 上运行 `cargo test`。  
- **`build-desktop.yml`**：见上一节，用于可下载的安装包 Artifact。

---

## 9. 文档索引

| 文档 | 内容 |
|------|------|
| [README.md](../README.md) | 仓库入口：开发命令、安全摘要、CI 一句说明 |
| **本文 [introduction.md](./introduction.md)** | 项目总览与导航 |
| [features.md](./features.md) | 已实现功能清单、界面结构、IPC 命令表、已知边界 |
| [storage-design.md](./storage-design.md) | 为何用加密金库、与 SQLite 等对比 |
| [vault-format-v1.md](./vault-format-v1.md) | 金库文件字节布局与 JSON 字段 |
| [windows-build-from-mac.md](./windows-build-from-mac.md) | Windows / macOS 云端打包与交叉编译说明 |
| [github-actions-build-desktop.md](./github-actions-build-desktop.md) | 在 GitHub 上启用与使用 `build-desktop` 工作流、下载 Artifacts |
| [gitee-github-dual-remote.md](./gitee-github-dual-remote.md) | Gitee 与 GitHub 双远程配置、Import 后如何持续同步 |
| [rustup-toolchain.md](./rustup-toolchain.md) | Rust 工具链版本说明 |

---

## 10. 版本与维护

- 应用版本见 `package.json` 与 `src-tauri/tauri.conf.json` 中的 `version`。  
- 若本文与代码行为不一致，**以 `src/`、`src-tauri/` 源码为准**；欢迎通过 Issue / PR 指出文档滞后之处。

---

*余音 — 本地加密，数据不离本机。*
