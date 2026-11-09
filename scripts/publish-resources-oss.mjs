import { parseArgs } from "node:util";
import fs from "node:fs/promises";
import OSS from "ali-oss";
import { configureOssResourceCORS, ossResourceTarget, publishResourcesToOSS, ResourcePublicationError } from "./oss-resources.mjs";

try {
	const { values } = parseArgs({ options: { bucket: { type: "string" }, region: { type: "string" }, prefix: { type: "string" }, "base-url": { type: "string" }, directory: { type: "string", default: "output/resource-packs" }, "key-config": { type: "string", default: "dist/resource-key.json" }, concurrency: { type: "string", default: "3" }, receipt: { type: "string", default: ".audit/oss-resource-publication.json" }, "verify-origin": { type: "string" }, "reuse-prefix": { type: "string" }, "configure-cors": { type: "boolean" } } });
	const target = ossResourceTarget({ bucket: values.bucket, region: values.region, prefix: values.prefix, publicBaseURL: values["base-url"] });
	if (!process.env.OSS_ACCESS_KEY_ID || !process.env.OSS_ACCESS_KEY_SECRET) throw new ResourcePublicationError("Provide OSS_ACCESS_KEY_ID and OSS_ACCESS_KEY_SECRET through the private environment");
	const client = new OSS({ bucket: target.bucket, region: target.region, secure: true, authorizationV4: true, accessKeyId: process.env.OSS_ACCESS_KEY_ID, accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET, stsToken: process.env.OSS_SECURITY_TOKEN || undefined, timeout: 600000 });
	const { location } = await client.getBucketLocation(target.bucket);
	if (location !== target.region) throw new ResourcePublicationError("The OSS bucket is not in the specified region");
	if (values["configure-cors"]) await configureOssResourceCORS({ client, target });
	const result = await publishResourcesToOSS({ client, target, directory: values.directory, keyConfig: JSON.parse(await fs.readFile(values["key-config"], "utf8")), concurrency: Number(values.concurrency), receipt: values.receipt, verifyOrigin: values["verify-origin"], reusePrefix: values["reuse-prefix"], onProgress: progress => console.log(JSON.stringify(progress)) });
	console.log(JSON.stringify({ verified: true, phase: result.phase, provider: result.provider, assets: result.assets.length + 1, receipt: values.receipt }));
} catch (error) {
	if (error.code || error.status) console.error(JSON.stringify({ error: "OSS resource publication failed", status: error.status, code: /^[A-Za-z0-9_]+$/.test(error.code ?? "") ? error.code : undefined }));
	else console.error(error instanceof ResourcePublicationError ? error.message : "OSS resource publication failed; check the manifest, key configuration and output paths");
	process.exitCode = 1;
}
