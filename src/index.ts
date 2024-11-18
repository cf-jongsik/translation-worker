import { languageMap } from './languageMap';

class ElementHandler {
	ai: Ai;
	targetLang: string;
	chunks: string = '';

	constructor(ai: Ai, lang: string) {
		this.ai = ai;
		this.targetLang = lang;
	}

	element(element: Element) {}

	comments(comment: Comment) {}

	async text(text: Text) {
		this.chunks += text.text;
		if (text.lastInTextNode) {
			const sentences = this.chunks.split('.');
			const promiseText = sentences.map(async (sentence) => {
				if (sentence.length > 0) {
					const { translated_text } = await this.ai.run('@cf/meta/m2m100-1.2b', {
						text: sentence,
						source_lang: 'english',
						target_lang: this.targetLang.toLowerCase(),
					});
					console.debug(sentence, ' -> ', translated_text);
					return translated_text;
				}
			});
			const returnText = await Promise.all(promiseText);
			text.replace(returnText.filter((s) => s && s.length > 0).join('.'), { html: true });
			this.chunks = '';
		} else {
			text.remove();
		}
	}
}

export default {
	async fetch(request, env, ctx): Promise<Response> {
		if (request.method !== 'GET') {
			return new Response('Method Not Allowed', { status: 405 });
		}

		const kvResult = await env.KV.get(request.url.toString(), { type: 'stream' });
		if (kvResult) {
			return new Response(kvResult, {
				headers: {
					'content-type': 'text/html',
				},
			});
		}

		const rewriter = new HTMLRewriter();
		const url = new URL(request.url);
		const lang = url.pathname.split('/')[1];
		const match = languageMap[lang] ? true : false;

		if (lang.length <= 3) {
			url.pathname = url.pathname.slice(url.pathname.indexOf('/', 1));
		}

		const res = await fetch(url, request);

		if (match && res.headers.get('content-type')?.includes('text/html')) {
			const translatedRes = rewriter.on('p', new ElementHandler(env.AI, languageMap[lang])).transform(res);
			ctx.waitUntil(env.KV.put(request.url.toString(), translatedRes.clone().body!));
			return translatedRes;
		}
		return res;
	},
} satisfies ExportedHandler<Env>;
