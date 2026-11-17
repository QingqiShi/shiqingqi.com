import { CalendarDotsIcon } from "@phosphor-icons/react/dist/ssr/CalendarDots";
import { FingerprintIcon } from "@phosphor-icons/react/dist/ssr/Fingerprint";
import { WifiSlashIcon } from "@phosphor-icons/react/dist/ssr/WifiSlash";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { getLocale } from "@tuja/i18n/server-locale";
import { Link } from "@tuja/next-links/link";
import { breakpoints, pointer } from "@tuja/ui/breakpoints.stylex";
import { color } from "@tuja/ui/color.stylex";
import { Button } from "@tuja/ui/components/button";
import { Card } from "@tuja/ui/components/card";
import { Divider } from "@tuja/ui/components/divider";
import { Heading } from "@tuja/ui/components/heading";
import { List } from "@tuja/ui/components/list";
import { ListRow } from "@tuja/ui/components/list-row";
import { NavigationStack } from "@tuja/ui/components/navigation-stack";
import { Text } from "@tuja/ui/components/text";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { controlHeight, font, rhythm, space } from "@tuja/ui/tokens.stylex";
import sampleTrip from "#src/trips/sample-trip.json";
import { tripSchema } from "#src/trips/trip-schema.ts";
import { SampleTripPreview } from "./sample-trip-preview.tsx";

/**
 * The front door, for a visitor who is not signed in: what Trips is, the
 * made-up trip as it reads in the app, and the way to sign up or sign in.
 * It shows only the sample trip from the repo, never a trip from the database.
 */
export function LandingPage() {
  const locale = getLocale();
  const trip = tripSchema.parse(sampleTrip);
  const signInHref = getLocalePath("/sign-in", locale);
  const brand = t({ en: "Trips", zh: "旅行计划" });
  const headerLink = [
    a11y.touchTarget,
    a11y.focusRing,
    typeRole.label,
    styles.link,
    styles.headerLink,
  ];
  const footerLink = [
    a11y.touchTarget,
    a11y.focusRing,
    typeRole.caption,
    styles.link,
  ];

  return (
    <NavigationStack label={brand}>
      <header css={styles.header}>
        <Link
          href={getLocalePath("/", locale)}
          {...stylex.props(headerLink, styles.wordmark)}
        >
          {brand}
        </Link>
        <Link href={signInHref} {...stylex.props(headerLink)}>
          {t({ en: "Sign in", zh: "登录" })}
        </Link>
      </header>
      <div css={styles.hero}>
        <div css={[stack.group, styles.intro]}>
          <div css={stack.item}>
            <Heading level={1} look="display">
              {t({
                en: "One plan for everyone on the trip",
                zh: "同行的每个人，看同一份行程",
              })}
            </Heading>
            <Text>
              {t({
                en: "Trips keeps a group’s trip on one page, day by day: the flights and trains, the places to go and eat, and the bed for each night. It is made for the phone in your pocket.",
                zh: "旅行计划把一趟结伴旅行按天放在一页上：航班和火车、去哪儿玩、在哪儿吃、每晚住哪儿。为装在口袋里的手机而做。",
              })}
            </Text>
          </div>
          <div css={stack.tight}>
            <div css={cluster.item}>
              <Button href={signInHref} look="primary" size="lg">
                {t({ en: "Sign up or sign in", zh: "注册或登录" })}
              </Button>
            </div>
            <Text look="bodySmall" tone="muted">
              {t({
                en: "A trip comes to you by an invite link from its owner. Sign up, then open the link.",
                zh: "行程由它的所有者通过邀请链接分享给你。先注册，再打开链接。",
              })}
            </Text>
          </div>
        </div>
        <figure css={[stack.tight, styles.example]}>
          <Card padding="md" css={styles.exampleCard}>
            <SampleTripPreview trip={trip} />
          </Card>
          <Text as="figcaption" look="caption" tone="muted">
            {t({
              en: "A made-up trip. Step through its days, or see them all on the calendar.",
              zh: "一趟虚构的行程。可以逐天翻看，也可以在日历上看全部日子。",
            })}
          </Text>
        </figure>
        <List css={styles.points}>
          <ListRow
            leading={<CalendarDotsIcon weight="bold" />}
            leadingShape="circle"
            detail={t({
              en: "Where to be and when, what is booked, where to eat and where you sleep.",
              zh: "几点去哪儿、订了什么、在哪儿吃、晚上住哪儿。",
            })}
            wrap
          >
            {t({ en: "Every day on one page", zh: "每天都在一页上" })}
          </ListRow>
          <ListRow
            leading={<WifiSlashIcon weight="bold" />}
            leadingShape="circle"
            detail={t({
              en: "Open a trip once on your phone, and it opens again with no signal.",
              zh: "在手机上打开过一次的行程，没有信号也能再打开。",
            })}
            wrap
          >
            {t({ en: "Reads offline", zh: "离线也能看" })}
          </ListRow>
          <ListRow
            leading={<FingerprintIcon weight="bold" />}
            leadingShape="circle"
            detail={t({
              en: "Only the members of a trip can open it. Each signs in with a passkey, not a password.",
              zh: "只有行程的成员能打开它。每个人用通行密钥登录，不用密码。",
            })}
            wrap
          >
            {t({ en: "Private to its members", zh: "只对成员可见" })}
          </ListRow>
        </List>
      </div>
      <footer css={stack.tight}>
        <Divider />
        <nav
          aria-label={t({ en: "About Trips", zh: "关于旅行计划" })}
          css={cluster.item}
        >
          <Link
            href={getLocalePath("/terms", locale)}
            {...stylex.props(footerLink)}
          >
            {t({ en: "Terms and privacy", zh: "服务条款和隐私政策" })}
          </Link>
          <a href="https://qingqi.dev" {...stylex.props(footerLink)}>
            qingqi.dev
          </a>
        </nav>
      </footer>
    </NavigationStack>
  );
}

const styles = stylex.create({
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  link: {
    display: "inline-flex",
    alignItems: "center",
    color: color.mutedForeground,
    textDecoration: {
      default: "none",
      ":hover": { default: null, [pointer.canHover]: "underline" },
    },
  },
  headerLink: {
    minBlockSize: controlHeight.sm,
  },
  wordmark: {
    fontWeight: font.weight_6,
    color: color.foreground,
  },
  // One column on a phone: the pitch, the example, then the points. From
  // `lg` the example stands beside the pitch and the points.
  hero: {
    display: "grid",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [breakpoints.lg]: "minmax(0, 1fr) minmax(0, 32rem)",
    },
    gridTemplateAreas: {
      default: '"intro" "example" "points"',
      [breakpoints.lg]: '"intro example" "points example"',
    },
    gridTemplateRows: { default: null, [breakpoints.lg]: "auto 1fr" },
    columnGap: rhythm.section,
    rowGap: rhythm.section,
  },
  intro: {
    gridArea: "intro",
    maxInlineSize: "36rem",
    paddingBlockStart: { default: null, [breakpoints.lg]: rhythm.group },
  },
  example: {
    gridArea: "example",
    margin: 0,
  },
  // On a phone the card is narrower than a trip page, so a thinner side
  // keeps the day stepper on one line.
  exampleCard: {
    paddingInline: { default: space._3, [breakpoints.md]: space._5 },
  },
  points: {
    gridArea: "points",
    alignSelf: "start",
    maxInlineSize: "36rem",
  },
});
