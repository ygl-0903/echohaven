# Gitee 与 GitHub 双仓库维护指南

本文说明：当你使用 **GitHub Import 从 Gitee 导入** 仓库之后，如何让 **后续提交** 同时（或按策略）同步到 **Gitee** 与 **GitHub**，以及常见注意点。

---

## 1. 先理解：Import 不会自动持续同步

- GitHub 的 **Import repository**（从 Gitee URL 导入）会把当时的 **提交历史拷贝一份** 到 GitHub。
- 这是一次性操作：**之后**你在 Gitee 上的新提交 **不会** 自动出现在 GitHub；在 GitHub 上的新提交也 **不会** 自动回到 Gitee。
- GitHub **没有**「官方按钮：每天从 Gitee 拉最新代码」这种通用双向同步功能。
- 要保持两边一致，需要你在本地用 **Git 多个 remote（远程）** 分别 `push`，或使用 **CI / 镜像** 做单向同步。

---

## 2. 推荐基础方案：一个本地仓库 + 两个 remote

在你日常开发的电脑上，**只保留一份克隆**，配置 **两个远程地址**：一个指向 Gitee，一个指向 GitHub。每次需要同步时，对 **两个远程各 push 一次**（或同一分支推两次）。

### 2.1 查看当前远程

在项目根目录执行：

```bash
git remote -v
# 比如
# -> % git remote -v
# 从这个 URL 执行 git fetch / git pull（标记为 (fetch)）
# origin  git@gitee.com:personal-manager/echohaven.git (fetch)
# 往这个 URL 执行 git push（标记为 (push)）
# origin  git@gitee.com:personal-manager/echohaven.git (push)
```

**为什么有两行？** 这不是两个远程，而是 **同一个名叫 `origin` 的远程**。Git 对「拉取」和「推送」可以配置 **不同 URL**（少数场景会分开），所以 `git remote -v` 会各打一行：`(fetch)`、`(push)`。你这里两行地址相同，表示拉和推都用 Gitee 上这一个仓库。

常见情况：

- 若克隆自 Gitee，通常会有 `origin` 指向 Gitee。
- 若克隆自 GitHub，通常会有 `origin` 指向 GitHub。

下面用 **命名约定** 说明（你可按习惯改名字，只要自己不混即可）：

| 远程名（示例） | 含义 |
|----------------|------|
| `gitee` | Gitee 仓库 URL |
| `github` | GitHub 仓库 URL |

也可以继续把「主用」的那个叫 `origin`，另一个叫 `gitee` 或 `github`。

### 2.2 添加第二个远程（若还没有）

**场景 A：本地是从 Gitee 克隆的，还要推 GitHub**

```bash
git remote add github https://github.com/<你的用户名>/<仓库名>.git
```

**场景 B：本地是从 GitHub 克隆的，还要推 Gitee**

```bash
git remote add gitee https://gitee.com/<你的用户名>/<仓库名>.git
```

SSH 用户把 `https://...` 换成 `git@gitee.com:...` / `git@github.com:...` 即可。

再次确认：

```bash
git remote -v
```

应能看到两条 URL。

### 2.3 修改已有 remote 的 URL（若当初填错了）

```bash
git remote set-url github https://github.com/<用户名>/<仓库>.git
git remote set-url gitee  https://gitee.com/<用户名>/<仓库>.git
```

### 2.4 日常推送：两个仓库都更新

假设默认分支名为 **`main`**（若是 `master`，把下面命令里的 `main` 改成 `master`）。

```bash
git add .
git commit -m "你的说明"
git push origin main        # 若 origin 指向你「主用」的那一个
git push github main        # 推到 GitHub（若远程名叫 github）
git push gitee main         # 推到 Gitee（若远程名叫 gitee）
```

若 **`origin` 就是 GitHub**，且已添加 `gitee`：

```bash
git push origin main
git push gitee main
```

**原则**：**同一条提交历史**应对 **同一分支名** 推到两个远程，这样两边 commit 一致，不会出现「两个分叉历史」。

---

## 3. 减少重复命令：脚本或 Git 别名

### 3.1 小脚本示例（`scripts/push-all-remotes.sh`）

可在本机项目里自建脚本（**不要**把含密码的 URL 写进仓库；若用 SSH，本机配好密钥即可）：

```bash
#!/usr/bin/env bash
set -euo pipefail
BRANCH="${1:-main}"
git push origin "$BRANCH"
git push gitee "$BRANCH"   # 按你实际 remote 名删减或改名
```

使用前：`chmod +x scripts/push-all-remotes.sh`，并根据你真实的 `git remote -v` 改 remote 名。

### 3.2 Git 别名（全局或本仓库）

```bash
git config --global alias.pushall '!git push origin HEAD && git push github HEAD'
```

同样需把 `origin` / `github` 换成你的命名。

---

## 4. 选定「主仓库」避免混乱

建议团队或个人 **明确一个主源**：

| 策略 | 做法 |
|------|------|
| **以 GitHub 为主** | 日常开发、PR、Actions 都以 GitHub 为准；合并进 `main` 后再 `git push gitee main` 备份到 Gitee。 |
| **以 Gitee 为主** | 日常在 Gitee 开发；需要 Actions 或对外协作时再 `git push github main`。 |

**不要**在两边网页上分别点「编辑文件」各改一版，容易产生 **分叉历史**，合并很麻烦。尽量 **只在一侧提交**，另一侧只用 `git push` 同步。

---

## 5. 若两边历史已经不一致怎么办？

- 若只是 **一边多几个 commit**：在本地 `git pull` 多的一边，`git merge` 或 `git rebase` 整理好，再 **两个 remote 都 push**。
- 若 **分歧严重**：需要有人本地合并解决冲突，再统一 push 到两个远程。
- **强制推送**（`--force`）会改写远程历史，协作仓库慎用；执行前务必与协作者沟通。

---

## 6. 可选进阶：用 CI 做「单向镜像」

若你希望 **只 push 到 GitHub**，由流水线自动推到 Gitee（或相反）：

1. 在 **被推送的那一侧** 生成 **个人访问令牌**（PAT）或部署密钥，**仅给镜像用**。
2. 在 GitHub **Secrets**（或 Gitee 的等价配置）里保存，**不要**写进代码或公开 workflow。
3. 在 workflow 里增加 `git push` 到另一个托管的步骤（注意令牌权限与仓库可见性）。

具体 YAML 因平台政策会变，实施前请查阅 **GitHub Actions** 与 **Gitee** 当前文档。公开仓库尤其注意 **不要把密钥打进仓库**。

---

## 7. Gitee 自带的「仓库镜像」

Gitee 企业版/部分版本提供 **仓库镜像** 功能，可从 GitHub **拉取**或 **推送** 同步（以 Gitee 当前产品说明为准）。若你更习惯「只维护 GitHub，Gitee 只做只读镜像」，可在 Gitee 仓库设置里查看是否支持 **从 GitHub 同步**。

---

## 8. 与本项目相关

- **GitHub Actions**（例如 `build-desktop.yml`）只在 **代码存在于 GitHub 且触发条件满足** 时运行；仅推到 Gitee **不会** 触发 GitHub Actions。
- 若你希望 **每次推 Gitee 也打 Windows/macOS 包**，需要在 **GitHub** 上也有相同提交（例如双 push，或 CI 镜像）。

---

## 9. 检查清单（首次配置后自测）

- [ ] `git remote -v` 能看到 Gitee 与 GitHub 两个地址。
- [ ] 测试提交：`git push` 到 A 成功，再 `git push` 到 B 成功。
- [ ] 在 Gitee、GitHub 网页上都能看到最新 commit。
- [ ] 明确「主仓库」：避免两边网页各改各的。

---

## 相关文档

- [github-actions-build-desktop.md](./github-actions-build-desktop.md) — 仅在 GitHub 上配置 Actions 与下载产物
- [introduction.md](./introduction.md) — 项目介绍与文档索引

---

*文档仅描述通用 Git 与托管平台习惯用法；Gitee/GitHub 界面与功能以官方最新说明为准。*
