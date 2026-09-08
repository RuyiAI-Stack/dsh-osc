import { Context, Service } from "@deepseek-ai/cordis";
import z from "@deepseek-ai/schemastery";

//#region src/config.ts
const Config = z.object({
	token: z.string().required(),
	botEmail: z.string()
});
const PATH = "/integrations/hook-zulip";

//#endregion
//#region src/web/libs/auth.ts
var HttpError = class extends Error {
	constructor(message, status) {
		super(message);
		this.status = status;
	}
};
function authorizeZulipBody(body, expectedToken, botEmail) {
	if (typeof body.token !== "string" || body.token !== expectedToken) throw new HttpError("unauthorized", 401);
	if (botEmail !== void 0 && body.bot_email !== botEmail) throw new HttpError("unauthorized", 401);
	const { token: _token,...payload } = body;
	return payload;
}

//#endregion
//#region src/web/api/webhook.ts
async function readBody(req) {
	const chunks = [];
	for await (const chunk of req) chunks.push(Buffer.from(chunk));
	return Buffer.concat(chunks).toString("utf8");
}
async function handleWebhook(ctx, config, req, res) {
	try {
		if (req.method !== "POST") {
			res.writeHead(405, {
				allow: "POST",
				"content-type": "application/json; charset=utf-8"
			});
			res.end(JSON.stringify({ error: "method not allowed" }));
			return;
		}
		let body;
		try {
			const parsed = JSON.parse(await readBody(req));
			if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new Error("object required");
			body = parsed;
		} catch {
			res.writeHead(400, { "content-type": "application/json; charset=utf-8" });
			res.end(JSON.stringify({ error: "invalid json" }));
			return;
		}
		const payload = authorizeZulipBody(body, config.token, config.botEmail);
		ctx.emit("hook/zulip", payload);
		res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
		res.end(JSON.stringify({ response_not_required: true }));
	} catch (error) {
		const status = error instanceof HttpError ? error.status : 500;
		res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
		res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
	}
}

//#endregion
//#region src/index.ts
var HookZulip = class extends Service {
	static inject = ["webServer"];
	static Config = Config;
	config;
	constructor(ctx, config) {
		super(ctx, "hookZulip");
		this.config = config;
		ctx.effect(() => ctx.webServer.register({
			kind: "prefix",
			path: PATH,
			handler: (req, res) => void handleWebhook(ctx, this.config, req, res)
		}), "hook-zulip: api");
	}
};

//#endregion
export { HttpError, authorizeZulipBody, HookZulip as default };