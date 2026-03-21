# 余音 · echohaven

基于 **Tauri 2** + **React** + **TypeScript** + **Mantine** 的本地密码管理与到期提醒。数据仅存于本机加密金库文件，无云端账号与同步。

**功能说明（已实现能力汇总）**：[docs/features.md](docs/features.md)  
**rustup / toolchain 说明（含 `rust-toolchain list` 如何看）**：[docs/rustup-toolchain.md](docs/rustup-toolchain.md)

## 开发

- [Rust](https://www.rust-lang.org/)：仓库根目录 [rust-toolchain.toml](rust-toolchain.toml) 固定为 **1.88.0**（与当前依赖一致）。首次构建前若未安装，在项目目录执行 `rustup show` 或 `cargo build` 会提示由 rustup 拉取该版本；也可手动执行 `rustup toolchain install 1.88.0`。详见 [docs/rustup-toolchain.md](docs/rustup-toolchain.md)。
- [Node.js](https://nodejs.org/) 20.19+ 或 22+（推荐）
- 安装依赖：`npm install`
- 桌面调试：`npm run tauri dev`
- 生产构建：`npm run tauri build`

## 安全说明

- 主密码使用 **Argon2id** 派生密钥，金库内容为 **AES-256-GCM** 认证加密。
- **忘记主密码无法恢复**；请定期使用「设置 → 导出加密备份」保存 `.ehv` / `.vault` 文件。
- 威胁模型：主要防止金库文件被拷贝后离线暴力破解（依赖主密码强度）；无法保证受恶意软件完全控制的主机安全。

## CI

推送至 `main` / `master` 或提交 PR 时，GitHub Actions 会在 Ubuntu 上构建前端、在 macOS 上运行 `cargo test`。
