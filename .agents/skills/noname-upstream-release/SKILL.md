---
name: noname-upstream-release
description: 维护本仓库的上游同步、轻量客户端与素材拆分、加密资源构建和 OSS 发布。用于同步 libnoname 改动、更新资源包或发布分支版本，保留 CNB 历史归档的恢复入口。
---

# 同步上游并发布加密资源

在包含 `scripts/resource-packs.mjs` 的仓库根目录执行命令。目标是让无美术资源的核心机制可以先开局，素材下载、解密和持久缓存随后补齐体验。

先读以下仓库文档，根据用户要求确定本次做到哪个阶段。只讨论时保持只读，已有的提交、推送或发布授权继续有效。调用此 skill 本身不授权创建付费云服务。

- [分支与版本维护](../../../docs/fork-release.md)规定上游基线和发行版本。
- [资源边界与缓存](../../../docs/resource-packs.md)规定产物、密钥和各端保存方式。
- [OSS 发布](../../../docs/oss-resources.md)规定正式下载源、发布命令和所需权限。
- [CNB 发布](../../../docs/cnb-resources.md)保留历史归档的可选流程，不是正式发布的必经步骤。
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

从公开资源根目录生成当前版本地址，例如在 PowerShell 中执行：

```powershell
$env:NONAME_RESOURCE_ROOT_URL = 'https://example-assets.oss-cn-shanghai.aliyuncs.com/noname/'
```

构建自动追加 `v<当前发行版本>/`。`NONAME_RESOURCE_BASE_URL` 可覆盖完整版本目录，`NONAME_RESOURCE_DELIVERY_URL` 可覆盖实际下载站。检查当前环境，避免继承旧地址。四个 GitHub 工作流读取仓库变量 `NONAME_RESOURCE_ROOT_URL`；本地环境变量不会自动同步到 GitHub。

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

## 发布到 OSS

按 OSS 发布文档核对 Bucket、地域、资源前缀和 RAM 权限。通过安全凭证入口取得访问材料，只传给本地发布进程，不写入源码或日志。资源密钥与 OSS 凭证分别处理，不把后者提供给客户端。

读取 Bucket 地域或 CORS 失败时，区分账号归属与缺少相应权限，不推断对象上传已获授权。需要补权限时报告实际操作、状态码与错误，不在未确认的 Bucket 中试写探针。

使用实际 Bucket、地域、版本目录和网页 Origin 执行，例如：

```sh
node scripts/publish-resources-oss.mjs --bucket example-assets --region oss-cn-shanghai --prefix noname/v1.11.7-c3nhx.4/ --configure-cors --verify-origin https://game.example.com
```

首次需要时才传 `--configure-cors`，脚本备份并保留原规则。Bucket ACL 保持原配置，脚本只公开所上传的加密分卷和无密钥清单。日常发布可以不具备 CORS 修改权限，由管理员预先配置。

脚本本地校验后上传分卷，匿名回读并认证解密，全部验证后才上传、回读最终清单。已有对象不覆盖。重跑时核对远端实际内容，不能只相信文件大小或上一轮完成标记。失败时保留现场，在同一未完成版本下重跑；清单冲突时使用新修订号。

默认输入为 `output/resource-packs`，客户端解密配置为 `dist/resource-key.json`。后者仅用于本地校验，不上传。收据默认保存在 `.audit/oss-resource-publication.json`，不同发布可传独立 `--receipt` 路径。

新版本可通过 `--reuse-prefix <同一 Bucket 的旧版本目录>/` 在 OSS 内复制同名加密分卷，缺少时才上传。仍需完整回读验证，不能凭复制成功发布清单。按版本保存收据和旧目录，保持旧客户端可用。

GitHub Actions 的资源根地址变量解决各平台默认下载源，`NONAME_RESOURCE_KEY` secret 解决密钥一致性。当前工作流不自动上传 OSS，也不因这两个设置获得 OSS 访问凭证。需要给 CI 提供云凭证时，按实际授权另行配置。

仅在用户要求操作 CNB 历史归档时读取 CNB 发布文档。已有 `.audit/cnb-resource-publication.json` 的 `phase: parts` 只表示当时分卷完成；这不阻止新的 OSS 独立发布，也不要求为迁移补发 CNB 清单。不删除已有归档。

## 验证使用端并交付

匿名 Node 下载成功和带 Origin 的响应头检查均不能代替真实浏览器验收。已实测 CNB Release 入口与最终文件域拒绝外站 Origin，不能作为网页默认自动下载源。OSS 权限或 CORS 尚未就绪时，先完成本地准备，保留线上回滚版本，不切换到资源下载失败的新客户端。

分发方式确定后，从实际网页 Origin 验证下载、AES-GCM 解密和缓存，再重启浏览器验证无重复下载及离线读取。检查核心版本更新能复用未变化的素材。网页认证和大厅认证沿用现有边界，资源请求不携带网页凭证。原生安装包与真机行为另行验证，不能由浏览器结果代替。

验证“全部下载”的总进度、暂停、继续和重复检查，确认已完成分卷不重复下载。HTTP Basic 站点按资源边界文档公开三个无密钥 Worker 引导脚本，实测注册和缓存图片读取；页面和解密配置继续要求认证。素材离线读取通过不等于网页完全离线冷启动通过，沙盒 iframe 的启动依赖按独立遗留处理。

提交前审查暂存内容，排除真实部署目录、环境凭证、`.audit`、`dist`、`output` 和实际密钥。保留上游 localhost 证书逻辑。按用户要求提交并推送，发布说明中的贡献者不用 GitHub 提及。

交付时分别报告源码提交、构建验证、OSS 分卷与清单、真实浏览器下载、线上 Web 和原生安装包状态。留下未完成阶段的恢复入口，不把其中一项完成写成全链路完成。
