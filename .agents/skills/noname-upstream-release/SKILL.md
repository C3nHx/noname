---
name: noname-upstream-release
description: 维护本仓库的上游同步、轻量客户端与素材拆分、加密资源构建和 CNB Release 发布。用于同步 libnoname 改动、更新资源包或发布分支版本。
---

# 同步上游并发布加密资源

在包含 `scripts/resource-packs.mjs` 的仓库根目录执行命令。目标是让无美术资源的核心机制可以先开局，素材下载、解密和持久缓存随后补齐体验。

先读以下仓库文档，根据用户要求确定本次做到哪个阶段。只讨论时保持只读，已有的提交、推送或发布授权继续有效。调用此 skill 本身不授权创建付费云服务。

- [分支与版本维护](../../../docs/fork-release.md)规定上游基线和发行版本。
- [资源边界与缓存](../../../docs/resource-packs.md)规定产物、密钥和各端保存方式。
- [CNB 发布](../../../docs/cnb-resources.md)规定上传协议和分阶段发布。
- [扩展集成](../../../docs/bundled-extensions.md)规定 vendor 清单和默认扩展配置。
- [Web 分发遗留](../../../docs/resource-delivery-follow-up.md)记录未决方案和恢复条件。它是历史状态，执行前核对现场。

## 同步源码并维护版本

1. 检查工作区、当前分支、`origin` 和 `upstream`。本仓库以 `main` 保存上游基线，以 `fork` 集成改动。先记录旧基线，再按分支维护文档 fetch、快进 `main`、合并到 `fork`。本次任务未要求同步上游时，不额外合并。
2. 审查旧基线到新基线的差异。冲突按双方意图解决，保留大厅认证、分发渠道和轻量启动行为。缺少共同祖先时检查浅克隆并补历史，不拼接无关历史。
3. 读取 `apps/core/noname/util/distribution.js`。上游版本变化时更新 `upstreamVersion`，发布新的客户端或清单时递增分支修订号，再执行 `pnpm version:sync` 和 `pnpm version:check`。根 `package.json` 的版本不是游戏版本。
4. 不复用已经发布的版本来替换客户端、清单或下载地址。保留旧标签和资源，供旧客户端使用。仅续传尚未完成、内容匹配的同一次发布时，沿用原版本。

## 审查核心与素材边界

以 `apps/core/noname/resources/manifest.js` 的 `resourceGroup` 和 `scripts/resource-packs.mjs` 为准。构建遍历运行目录，按路径和扩展名分类，不能替代对新增文件用途的判断。

- 游戏规则、脚本、CSS、配置、Worker 和运行时依赖留在核心。新增格式默认可能进入核心，检查是否因此带回大素材。
- 已识别的图片、音视频、字体、atlas 和 skel 进入可选包。检查新增启动界面和交互在缺少这些文件时能否正常使用，必要时补文字回退。
- `node_modules/` 和 `src/` 下的文件不按媒体规则拆出。复核新增大依赖，不能只看素材包总大小。
- 上游素材与 `vendor/ziqi` 冲突时遵循扩展集成规则。变更 vendor 内容时同步 `vendor/ziqi/manifest.json` 的字节数和 SHA-256；新增或删除默认扩展时同步 `bundled-extensions.js` 与 `game/config.json`。
- 天庭、奇妙工具及其专属素材保持移除。另行提供的 36G 皮肤包不纳入默认发布。不要因上游合并或重新导入作者包将它们带回。

## 构建并验证同一批资源

使用根 `package.json` 要求的 Node 22 和锁定依赖。正式发布复用现有 32 字节资源密钥，通过 `NONAME_RESOURCE_KEY_FILE` 或 `NONAME_RESOURCE_KEY` 提供。缺少现有发布密钥时先恢复它，不依赖本地自动生成的新密钥发布。所有平台使用同一密钥版本，日志只记录 `keyId`。

从同步后的核心版本生成 CNB 地址，例如在 PowerShell 中执行：

```powershell
$releaseVersion = node -p "require('./apps/core/package.json').version"
$env:NONAME_RESOURCE_BASE_URL = "https://cnb.cool/c4nhx/noname-resources/-/releases/download/v$releaseVersion/"
```

已选定并验证实际下载站时，将版本目录配置为 `NONAME_RESOURCE_DELIVERY_URL`。检查当前环境，避免继承上一版本的地址。未选 Web 分发方式时可以只发布 CNB 分卷，不宣称网页自动下载可用。

```sh
pnpm install --frozen-lockfile
pnpm version:check
pnpm test:distribution
pnpm lint
pnpm build
node scripts/verify-resource-build.mjs
```

检查实际 `dist`、`output/runtime-full` 和 `output/resource-packs`。轻量 `dist` 不含可选素材，完整目录保留素材，加密分卷能认证解密并还原全部清单文件。公开资源目录不能出现 `resource-key.json`。分卷数量由清单决定，不固定为某次发布的数量。

本地明文缓存按文件哈希复用。随机 IV 会让不同构建的密文不同，同名分卷绑定相同密钥版本和明文 ZIP 哈希，不能将密文字节完全一致作为跨构建兼容的条件。镜像同一次发布时直接复制已发布的密文文件。

## 发布到 CNB

检查 CNB CLI、目标仓库和 `repo-release:rw` 权限。CLI 登录不保证具备 Release 写权限。通过当前环境的安全凭证入口取得令牌，按需传入 `CNB_TOKEN`，不写入源码或日志。

`scripts/publish-resources-cnb.mjs` 不由当前 GitHub 工作流自动调用。`pnpm build` 也不会上传资源。GitHub Actions 的 `NONAME_RESOURCE_KEY` secret 解决各端密钥一致性，不代表已配置 CNB 发布凭证。

最终核心构建和下载配置已经确定时，执行完整发布：

```sh
node scripts/publish-resources-cnb.mjs --repo c4nhx/noname-resources
```

需要先传大文件、后确定核心清单时，分两次执行。第二条命令必须等最终构建验证完成后再运行：

```sh
node scripts/publish-resources-cnb.mjs --repo c4nhx/noname-resources --parts-only
node scripts/publish-resources-cnb.mjs --repo c4nhx/noname-resources --catalog-only
```

默认目录为 `output/resource-packs`，默认客户端解密配置为 `dist/resource-key.json`。发布 tag 默认取清单版本的 `v` 前缀，清单 `baseURL` 必须与目标 CNB Release 完全一致。

默认收据是 `.audit/cnb-resource-publication.json`。保留未完成发布的收据与原密钥。开始其他版本前备份旧收据，或为两阶段命令传入同一个独立的 `--receipt` 路径。`catalog-only` 核对收据中的分卷名称、长度和明文哈希，并检查远端附件存在，但不会重新下载、解密全部分卷。若两阶段之间附件有变动或无法确认其状态，先重跑 `--parts-only` 匿名回读并验证，再发布清单。不能手改收据跳过检查。

发布器跳过同名、同大小的附件，并在分卷阶段匿名下载、解密核验。大小冲突或清单回读不一致时停止，检查是否复用了旧版本，不删除重建或覆盖已发布附件。中断后可以重跑同一阶段，已有分卷会复用，未完成的单个文件重新上传。

收据 `phase: parts` 仅表示分卷完成。只有最终清单回读验证成功、收据为 `complete`，才报告完整 CNB 发布。公开内容只包括 `.nrp` 和不含密钥的 `resource-manifest.json`。`dist`、完整离线包和解密配置属于客户端产物，不上传到资源仓库。

## 验证使用端并交付

CNB 的匿名 Node 下载成功不能证明外站浏览器能读取。已实测 CNB Release 入口与最终文件域拒绝外站 Origin，单纯解析重定向无法解决。Web 分发方式未定时，保留该遗留，不部署一个默认自动下载失败的新客户端。

分发方式确定后，从实际网页 Origin 验证下载、AES-GCM 解密和缓存，再重启浏览器验证无重复下载及离线读取。检查核心版本更新能复用未变化的素材。网页认证和大厅认证沿用现有边界，资源请求不携带网页凭证。原生安装包与真机行为另行验证，不能由浏览器结果代替。

提交前审查暂存内容，排除真实部署目录、环境凭证、`.audit`、`dist`、`output` 和实际密钥。保留上游 localhost 证书逻辑。按用户要求提交并推送，发布说明中的贡献者不用 GitHub 提及。

交付时分别报告源码提交、构建验证、CNB 分卷与清单、实际下载站、线上 Web 和原生安装包状态。留下未完成阶段的恢复入口，不把其中一项完成写成全链路完成。
