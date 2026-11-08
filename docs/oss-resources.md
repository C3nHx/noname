# 将加密资源发布到 OSS

OSS 保存正式加密资源，并直接向客户端下载提供 HTTPS 服务。核心网页继续由现有网页服务提供，资源请求不携带网页认证。CNB 已有附件保留为历史归档，日常构建和下载不依赖 CNB。

## 准备 Bucket 和权限

使用 Bucket 所属账号的 RAM 用户或角色。发布器需要以下权限，限制到目标 Bucket 和资源目录：

- Bucket 上的 `oss:GetBucketLocation` 用于核对地域。
- 资源目录上的 `oss:GetObject`、`oss:PutObject` 和 `oss:PutObjectAcl` 用于读取、上传及设置所发布对象的公开读权限。
- 使用 `--configure-cors` 时，需要 Bucket 上的 `oss:GetBucketCORS` 和 `oss:PutBucketCORS`。也可以先由管理员配置 CORS，日常发布不传此开关。

发布器不设置整个 Bucket 的 ACL，只将上传的资源对象设为 `public-read`。不要配置公共写权限。若账号或 Bucket 的阻止公共访问策略禁止对象公开读，需要由管理员确认此资源目录的访问方案。

若 OSS 返回 `The bucket you access does not belong to you.`，先核对 Bucket 名称、凭证所属主账号和 RAM 授权。不要把某个不存在对象的 `NoSuchKey` 当成已取得 Bucket 管理权限。

通过安全凭证入口提供 `OSS_ACCESS_KEY_ID`、`OSS_ACCESS_KEY_SECRET`，使用 STS 时另提供 `OSS_SECURITY_TOKEN`。只在发布进程中设置这些环境变量，不写入源码、命令参数或日志。资源加密密钥与 OSS 访问凭证用途不同，继续复用已有资源密钥。

## 构建对应版本

以下 PowerShell 示例使用虚构 Bucket 名称。地域入口 `oss-cn-shanghai.aliyuncs.com` 不含 Bucket 名称，实际外网地址形如 `https://example-assets.oss-cn-shanghai.aliyuncs.com/`。

```powershell
$env:NONAME_RESOURCE_ROOT_URL = 'https://example-assets.oss-cn-shanghai.aliyuncs.com/noname/'
pnpm version:check
pnpm test:distribution
pnpm build
node scripts/verify-resource-build.mjs
```

构建会在根地址后追加当前发行版本，例如 `v1.11.7-c3nhx.3/`。需要完整指定目录时，`NONAME_RESOURCE_BASE_URL` 优先于根地址。检查环境中是否残留旧的 `NONAME_RESOURCE_BASE_URL` 或 `NONAME_RESOURCE_DELIVERY_URL`，避免覆盖本次配置。

直接使用 OSS 时无需设置 `NONAME_RESOURCE_DELIVERY_URL`。以后增加 CDN，可用它指定 CDN 的版本目录，或调整正式根地址重新构建。资源文件按明文哈希缓存，换域名不要求重新下载未变化的本地素材。

## 上传并验证资源

在包含锁文件的仓库根目录安装依赖。发布器使用锁定的官方 `ali-oss` SDK，采用 V4 签名。

```sh
node scripts/publish-resources-oss.mjs --bucket example-assets --region oss-cn-shanghai --prefix noname/v1.11.7-c3nhx.3/ --configure-cors --verify-origin https://game.example.com
```

将示例版本和网页 Origin 改为本次实际值。`--verify-origin` 只包含协议、域名和可选端口，不含路径。首次配置 CORS 时，脚本保留现有规则，备份到 `.audit/oss-cors-<bucket>-before.json`，再按需增加允许公开 GET、HEAD 的规则。后续发布可以省略 `--configure-cors`。

默认输入为 `output/resource-packs/resource-manifest.json` 和清单引用的 `.nrp`。`--key-config` 默认读取 `dist/resource-key.json`，仅用于本地校验，不上传。`--base-url` 可指定自定义的公开版本目录，它必须与客户端清单实际选用的下载地址一致。

发布顺序如下：

1. 核对 Bucket 地域、清单地址和资源密钥版本。
2. 本地认证解密每个分卷，上传缺少的对象。上传带禁止覆盖标记。
3. 从公开地址匿名下载每个分卷，再做长度、AES-GCM 认证和明文 ZIP 哈希检查。
4. 全部分卷验证后，最后上传并回读公开清单。
5. 将完成记录写入 `.audit/oss-resource-publication.json`。可通过 `--receipt` 为不同版本保存独立记录。

同名对象不覆盖。同名、同长度但密文不同的已有分卷，必须能认证解密成清单指定的明文才可复用。中断后重跑同一命令，脚本重新核验远端已有内容，缺少的单个对象重新上传，不是从中断字节位置继续。清单内容冲突时使用新版本目录，不覆盖已发布版本。

`--verify-origin` 会检查 OSS 对指定 Origin 的响应头。该检查仍不能代替真实浏览器验证。部署前从实际网页测试下载、解密、进程重启复用和离线读取。

## 配置各端持续构建

四个 GitHub 构建工作流读取仓库变量 `NONAME_RESOURCE_ROOT_URL`。将它配置为公开资源根目录后，各平台构建按当前版本自动生成下载地址。它不含凭证，可以作为普通仓库变量保存。

工作流继续使用 `NONAME_RESOURCE_KEY` secret 保持解密材料一致。当前工作流不自动上传 OSS，也没有收到 OSS 访问凭证。发布新版本时，先构建、上传并验证对应版本的资源，再分发客户端。以后接入自动发布时，另外配置所需的 RAM 或 OIDC 授权。

网页打包会将 `deployment.js` 纳入核心缓存，并为修改后的启动文件生成新的核心构建标识。网页部署只上传轻量客户端，不将 `.nrp` 放回网页服务器。

对象存储直出产生存储、请求和公网下载流量费用。CDN 可在需要更广地域加速或比较计费后再接入。
