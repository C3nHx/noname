import datetime
import fnmatch
import hashlib
import json
import os
import pathlib
import plistlib
import re
import shlex
import shutil
import subprocess
import sys
import tempfile


ROOT = pathlib.Path(__file__).resolve().parents[1]
PROJECT = ROOT / "native/ios/App/App.xcodeproj"
OUTPUT = pathlib.Path(os.environ.get("NONAME_INSTALLER_OUTPUT", ROOT.parents[1] / "installers")).resolve()
VERSION = json.loads((ROOT.parent / "core/package.json").read_text(encoding="utf-8"))["version"]


def run(arguments, capture=False):
    result = subprocess.run(arguments, stdout=subprocess.PIPE if capture else None, check=False)
    if result.returncode:
        raise RuntimeError(f"{arguments[0]} failed with exit code {result.returncode}")
    return result.stdout if capture else None


def write_outputs(ipa, metadata):
    with ipa.open("rb") as stream:
        digest = hashlib.file_digest(stream, "sha256").hexdigest()
    ipa.with_suffix(ipa.suffix + ".sha256").write_text(f"{digest}  {ipa.name}\n", encoding="ascii")
    (OUTPUT / "ios-signing-status.json").write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    github_output = os.environ.get("GITHUB_OUTPUT")
    if github_output:
        with open(github_output, "a", encoding="utf-8") as stream:
            stream.write(f"signed={str(metadata['signed']).lower()}\n")
    print(json.dumps({"file": ipa.name, "bytes": ipa.stat().st_size, **metadata}))


def package_unsigned(temporary):
    derived = temporary / "DerivedData"
    run(["xcodebuild", "-project", str(PROJECT), "-scheme", "App", "-configuration", "Release",
         "-destination", "generic/platform=iOS", "-derivedDataPath", str(derived),
         "CODE_SIGNING_ALLOWED=NO", "CODE_SIGNING_REQUIRED=NO", "CODE_SIGN_IDENTITY=", "build"])
    app = derived / "Build/Products/Release-iphoneos/App.app"
    if not app.is_dir():
        raise RuntimeError("Xcode did not produce App.app")
    ipa = OUTPUT / f"noname.{VERSION}.ios.unsigned.ipa"
    payload = temporary / "Payload"
    payload.mkdir()
    shutil.move(str(app), str(payload / "App.app"))
    run(["ditto", "-c", "-k", "--keepParent", str(payload), str(ipa)])
    write_outputs(ipa, {"signed": False, "installable": False, "reason": "Apple signing materials are not configured"})


def package_signed(temporary, certificate, profile, password):
    decoded = run(["security", "cms", "-D", "-i", str(profile)], capture=True)
    properties = plistlib.loads(decoded)
    expiration = properties["ExpirationDate"].replace(tzinfo=datetime.timezone.utc)
    if expiration <= datetime.datetime.now(datetime.timezone.utc):
        raise RuntimeError("The provisioning profile has expired")
    team = properties["TeamIdentifier"][0]
    entitlements = properties["Entitlements"]
    identifier = entitlements.get("application-identifier", entitlements.get("com.apple.application-identifier", ""))
    prefix, separator, allowed_bundle = identifier.partition(".")
    if not prefix or not separator or not allowed_bundle:
        raise RuntimeError("The provisioning profile has no application identifier")
    bundle = os.environ.get("IOS_BUNDLE_ID") or ("com.libnoname.noname" if "*" in allowed_bundle else allowed_bundle)
    if not fnmatch.fnmatchcase(bundle, allowed_bundle):
        raise RuntimeError("The provisioning profile does not cover IOS_BUNDLE_ID")
    if entitlements.get("get-task-allow"):
        method = "debugging"
    elif properties.get("ProvisionsAllDevices"):
        method = "enterprise"
    elif properties.get("ProvisionedDevices"):
        method = "release-testing"
    else:
        method = "app-store-connect"
    uuid = properties["UUID"]
    if not re.fullmatch(r"[A-Fa-f0-9]{8}(?:-[A-Fa-f0-9]{4}){3}-[A-Fa-f0-9]{12}", uuid):
        raise RuntimeError("Invalid provisioning profile UUID")
    profile_files = []
    keychain = temporary / "signing.keychain-db"
    keychain_password = os.urandom(24).hex()
    previous_keychains = shlex.split(run(["security", "list-keychains", "-d", "user"], capture=True).decode())
    try:
        run(["security", "create-keychain", "-p", keychain_password, str(keychain)])
        run(["security", "set-keychain-settings", "-lut", "21600", str(keychain)])
        run(["security", "unlock-keychain", "-p", keychain_password, str(keychain)])
        run(["security", "import", str(certificate), "-P", password, "-A", "-t", "cert", "-f", "pkcs12", "-k", str(keychain)])
        run(["security", "set-key-partition-list", "-S", "apple-tool:,apple:,codesign:", "-s", "-k", keychain_password, str(keychain)])
        run(["security", "list-keychains", "-d", "user", "-s", str(keychain), *previous_keychains])
        identities = run(["security", "find-identity", "-v", "-p", "codesigning", str(keychain)], capture=True).decode()
        allowed_certificates = {hashlib.sha1(data).hexdigest().upper() for data in properties["DeveloperCertificates"]}
        matches = [identity for identity in re.findall(r"\b[0-9A-F]{40}\b", identities.upper()) if identity in allowed_certificates]
        if len(matches) != 1:
            raise RuntimeError("P12 must contain one valid signing identity matching the provisioning profile")
        identity = matches[0]
        for directory in [pathlib.Path.home() / "Library/MobileDevice/Provisioning Profiles", pathlib.Path.home() / "Library/Developer/Xcode/UserData/Provisioning Profiles"]:
            directory.mkdir(parents=True, exist_ok=True)
            destination = directory / f"{uuid}.mobileprovision"
            if destination.exists():
                if destination.read_bytes() != profile.read_bytes():
                    raise RuntimeError("A different provisioning profile already exists with the same UUID")
            else:
                shutil.copyfile(profile, destination)
                profile_files.append(destination)
        archive = temporary / "noname.xcarchive"
        run(["xcodebuild", "-project", str(PROJECT), "-scheme", "App", "-configuration", "Release",
             "-destination", "generic/platform=iOS", "-archivePath", str(archive),
             "-derivedDataPath", str(temporary / "DerivedData"), "CODE_SIGN_STYLE=Manual",
             f"DEVELOPMENT_TEAM={team}", f"PRODUCT_BUNDLE_IDENTIFIER={bundle}",
             f"PROVISIONING_PROFILE_SPECIFIER={uuid}", f"CODE_SIGN_IDENTITY={identity}",
             f"OTHER_CODE_SIGN_FLAGS=--keychain {keychain}", "archive"])
        shutil.rmtree(temporary / "DerivedData")
        options = temporary / "ExportOptions.plist"
        options.write_bytes(plistlib.dumps({"method": method, "teamID": team, "signingStyle": "manual",
            "signingCertificate": identity, "provisioningProfiles": {bundle: uuid}, "manageAppVersionAndBuildNumber": False}))
        exported = temporary / "export"
        run(["xcodebuild", "-exportArchive", "-archivePath", str(archive), "-exportPath", str(exported), "-exportOptionsPlist", str(options)])
        packages = list(exported.glob("*.ipa"))
        if len(packages) != 1:
            raise RuntimeError("Xcode must export exactly one IPA")
        ipa = OUTPUT / f"noname.{VERSION}.ios.ipa"
        shutil.copyfile(packages[0], ipa)
        shutil.rmtree(archive)
        checked = temporary / "verify-export"
        run(["ditto", "-x", "-k", str(ipa), str(checked)])
        applications = list((checked / "Payload").glob("*.app"))
        if len(applications) != 1:
            raise RuntimeError("Exported IPA must contain exactly one application")
        exported_app = applications[0]
        run(["codesign", "--verify", "--deep", "--strict", str(exported_app)])
        exported_info = plistlib.loads((exported_app / "Info.plist").read_bytes())
        exported_profile = plistlib.loads(run(["security", "cms", "-D", "-i", str(exported_app / "embedded.mobileprovision")], capture=True))
        if exported_info.get("CFBundleIdentifier") != bundle or exported_profile.get("UUID") != uuid:
            raise RuntimeError("Exported IPA does not match the requested application and profile")
        write_outputs(ipa, {"signed": True, "bundleId": bundle, "distribution": method,
            "installationRoute": "app-store-connect" if method == "app-store-connect" else ("enterprise-distribution" if method == "enterprise" else "registered-devices"),
            "deviceCount": len(properties.get("ProvisionedDevices", [])),
            "profileExpires": expiration.isoformat()})
    finally:
        subprocess.run(["security", "list-keychains", "-d", "user", "-s", *previous_keychains], stdout=subprocess.DEVNULL, check=False)
        subprocess.run(["security", "delete-keychain", str(keychain)], stdout=subprocess.DEVNULL, check=False)
        for file in profile_files:
            file.unlink(missing_ok=True)


def main():
    if sys.platform != "darwin":
        raise RuntimeError("iOS packaging requires macOS and Xcode")
    OUTPUT.mkdir(parents=True, exist_ok=True)
    certificate = os.environ.get("IOS_CERTIFICATE_PATH")
    profile = os.environ.get("IOS_PROVISION_PROFILE_PATH")
    if bool(certificate) != bool(profile):
        raise RuntimeError("Both IOS_CERTIFICATE_PATH and IOS_PROVISION_PROFILE_PATH are required")
    with tempfile.TemporaryDirectory(prefix="noname-ios-", dir=os.environ.get("RUNNER_TEMP")) as directory:
        temporary = pathlib.Path(directory)
        if certificate and profile:
            package_signed(temporary, pathlib.Path(certificate), pathlib.Path(profile), os.environ.get("IOS_CERTIFICATE_PASSWORD", ""))
        else:
            package_unsigned(temporary)


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, KeyError, OSError) as error:
        raise SystemExit(str(error)) from None
