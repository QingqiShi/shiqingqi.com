// The prototype tuned these values on a real iPhone and on a desktop.
// Do not change one without a new measurement on a device.

// The band gets a pixel budget, not a fixed span. A span that is good on a
// phone uses 100 MB or more on a desktop.
export const BAND_BUDGET_MPX = 2.8;

export const BAND_MAX_SPAN = 4;

// A span of 1.997 gives no more cover than a span of 2, but it changes the
// number of rows that an effect samples. Thus the span goes to the nearest
// eighth.
export const BAND_SPAN_STEP = 1 / 8;

// The guard is the distance from the visible area to the leading band edge
// that starts a move. It is a share of the spare height.
export const GUARD_SHARE = 0.25;

// The worst gap between two animation frames on the device was 88 ms.
export const GUARD_FLOOR_CSS_PX = 200;

// The guard is at least the distance that the present scroll speed covers in
// this time.
export const GUARD_LEAD_S = 0.12;

// The guard must stay below the share that a move puts ahead. If not, the
// visible area is in the guard again after the move, and the band moves on
// the next frame.
export const GUARD_CAP_SHARE = 0.65;

// The share of the spare height that a move puts ahead of the scroll. The
// visible area can only come out of the band on the leading side.
export const AHEAD_SHARE = 0.85;

// A move must give at least this many guards of distance ahead. This sets the
// lowest span.
export const MOVE_GAIN = 2;

// Two scroll readings that are nearer in time than this do not give a speed.
// One pixel in less than a millisecond reads as thousands of pixels a second.
export const MOTION_MIN_DT_MS = 8;

export const MOTION_STALE_MS = 250;

// The speed rises at once and decays over approximately 0.2 s. Thus a gap
// between two scroll events does not read as a stop.
export const MOTION_DECAY = 0.85;

export const DIRECTION_MIN_SPEED = 40;

// An inner height a few pixels outside the probed range comes from a rubber
// band or a keyboard accessory. It is a URL bar change, not a resize.
export const VIEWPORT_SLOP_PX = 8;

export const STRIP_MIN_PX = 0.5;

// A real height change allocates the band again only when the height stops
// changing. Thus one resize gesture costs one allocation, not one for each
// event.
export const RESIZE_SETTLE_MS = 120;
