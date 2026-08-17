/**
 * Renders a `<script>` whose body is injected verbatim (theme init before
 * hydration, service-worker cleanup, JSON-LD). This is the one sanctioned
 * `dangerouslySetInnerHTML` call site in the app.
 *
 * Contract: `html` must be a static or pre-escaped string — build-time
 * constants or output already run through an escaper (e.g. JSON-LD with
 * `<` replaced). Never interpolate unescaped user data into it.
 */
export function InlineScript({ html, type }: { html: string; type?: string }) {
  // eslint-disable-next-line @eslint-react/dom-no-dangerously-set-innerhtml -- the one sanctioned call site; see the doc comment for the contract
  return <script type={type} dangerouslySetInnerHTML={{ __html: html }} />;
}
