# rustup 与 Rust toolchain 说明

本文整理 **rustup**、**toolchain**、**rust-toolchain.toml** 的含义与常用命令，便于日后查阅。与本项目相关的约定见文末。

---

## rustup 是什么？

**rustup** 是 Rust 官方推荐的**工具链安装与切换工具**。通过它可以：

- 安装、更新、卸载多个 Rust 版本；
- 为「全局默认」或「某个项目」指定使用哪一套编译器与 Cargo；
- 安装 `rustfmt`、`clippy` 等组件。

从 [rustup.rs](https://rustup.rs/) 安装 Rust 时，装的就是 rustup；日常使用的 `rustc`、`cargo` 都由当前选中的 **toolchain** 提供。

---

## toolchain（工具链）是什么？

**toolchain** 指**一整套** Rust 发行环境，通常包括：

- 编译器 `rustc`
- 构建工具 `cargo`
- 标准库与文档等

每一套 toolchain 都有**名字**，常见形式：

| 名称示例 | 含义 |
|----------|------|
| `stable-aarch64-apple-darwin` | **stable** 通道 + 目标平台 **Apple Silicon macOS** |
| `1.88.0-aarch64-apple-darwin` | **固定版本 1.88.0** + 同上平台 |
| `nightly-2023-10-24-aarch64-apple-darwin` | **某一天的 nightly** + 同上平台 |

后缀里的 **triple**（如 `aarch64-apple-darwin`）表示「这套编译器默认为谁编译」：架构 + 操作系统。Intel Mac 常见为 `x86_64-apple-darwin`，Windows 常见为 `x86_64-pc-windows-msvc` 等。

---

## `rust-toolchain.toml` 做什么用？

放在**项目根目录**（或 Cargo 工作区根）的配置文件，告诉 rustup：**在这个目录及其子目录里**，执行 `cargo` / `rustc` 时使用哪一套 toolchain。

示例（与本仓库一致）：

```toml
[toolchain]
channel = "1.88.0"
```

作用简述：

1. **版本对齐**：协作者、CI 与本机在项目内使用相同 Rust 版本，减少「我这能编你那报错」。
2. **满足依赖**：部分 crate 在 `Cargo.toml` 里声明最低 `rust-version`；钉在 1.88.0 可避免 Tauri 等依赖要求新版本而本机默认仍是旧 stable。
3. **目录覆盖**：仅在该项目下生效；离开目录后仍用你设置的**全局 default**（除非别的目录也有 `rust-toolchain.toml`）。

---

## `rustup toolchain list` 输出怎么读？

示例：

```text
stable-aarch64-apple-darwin (default)
nightly-2023-10-24-aarch64-apple-darwin
1.88.0-aarch64-apple-darwin (active)
```

| 标记 | 含义 |
|------|------|
| `(default)` | 全局默认 toolchain：在**没有**项目覆盖、也不在带 `rust-toolchain.toml` 的目录里时，`rustc` / `cargo` 使用这一套。 |
| `(active)` | **当前 shell 所在目录**下实际生效的一套。若该目录有 `rust-toolchain.toml` 且指定了 `1.88.0`，这里就会显示 `1.88.0-... (active)`，即使 default 仍是 `stable`。 |
| 无标记 | 已安装，但既不是 default，也不是当前目录激活的那套。 |

因此：**default** 是「平常默认用谁」；**active** 是「**现在这一格终端、当前路径**下用谁」。

---

## 常用命令速查

| 命令 | 作用 |
|------|------|
| `rustup toolchain list` | 列出已安装的工具链，并标出 default / active |
| `rustup toolchain install 1.88.0` | 安装指定版本（平台后缀由 rustup 自动选） |
| `rustup default stable` | 把全局默认改成 `stable` |
| `rustup show` | 查看当前目录激活的 toolchain、宿主 triple 等 |
| `rustc --version` | 查看当前实际使用的编译器版本 |

在项目根执行 `rustc --version` 应与 `rust-toolchain.toml` 中的 `channel` 一致（或兼容）。

---

## 与本项目（echohaven）的关系

- 仓库根目录 [rust-toolchain.toml](../rust-toolchain.toml) 指定 **1.88.0**，因为 Tauri 2 的传递依赖要求 **rustc ≥ 1.88**。
- [src-tauri/Cargo.toml](../src-tauri/Cargo.toml) 中的 `rust-version = "1.88"` 是 **Cargo 元数据**，用于提示最低版本；真正决定「用哪套编译器」的仍是 rustup + `rust-toolchain.toml`。
- 若从未装过 1.88.0，可先执行：`rustup toolchain install 1.88.0`，再在项目目录运行 `npm run tauri dev`。

---

## 延伸阅读

- 官方 rustup 文档：[https://rust-lang.github.io/rustup/](https://rust-lang.github.io/rustup/)
- toolchain 文件（`rust-toolchain.toml`）：rustup 文档中的 *Overrides* / *The toolchain file* 章节

---

*若你升级了依赖或 Rust 版本要求变化，请同步更新根目录 `rust-toolchain.toml`、`src-tauri/Cargo.toml` 的 `rust-version` 以及本文「与本项目的关系」小节。*
