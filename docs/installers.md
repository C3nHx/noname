# 构建三端安装程序

`Build Installers` 工作流为同一份源码生成 Windows x64 NSIS 安装 EXE、Android APK 和 iOS IPA。三端独立运行，产物保存在 Actions artifacts，保留三天。此流程不创建版本标签，也不发布 GitHub Release。

在 Actions 页面选择 `Build Installers`，默认三端都开启。`source_ref` 可以指定提交或标签，留空时使用启动工作流的提交。`require_signing` 默认开启。

```sh
gh workflow run installers.yml --ref fork -f windows=true -f android=true -f ios=true -f require_signing=true
```

Windows 安装程序使用正式 NSIS 构建。Android 和 iOS 使用已有签名材料，缺少材料时先生成明确标注为 unsigned 的编译产物，再将对应任务标为失败。unsigned APK、IPA 都不能作为已签名安装程序使用，也不会自动替换成新建的测试签名。

需要本地安装与自签侧载测试包时，显式开启 `android_test_signing` 并关闭 `require_signing`。Android 使用 SDK 的测试证书生成可安装的 `.android.test.apk`，iOS 输出需自行签名侧载的 `.ios.unsigned.ipa`。云端测试证书不作为正式更新证书使用。

## Android 签名

在本 fork 的 Actions secrets 配置已有密钥库的四项信息：

- `ANDROID_KEYSTORE_BASE64`，原 JKS 或 keystore 文件的 Base64。
- `ANDROID_KEYSTORE_PASSWORD`。
- `ANDROID_KEY_ALIAS`。
- `ANDROID_KEY_PASSWORD`。

任务使用 JDK 21 和 Android SDK 36 构建 release APK，并通过 `apksigner verify` 检查签名。升级已有应用还要求 applicationId 和签名证书与旧安装一致。

## Apple 签名

在 Actions secrets 配置：

- `IOS_CERTIFICATE_BASE64`，已有 P12 证书和私钥的 Base64。
- `IOS_CERTIFICATE_PASSWORD`，P12 密码，未加密时可为空。
- `IOS_PROVISION_PROFILE_BASE64`，对应 mobileprovision 文件的 Base64。

脚本从描述文件读取 Team ID、Bundle ID、有效期、证书和分发方式。P12 必须包含与描述文件匹配的有效签名身份。通配描述文件默认匹配项目的 `com.libnoname.noname`，需要其他标识时配置仓库变量 `IOS_BUNDLE_ID`。

构建在 macOS/Xcode 上导入临时 keychain，执行手动签名 archive 和 export，并验证应用签名。完整角色图片、音频和集成扩展随包保留。

development 与 Ad Hoc 包只能安装在描述文件允许的设备上。App Store 类型的签名包需要通过 App Store Connect、TestFlight 或 App Store 分发，不能当作普通侧载包直接安装。具体分发方式记录在 `ios-signing-status.json`。

签名文件只进入 runner 临时目录，构建后清理，不进入安装产物或 Git 源码。安装产物附带 SHA-256 文件。Windows Authenticode 签名与移动端签名是不同机制，当前 Windows 流程没有设置 Windows 代码签名证书。
