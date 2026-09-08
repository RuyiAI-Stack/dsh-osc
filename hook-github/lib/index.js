import { Context, Service } from "@deepseek-ai/cordis";
import z from "@deepseek-ai/schemastery";
import { createHmac, timingSafeEqual } from "node:crypto";

//#region src/config.ts
const Config = z.object({ secret: z.string().required() });
const PATH = "/integrations/hook-github";

//#endregion
//#region src/web/libs/signature.ts
var HttpError = class extends Error {
	constructor(message, status) {
		super(message);
		this.status = status;
	}
};
function verifyGithubSignature(secret, body, signature) {
	const expected = "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
	const actual = Buffer.from(signature);
	const expectedBuffer = Buffer.from(expected);
	return actual.length === expectedBuffer.length && timingSafeEqual(actual, expectedBuffer);
}

//#endregion
//#region src/web/api/webhook.ts
async function readBody(req) {
	const chunks = [];
	for await (const chunk of req) chunks.push(Buffer.from(chunk));
	return Buffer.concat(chunks);
}
async function handleWebhook(ctx, config, req, res) {
	if (req.method !== "POST") {
		res.writeHead(405);
		res.end();
		return;
	}
	const signature = req.headers["x-hub-signature-256"];
	if (typeof signature !== "string") throw new HttpError("missing GitHub signature", 401);
	const body = await readBody(req);
	if (!verifyGithubSignature(Buffer.from(config.secret), body, signature)) throw new HttpError("invalid GitHub signature", 401);
	const delivery = req.headers["x-github-delivery"];
	const event = req.headers["x-github-event"];
	if (typeof delivery !== "string" || typeof event !== "string") throw new HttpError("missing GitHub event headers", 400);
	let payload;
	try {
		payload = JSON.parse(body.toString("utf8"));
	} catch {
		throw new HttpError("invalid JSON", 400);
	}
	ctx.emit("hook/github", {
		delivery,
		event,
		payload
	});
	res.writeHead(204);
	res.end();
}

//#endregion
//#region src/index.ts
var HookGithub = class extends Service {
	static inject = ["webServer"];
	static Config = Config;
	constructor(ctx, config) {
		super(ctx, "hookGithub");
		this.config = config;
		ctx.effect(() => ctx.webServer.register({
			kind: "prefix",
			path: PATH,
			handler: async (req, res) => {
				try {
					await handleWebhook(ctx, this.config, req, res);
				} catch (err) {
					if (!(err instanceof HttpError)) throw err;
					res.writeHead(err.status);
					res.end(err.message);
				}
			}
		}), "hook-github: api");
	}
};

//#endregion
export { HttpError, HookGithub as default, verifyGithubSignature };