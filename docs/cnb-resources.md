# 将加密资源发布到 CNB

当前正式资源分发采用 [OSS 直接下载](./oss-resources.md)。本文保留 CNB 历史归档和可选发布流程，日常构建不依赖它。

资源仓库为 <https://cnb.cool/c4nhx/noname-resources>。仓库主分支保存用途说明，资源放在按客户端版本区分的 Release 中。客户端核心包和解密配置不上传到此仓库。

从上游同步开始的完整维护流程见 [noname-upstream-release skill](../.agents/skills/noname-upstream-release/SKILL.md)。当前 GitHub 工作流不会自动执行此 CNB 发布脚本，构建和上传需要分别完成。本次发布与 Web 部署状态见 [Web 资源分发遗留](./resource-delivery-follow-up.md)。

## 构建并发布

安装并登录 [CNB CLI](https://docs.cnb.cool/zh/develops/cnb-cli.md)。发布需要该仓库的 `repo-release:rw` 权限。官方 `cnb_cli` OAuth 应用可能拒绝 Release 写操作；此时通过 `CNB_TOKEN` 提供有相应权限的个人访问令牌。不要把令牌写入脚本、提交或命令输出。

PowerShell 构建示例：

```powershell
$env:NONAME_RESOURCE_BASE_URL = 'https://cnb.cool/c4nhx/noname-resources/-/releases/download/v1.11.7-c3nhx.3/'
pnpm build
node scripts/verify-resource-build.mjs
node scripts/publish-resources-cnb.mjs --repo c4nhx/noname-resources
```

构建时复用原来的资源密钥。密钥生成与客户端保存位置见[资源加密与密钥](./resource-packs.md#资源加密与密钥)。正式 CI 使用仓库 secret `NONAME_RESOURCE_KEY`，各平台必须一致。每次发布前将示例地址中的版本改为当前客户端版本。

发布器使用 CLI 获取预签名上传地址，按官方流程 PUT 文件并确认上传，附件保留期设为永久。它只上传清单引用的 `.nrp` 和公开 `resource-manifest.json`，不会上传核心目录、明文 ZIP 或密钥。上传后逐卷匿名下载并解密核验，记录在 `.audit/cnb-resource-publication.json`。

已有同名附件不覆盖。中断后可重跑，同一密钥和内容的不同加密结果可解密为相同 ZIP，因此客户端不依赖某一次构建的随机 IV。发布器提供 `--parts-only` 和 `--catalog-only` 两个阶段，允许先上传验证素材，再发布与最终核心构建对应的目录；后者必须有前者的完整验证记录。

## 下载地址与缓存

发布器保存稳定的 Release 下载入口。CNB 会将它重定向到有时效的文件地址，不要把最终重定向地址写进清单。资源请求不携带网页认证。

本次实测 CNB 的 Release 入口和最终文件域均拒绝带外站 Origin 的浏览器请求，返回 403。无 Origin 的服务端下载和校验正常，因此发布成功不代表网页能直接读取这些附件。Web 端还需要支持 CORS 的分发服务、服务端转发或下载后导入；不能仅凭响应头中的 CORS 声明判断可用性。

使用独立分发服务时，将相同的 `.nrp` 和公开清单同步到版本目录，再通过 `NONAME_RESOURCE_DELIVERY_URL` 设置该目录。`NONAME_RESOURCE_BASE_URL` 继续指向 CNB Release，发布器仍在 CNB 校验源文件。只设置地址不会自动创建云存储或同步文件，必须先完成上传和实际浏览器跨域验证。

已下载文件按明文哈希复用，换资源域或重新加密不会让未变化的本地文件重新下载。内容或密钥版本变化会产生新分卷名。保留旧 Release，供旧客户端继续下载。

GitHub Release 工作流仍可提供加密资源镜像。客户端由构建时的 `NONAME_RESOURCE_BASE_URL` 或资源面板中的地址选择下载源，当前没有自动切换多源功能。

官方协议参考 [CNB OpenAPI](https://docs.cnb.cool/zh/develops/openapi.md) 和 [API 定义](https://api.cnb.cool/swagger.json)。
