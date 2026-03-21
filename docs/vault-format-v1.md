# 余音（echohaven）金库文件格式 v1

本文档描述 **磁盘上 `.vault` 文件** 的字节布局与解密后的 JSON 结构，与 `src-tauri/src/vault.rs` 实现保持一致。若实现变更，请同步更新本文档与 `FILE_VERSION` / `MAGIC`。

**为何用单文件加密金库、与 SQLite 等有何差别**（通俗说明与选型对比）见 [storage-design.md](storage-design.md)。

---

## 默认路径与解析规则

| 项目 | 说明 |
|------|------|
| 默认文件名 | `echohaven.vault` |
| 默认目录 | `dirs::data_dir()` + `echohaven/`（不存在则创建） |
| macOS 典型路径 | `~/Library/Application Support/echohaven/echohaven.vault` |
| Windows 典型路径 | `%APPDATA%\echohaven\echohaven.vault` |

**路径解析（IPC）**：若调用方传入自定义 `path`，则使用该路径；否则使用 `default_vault_path()`。

**导入整库替换**：验证源文件主密码后，复制到默认路径；若默认路径已存在，先将现有文件复制为同目录下的 `echohaven.vault.bak`，再覆盖。

---

## 外层二进制布局（文件版本 1）

整文件为一段连续字节，字段均为**小端序**（除显式说明外）。

| 偏移 | 长度 | 字段 | 说明 |
|------|------|------|------|
| 0 | 4 | `magic` | 固定 ASCII `EHVN`（`0x45 0x48 0x56 0x4E`） |
| 4 | 1 | `file_version` | 当前固定 `1` |
| 5 | 16 | `salt` | Argon2id 盐（随机） |
| 21 | 4 | `m_cost` | Argon2 内存参数（KiB），`u32` |
| 25 | 4 | `t_cost` | Argon2 时间参数，`u32` |
| 29 | 1 | `p_cost` | Argon2 并行度，磁盘上为 `u8`，读取为 `u32` |
| 30 | 至文件末尾 | `ciphertext_blob` | 见下节 |

最小合法长度：`30` 字节。`magic` 或 `file_version` 不匹配时解析失败（`InvalidFormat`）。

---

## 密文块 `ciphertext_blob`（AES-256-GCM）

| 部分 | 长度 | 说明 |
|------|------|------|
| nonce | 12 字节 | 每次加密随机生成 |
| 密文 + 认证标签 | 变长 | AES-256-GCM 输出 |

主密钥由 **Argon2id** 从「UTF-8 主密码 + `salt`」派生，输出 **32 字节**，作为 AES-256 密钥。

每次保存金库会重新加密，**nonce 每次可能变化**；文件头中的 `salt` 与 Argon2 参数在会话内保持不变（与首次创建/解锁时一致）。

解密或认证失败（密码错误、篡改等）记为 `DecryptFailed`。

---

## 明文载荷：JSON（UTF-8）

解密得到 UTF-8 编码的 JSON，根对象为 `VaultData`（序列化字段名为 **camelCase**）。

### `VaultData`

| 字段 | 类型 | 说明 |
|------|------|------|
| `version` | number (u32) | 载荷模式版本，创建时为 `1` |
| `entries` | array | 条目列表 |
| `tagPresets` | array | 可选；缺省时按空数组解析。全局标签预设（名称 + 可选颜色），与 `Entry.tags` 配合使用 |

### `TagPreset`

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 唯一标识 |
| `name` | string | 显示名称（用于筛选与一键添加到条目） |
| `color` | string \| null | 可选，如 `#228be6` |

### `Entry`

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 条目唯一标识 |
| `title` | string | 标题 |
| `username` | string | 用户名 |
| `password` | string | 密码 |
| `url` | string | 链接 |
| `notes` | string | 备注 |
| `tags` | string[] | 标签 |
| `reminder` | object \| null | 可选提醒 |

### `Reminder`

| 字段 | 类型 | 说明 |
|------|------|------|
| `kind` | string | 提醒类型（语义由产品层约定） |
| `dueDate` | string | 到期日，`YYYY-MM-DD` |
| `enabled` | boolean | 是否启用 |
| `lastNotifiedOn` | string \| null | 上次已通知日期，`YYYY-MM-DD` |

---

## KDF 预设（创建金库时）

由 `fast_kdf` 选择：

| 预设 | m_cost (KiB) | t_cost | p_cost |
|------|----------------|--------|--------|
| 安全（默认） | 19 × 1024 | 2 | 1 |
| 快速（测试/低端机） | 8 × 1024 | 2 | 1 |

已存在金库的 KDF 参数以**文件头为准**，解锁后保存不会自动改参数。

---

## 导出与扩展名

`export_vault` 为**整文件字节拷贝**，格式与上文一致。用户若将副本命名为 `.ehv` 等扩展名，仅便于识别，**不增加额外封装层**；导入时仍按同一格式解析。

---

## 演进说明

- 更换算法或外层布局时：递增 `file_version` 或调整 `magic`，并提供迁移/兼容策略。
- 若未来支持多种对称算法，建议在文件头或 JSON 中增加显式 `cipherSuite` 字段，避免仅靠版本号推断。
