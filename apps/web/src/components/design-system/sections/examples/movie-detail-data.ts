"use client";

import { t } from "#src/i18n.ts";

export interface Credit {
  name: string;
  character: string;
}

export interface Movie {
  id: string;
  title: string;
  year: string;
  tagline: string;
  /** Set as the poster's eyebrow, and again in the fact list. */
  studio: string;
  /** Set in the poster's billing block, and again in the fact list. */
  director: string;
  language: string;
  runtime: string;
  releaseDate: string;
  genres: string[];
  rating: string;
  /** The full sentence beside the dial, so the score is announced once in words. */
  ratingLabel: string;
  overview: string;
  cast: Credit[];
  reviewSummary: string;
  /** How opinionated the summary is, 1 to 5. Shown on the Disclosure's Badge. */
  spiciness: number;
}

/**
 * The four Movies the exemplar knows about. All of it is invented and
 * hard-coded: the screen makes no TMDB request, so it renders the same with no
 * API key, no network, and no vector index.
 *
 * Every `t()` call runs on every render, in a fixed order. The i18n transform
 * compiles `t()` to a `useI18nLookup` hook inside a client module, so a lookup
 * reached only for the selected Movie would change the hook order the moment
 * the viewer picked a different one.
 *
 * A hook, and named as one: those compiled lookups are the hook calls, which is
 * also why it can only be called from render scope.
 */
// eslint-disable-next-line @eslint-react/no-unnecessary-use-prefix -- the i18n transform compiles each t() into a useI18nLookup hook call, so the prefix is earned; the rule only sees the pre-transform source
export function useMovies(): Movie[] {
  const northbound: Movie = {
    id: "northbound",
    title: t({ en: "Northbound", zh: "北行" }),
    year: "2024",
    tagline: t({
      en: "Some distances only close when you stop moving.",
      zh: "有些距离，只有停下来才会缩短。",
    }),
    studio: t({ en: "Coldwater Pictures", zh: "冷水影业" }),
    director: t({ en: "Mira Halvorsen", zh: "米拉·哈尔沃森" }),
    language: t({ en: "Norwegian", zh: "挪威语" }),
    runtime: t({ en: "2h 11m", zh: "2小时11分钟" }),
    releaseDate: t({ en: "14 March 2024", zh: "2024年3月14日" }),
    genres: [
      t({ en: "Drama", zh: "剧情" }),
      t({ en: "Mystery", zh: "悬疑" }),
      t({ en: "Thriller", zh: "惊悚" }),
    ],
    rating: "7.8",
    ratingLabel: t({
      en: "7.8 out of 10, from 2,431 votes",
      zh: "10 分制 7.8 分，共 2,431 票",
    }),
    overview: t({
      en: "A marine surveyor returns to the fjord town she left at seventeen, to sign off on a bridge her father spent his life opposing. The paperwork takes an afternoon. Working out what the town owes her, and what she owes it, takes the rest of the winter.",
      zh: "一名海洋测量员回到十七岁时离开的峡湾小镇，为一座父亲毕生反对的桥梁签署验收文件。文件一个下午就签完了，而弄清这座小镇欠她什么、她又欠这座小镇什么，却用掉了整个冬天。",
    }),
    cast: [
      {
        name: t({ en: "Ingrid Sæther", zh: "英格丽·塞特" }),
        character: t({ en: "Åse Lindqvist", zh: "奥瑟·林德奎斯特" }),
      },
      {
        name: t({ en: "Tobias Renn", zh: "托比亚斯·雷恩" }),
        character: t({ en: "Halvard Ness", zh: "哈尔瓦德·内斯" }),
      },
      {
        name: t({ en: "Naomi Adeyemi", zh: "娜奥米·阿德耶米" }),
        character: t({ en: "Dr. Feld", zh: "费尔德医生" }),
      },
      {
        name: t({ en: "Kasper Lund", zh: "卡斯珀·伦德" }),
        character: t({ en: "Jørn", zh: "约恩" }),
      },
      {
        name: t({ en: "Elin Bratt", zh: "埃琳·布拉特" }),
        character: t({ en: "Marit", zh: "玛丽特" }),
      },
      {
        name: t({ en: "Samir Haddad", zh: "萨米尔·哈达德" }),
        character: t({ en: "The ferryman", zh: "渡船人" }),
      },
    ],
    reviewSummary: t({
      en: "Critics agree the fjord photography is the point and the mystery is the excuse. Anyone who came for the thriller the trailer promised leaves restless; everyone else calls it the most patient film of the year.",
      zh: "评论普遍认为峡湾摄影才是重点，悬疑只是借口。为预告片承诺的惊悚而来的观众会看得心浮气躁；其余人则称它是今年最耐心的电影。",
    }),
    spiciness: 3,
  };

  const saltLine: Movie = {
    id: "salt-line",
    title: t({ en: "The Salt Line", zh: "盐线" }),
    year: "2022",
    tagline: t({
      en: "The tide keeps the only honest record.",
      zh: "只有潮水留下诚实的记录。",
    }),
    studio: t({ en: "Saltworks Film", zh: "盐场电影" }),
    director: t({ en: "Hekla Jónsdóttir", zh: "赫克拉·永斯多蒂尔" }),
    language: t({ en: "Icelandic", zh: "冰岛语" }),
    runtime: t({ en: "1h 48m", zh: "1小时48分钟" }),
    releaseDate: t({ en: "2 September 2022", zh: "2022年9月2日" }),
    genres: [t({ en: "Drama", zh: "剧情" }), t({ en: "Mystery", zh: "悬疑" })],
    rating: "7.2",
    ratingLabel: t({
      en: "7.2 out of 10, from 1,190 votes",
      zh: "10 分制 7.2 分，共 1,190 票",
    }),
    overview: t({
      en: "Two sisters inherit a salt works and the ledger that goes with it. One wants to sell before the season turns. The other reads the ledger.",
      zh: "两姐妹继承了一座盐场，以及随之而来的账本。一个想在季节转换前把它卖掉，另一个却开始读那本账。",
    }),
    cast: [
      {
        name: t({ en: "Hekla Jónsdóttir", zh: "赫克拉·永斯多蒂尔" }),
        character: t({ en: "Vala", zh: "瓦拉" }),
      },
      {
        name: t({ en: "Rúnar Blöndal", zh: "鲁纳尔·布伦达尔" }),
        character: t({ en: "The auditor", zh: "审计员" }),
      },
      {
        name: t({ en: "Sigrún Páls", zh: "西格伦·帕尔斯" }),
        character: t({ en: "Brynja", zh: "布林娅" }),
      },
    ],
    reviewSummary: t({
      en: "Slow, and it knows it. Reviewers who stayed for the second hour describe an ending that rearranges the first.",
      zh: "节奏很慢，而且它自己清楚。留下来看完第二小时的评论者说，结尾会把前一小时重新排列一遍。",
    }),
    spiciness: 2,
  };

  const winterFerry: Movie = {
    id: "winter-ferry",
    title: t({ en: "Winter Ferry", zh: "冬渡" }),
    year: "2019",
    tagline: t({
      en: "Ninety minutes of crossing, one way.",
      zh: "九十分钟的航程，只有单程。",
    }),
    studio: t({ en: "Nordhavn Studio", zh: "北港制片" }),
    director: t({ en: "Bo Kristiansen", zh: "博·克里斯蒂安森" }),
    language: t({ en: "Danish", zh: "丹麦语" }),
    runtime: t({ en: "1h 32m", zh: "1小时32分钟" }),
    releaseDate: t({ en: "11 January 2019", zh: "2019年1月11日" }),
    genres: [t({ en: "Drama", zh: "剧情" }), t({ en: "Thriller", zh: "惊悚" })],
    rating: "7.5",
    ratingLabel: t({
      en: "7.5 out of 10, from 3,004 votes",
      zh: "10 分制 7.5 分，共 3,004 票",
    }),
    overview: t({
      en: "A night crossing, eleven passengers, and a crew of four. The ferry docks on time with everyone aboard, which is the part nobody can explain.",
      zh: "一次夜航，十一名乘客，四名船员。渡轮准点靠岸，人也一个不少——而这正是谁也解释不了的地方。",
    }),
    cast: [
      {
        name: t({ en: "Bo Kristiansen", zh: "博·克里斯蒂安森" }),
        character: t({ en: "The mate", zh: "大副" }),
      },
      {
        name: t({ en: "Lene Storm", zh: "莉娜·斯托姆" }),
        character: t({ en: "Agnete", zh: "阿格妮特" }),
      },
      {
        name: t({ en: "Yusuf Demir", zh: "优素福·德米尔" }),
        character: t({ en: "Passenger nine", zh: "九号乘客" }),
      },
    ],
    reviewSummary: t({
      en: "The one everybody argues about. Half the reviews call the last shot a cheat, and the other half call it the reason to watch.",
      zh: "人人都在争论的那一部。一半评论说最后一个镜头是耍赖，另一半说它就是值得一看的理由。",
    }),
    spiciness: 4,
  };

  const harbourLights: Movie = {
    id: "harbour-lights",
    title: t({ en: "Harbour Lights", zh: "港灯" }),
    year: "2023",
    tagline: t({
      en: "Everything the harbour keeps, it keeps in the dark.",
      zh: "港口收着的一切，都收在暗处。",
    }),
    studio: t({ en: "Lantern Bay", zh: "灯湾影业" }),
    director: t({ en: "Annika Ferm", zh: "安妮卡·费尔姆" }),
    language: t({ en: "Swedish", zh: "瑞典语" }),
    runtime: t({ en: "2h 04m", zh: "2小时04分钟" }),
    releaseDate: t({ en: "6 October 2023", zh: "2023年10月6日" }),
    genres: [
      t({ en: "Mystery", zh: "悬疑" }),
      t({ en: "Thriller", zh: "惊悚" }),
    ],
    rating: "6.9",
    ratingLabel: t({
      en: "6.9 out of 10, from 812 votes",
      zh: "10 分制 6.9 分，共 812 票",
    }),
    overview: t({
      en: "A harbour master logs every light on the water for thirty years. The year he retires, the log stops matching the water.",
      zh: "一位港务长把水面上的每一盏灯记录了三十年。退休那年，记录开始和水面对不上了。",
    }),
    cast: [
      {
        name: t({ en: "Annika Ferm", zh: "安妮卡·费尔姆" }),
        character: t({ en: "The harbour master", zh: "港务长" }),
      },
      {
        name: t({ en: "Petter Sund", zh: "佩特·松德" }),
        character: t({ en: "Ola", zh: "奥拉" }),
      },
      {
        name: t({ en: "Mei Lindqvist", zh: "梅·林德奎斯特" }),
        character: t({ en: "The inspector", zh: "督察" }),
      },
    ],
    reviewSummary: t({
      en: "Praised for the sound design and forgiven for the plot. Most reviews stop describing it halfway and start describing how it sounds.",
      zh: "声音设计广受赞誉，情节则被网开一面。多数评论写到一半就不再讲故事，转而去讲它听起来如何。",
    }),
    spiciness: 2,
  };

  return [northbound, saltLine, winterFerry, harbourLights];
}
