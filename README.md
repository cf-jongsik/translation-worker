# Translate Worker

This worker translates web pages on the fly using the Cloudflare Workers platform and a large language model (LLM) provided by the `@cf/meta/m2m100-1.2b` model. It leverages the HTMLRewriter API to parse and modify the incoming HTML and caches the translated results in Cloudflare KV storage.

## How it Works

1. **Request Handling:** The worker intercepts incoming GET requests.
2. **KV Cache Check:** It first checks if a translated version of the requested URL exists in KV storage. If found, it serves the cached version directly.
3. **Language Detection:** It extracts the target language from the URL path (e.g., `/es/example.com` for Spanish). It uses a `languageMap` to validate the language code. If the language code is valid, the part of URL representing the language code is removed so that it can fetch the resource with correct URL.
4. **HTML Rewriting:** If the request is for an HTML page and a valid target language is specified, the worker uses an `HTMLRewriter` to process the page. It specifically targets `<p>` (paragraph) elements.
5. **Text Translation:** Inside the `ElementHandler`, the text content of each paragraph is extracted and split into sentences. Each sentence is then translated using the specified LLM via the `env.AI` binding.
6. **Text Replacement:** The original text within each paragraph is replaced with the translated text.
7. **Caching:** The translated HTML response is cached in KV storage under the original request URL for future use.
8. **Response:** The translated HTML is returned to the client. If original content was not HTML or language code was not supported, the worker passes through the request to original destination and returns the response as-is without modification.

## Deployment

This worker requires the following environment variables:

- **KV:** A binding to a Cloudflare KV namespace for caching translated pages.
- **AI:** A binding to the `@cf/meta/m2m100-1.2b` LLM.

## Usage

To translate a web page, simply prepend the desired language code to the URL. For example:

- To translate `example.com` to Spanish: `/es/example.com`
- To translate `example.com/page.html` to French: `/fr/example.com/page.html`

## Supported Languages

The supported languages are defined in the `languageMap` within the `languageMap.ts` file.

## Limitations

- Currently, the worker only translates text within `<p>` tags. Other elements are not modified.
- The translation quality depends on the performance of the LLM.
- The worker assumes the source language is English.

## Future Improvements

- Support for translating other HTML elements.
- Automatic language detection.
- Error handling and fallback mechanisms.
