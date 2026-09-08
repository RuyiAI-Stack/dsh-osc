import { Context, Service } from "@deepseek-ai/cordis";
import { defineTool } from "@deepseek-ai/dsh-tools";

//#region src/tools/libs/validate.ts
function requireBody(body) {
	if (typeof body !== "string" || body.length === 0) throw new Error("pr-chat: body is required");
}
function requireRepo(repo) {
	if (typeof repo !== "string") throw new Error("pr-chat: repo is required");
	const parts = repo.split("/");
	if (parts.length !== 2 || parts.some((part) => part.length === 0 || part === "." || part === "..")) throw new Error("pr-chat: repo must be in owner/name form");
	return parts;
}
function requireNumber(number) {
	if (!Number.isSafeInteger(number) || number <= 0) throw new Error("pr-chat: pull request number must be positive");
}
function requireSessionId(sessionId) {
	if (typeof sessionId !== "string" || sessionId.length === 0) throw new Error("pr-chat: sessionId is required");
}
function requirePath(path) {
	if (path !== "pr" && path !== "bot") throw new Error(`pr-chat: invalid path ${String(path)}`);
}

//#endregion
//#region src/tools/libs/send.ts
function ctxEmit(ctx, event, value) {
	ctx.emit(event, value);
}
async function sendPr(ctx, target, body) {
	const [org] = requireRepo(target.repo);
	requireNumber(target.number);
	const githubBot = ctx.get("githubBot");
	if (githubBot === void 0) throw new Error("pr-chat: githubBot service is not available");
	const result = await githubBot.createComment({
		org,
		repo: target.repo,
		number: target.number,
		body
	});
	return {
		path: "pr",
		target,
		commentId: result.commentId,
		url: result.url
	};
}
async function sendBot(ctx, target, body) {
	requireSessionId(target.sessionId);
	const agent = ctx.agents.get(target.sessionId);
	if (agent === void 0) throw new Error(`pr-chat: bot session "${target.sessionId}" is not live`);
	await ctx.agentRuntime.prompt(agent, [{
		type: "text",
		text: body
	}]);
	return {
		path: "bot",
		target
	};
}
async function send(ctx, request) {
	requirePath(request.path);
	requireBody(request.body);
	ctxEmit(ctx, "pr-chat/path", {
		path: request.path,
		target: request.target
	});
	const result = request.path === "pr" ? await sendPr(ctx, request.target, request.body) : await sendBot(ctx, request.target, request.body);
	ctxEmit(ctx, "pr-chat/sent", {
		path: request.path,
		target: request.target,
		result
	});
	return result;
}

//#endregion
//#region src/tools/api/send-to-bot.ts
async function sendToBot(ctx, request) {
	requireBody(request.body);
	return send(ctx, {
		path: "bot",
		target: { sessionId: request.sessionId },
		body: request.body
	});
}
function defineSendToBotTool(chat) {
	return defineTool({
		name: "pr_chat_send_to_bot",
		description: "Send a message to a local bot session without contacting GitHub.",
		parameters: {
			sessionId: {
				type: "string",
				required: true
			},
			body: {
				type: "string",
				required: true
			}
		},
		output: {
			schema: {
				type: "object",
				properties: {
					path: {
						type: "string",
						required: true
					},
					target: {
						type: "json",
						required: true
					}
				},
				additionalProperties: false
			},
			render: (_args, value) => [{
				type: "text",
				text: JSON.stringify(value)
			}]
		},
		execute: async (args) => sendToBot(chat.ctx, args)
	});
}

//#endregion
//#region src/tools/api/send-to-pr.ts
async function sendToPr(ctx, request) {
	requireBody(request.body);
	return send(ctx, {
		path: "pr",
		target: {
			repo: request.repo,
			number: request.number
		},
		body: request.body
	});
}
function defineSendToPrTool(chat) {
	return defineTool({
		name: "pr_chat_send_to_pr",
		description: "Post a comment on a GitHub issue or pull request as the configured GitHub App.",
		parameters: {
			repo: {
				type: "string",
				required: true,
				description: "Repository in owner/name form."
			},
			number: {
				type: "number",
				required: true,
				description: "Issue or pull request number."
			},
			body: {
				type: "string",
				required: true
			}
		},
		output: {
			schema: {
				type: "object",
				properties: {
					path: {
						type: "string",
						required: true
					},
					target: {
						type: "json",
						required: true
					},
					commentId: {
						type: "number",
						required: true
					},
					url: {
						type: "string",
						required: true
					}
				},
				additionalProperties: false
			},
			render: (_args, value) => [{
				type: "text",
				text: JSON.stringify(value)
			}]
		},
		execute: async (args) => sendToPr(chat.ctx, args)
	});
}

//#endregion
//#region src/index.ts
var PrChat = class extends Service {
	static inject = [
		"githubBot",
		"agents",
		"agentRuntime",
		"tools"
	];
	constructor(ctx) {
		super(ctx, "prChat");
		ctx.tools.register(defineSendToPrTool(this));
		ctx.tools.register(defineSendToBotTool(this));
	}
};

//#endregion
export { PrChat as default, requireBody, requireNumber, requirePath, requireRepo, requireSessionId, send, sendToBot, sendToPr };