/**
 * Renders a `<script>` with an inline body: the theme init that runs before
 * hydration, or JSON-LD. React escapes `</script` in the body, so the body
 * cannot close the element early.
 *
 * Contract: a JavaScript body runs as written, so it must be a build-time
 * constant. Never interpolate user data into it.
 */
export function InlineScript({
  children,
  type,
}: {
  children: string;
  type?: string;
}) {
  return <script type={type}>{children}</script>;
}
