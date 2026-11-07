# 发布 C3nHx 分支版本

本分支从 `C3nHx/noname` 的 GitHub Releases 检查和下载安装包，上游代码来源仍为 `libnoname/noname`。

## 维护版本

版本格式为 `<上游版本>-c3nhx.<分支修订号>`。当前版本是 `1.11.7-c3nhx.1`，对应上游 `1.11.7` 和第 1 次分支修订。

修改 `apps/core/noname/util/distribution.js` 中的 `upstreamVersion` 或 `revision`，然后运行：

```sh
pnpm version:sync
pnpm version:check
pnpm test:distribution
```

同步命令更新核心包、Electron 包、游戏运行时、Android 和 iOS 的版本字段。工作区根 package.json 的 `1.0.0` 不是游戏版本，不参与发行命名。

本分支的更新比较规则先比较完整上游数字版本，再比较分支修订。例如 `1.11.7-c3nhx.10` 高于 `1.11.7-c3nhx.2`，后者高于基线 `1.11.7`，而 `1.11.8` 高于前述版本。不同 fork 的同基线修订不进行大小比较。

这是分支修订规则，不使用 npm 对 prerelease 的排序语义。GitHub Release 会显式标为正式发行，防止含字母后缀的标签被自动当作预发布。

Android 使用递增的整数 versionCode，按 `major * 100000000 + minor * 1000000 + patch * 10000 + revision` 编码；当前为 `111070001`。minor、patch 必须小于 100，revision 为 1 至 9999。iOS 的 marketing version 保持上游三段数字，build version 使用分支修订号。Windows 文件版本为 `1.11.7.1`，应用内显示完整分支版本。

联机协议号 `versionOL` 保持原值 27。启用严格客户端版本检查的房间仍要求完整客户端版本一致。

## 创建发行

先提交版本同步结果和更新日志，再推送与当前配置完全一致的标签。例如：

```sh
git tag v1.11.7-c3nhx.1
git push origin v1.11.7-c3nhx.1
```

Release Action 也支持手动运行，输入一个已经存在的分支版本标签。手动运行会检出该标签，构建元数据记录实际标签提交。

默认构建 core ZIP、完整 ZIP 和 Windows 安装程序。Android 和实验性未签名 iOS 包可通过手动输入开启。标签触发时分别由仓库变量 `RELEASE_ANDROID=true` 和 `RELEASE_IOS=true` 开启。

Android 开启后必须在本 fork 仓库配置以下 secrets，否则 Android 任务失败，草稿不会发布并按失败流程清理：

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

发布仓库使用当前仓库的 `GITHUB_TOKEN`，只需 `contents: write`，不需要跨仓库 token，也不依赖 Discussions 分类。工作流会检查目标仓库为 `C3nHx/noname`。

core、完整包以及各平台产物附带 SHA-256 文件。更新页面列出 Release 上传的安装包，不使用 GitHub 自动生成的源码 ZIP 替代运行包。目前提供检查和下载入口，不在游戏内自动覆盖安装。

## 编译文件渠道

源码标签的根目录没有游戏运行时文件，因此不能用源码标签直接替代编译文件下载渠道。

- `build-output` 是 main 或手动 Build 产生的测试构建。
- `runtime-v1.11.7-c3nhx.1` 是该版本编译运行时的不可变标签，Release 构建阶段创建。同名标签重复构建时内容必须一致。
- `release-output` 只在最新 Release 成功发布后更新。旧版本补发不会覆盖它。

旧的 `coding`、URC 和上游 GitHub 更新设置会转向本 fork；显式配置的其他自定义根地址仍保留。`get.url()` 默认读取 `release-output`，`get.url("nodev")` 读取当前版本的 `runtime-v<版本>`。

首次发布前，这两个正式运行时引用尚不存在。更新页面会报告没有已发布的正式 Release，不回退到上游发行。更新选择只考虑最近 100 条 Release 中已发布、非草稿、非预发布且符合本分支格式的版本。

Nightly 继续保存在本 fork 的 Actions artifacts，名称带 `C3nHx-noname-nightly`，保留 7 天，不参与正式客户端更新。

## 本地校验

```sh
pnpm version:check
pnpm test:distribution
pnpm build
```

原生 Windows、Android 和 iOS 安装包仍需要各自的构建工具链。仅通过版本、渠道测试和工作流静态检查不能证明各平台原生安装包已构建成功。
