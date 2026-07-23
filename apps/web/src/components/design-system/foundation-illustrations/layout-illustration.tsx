/**
 * Layout foundation-card illustration. Styling and animation live in
 * `layout.css` under the `.dsi-layout` namespace; this component is pure
 * geometry.
 *
 * A breakpoint ruler (360 / 768 / 1024 / 1440) tilts gently across the top with
 * tick marks and an origin bracket. Below it a block of eight vertical columns
 * recedes in a subtle perspective (a shared `skewY` keeps the verticals upright
 * while the top edge rises to the right) and bleeds off the bottom edge. A
 * dashed 16:9 aspect box sits over the columns. At rest everything is a dim
 * metallic grey; on hover the keylines and labels bloom warm gold, the column
 * block drifts a touch toward the cursor, and a breakpoint handle scrubs along
 * the ruler tracking the pointer's horizontal position.
 */
export function LayoutIllustration() {
  return (
    <svg
      className="dsi-layout"
      viewBox="0 0 320 176"
      preserveAspectRatio="xMaxYMax meet"
      aria-hidden="true"
    >
      <g className="art">
        {/* Column grid — eight vertical strips inside a keyline frame, sharing a
            gentle skew so the top edge recedes to the right while the strips
            stay vertical. Bleeds off the bottom edge. */}
        <g className="grid">
          <g className="cols">
            <rect className="col" x="150" y="120" width="19" height="84" />
            <rect className="col" x="171" y="120" width="19" height="84" />
            <rect className="col" x="192" y="120" width="19" height="84" />
            <rect className="col" x="213" y="120" width="19" height="84" />
            <rect className="col" x="234" y="120" width="19" height="84" />
            <rect className="col" x="255" y="120" width="19" height="84" />
            <rect className="col" x="276" y="120" width="19" height="84" />
            <rect className="col" x="297" y="120" width="19" height="84" />
          </g>

          {/* Block frame around the columns. */}
          <rect
            className="frame"
            x="150"
            y="120"
            width="166"
            height="84"
            rx="2"
          />

          {/* Dashed 16:9 aspect box overlaid on the columns. */}
          <rect
            className="ratio"
            x="196"
            y="146"
            width="96"
            height="62"
            rx="1"
          />
        </g>

        {/* Aspect-ratio label — drawn upright, outside the skewed grid. */}
        <text className="ratio-label" x="248" y="162">
          16:9
        </text>

        {/* Breakpoint ruler: tilted baseline, origin bracket, ticks + labels. */}
        <g className="ruler">
          <line className="rline" x1="148" y1="106" x2="322" y2="96" />

          {/* Origin bracket at the left end of the ruler. */}
          <line className="tick bracket" x1="158" y1="100" x2="158" y2="113" />

          {/* Ticks hanging below the baseline at each breakpoint. */}
          <line className="tick" x1="178" y1="102" x2="178" y2="112" />
          <line className="tick" x1="228" y1="99" x2="228" y2="109" />
          <line className="tick" x1="272" y1="96" x2="272" y2="107" />
          <line className="tick" x1="312" y1="94" x2="312" y2="105" />

          {/* Breakpoint labels above their ticks. */}
          <text className="rlabel" x="178" y="93">
            360
          </text>
          <text className="rlabel" x="228" y="90">
            768
          </text>
          <text className="rlabel" x="272" y="88">
            1024
          </text>
          <text className="rlabel" x="305" y="86">
            1440
          </text>

          {/* Handle tracking the cursor's horizontal position along the ruler. */}
          <circle className="handle" cx="162" cy="105" r="2.6" />
        </g>
      </g>
    </svg>
  );
}
