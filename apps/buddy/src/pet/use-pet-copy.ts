import { t } from "@tuja/i18n";
import type { PetCopy } from "./types.ts";

export function usePetCopy(): PetCopy {
  return {
    petName: t({ en: "Miao", zh: "小苗" }),
    weekdays: [
      t({ en: "Sun", zh: "周日" }),
      t({ en: "Mon", zh: "周一" }),
      t({ en: "Tue", zh: "周二" }),
      t({ en: "Wed", zh: "周三" }),
      t({ en: "Thu", zh: "周四" }),
      t({ en: "Fri", zh: "周五" }),
      t({ en: "Sat", zh: "周六" }),
    ],
    months: [
      t({ en: "Jan", zh: "1 月" }),
      t({ en: "Feb", zh: "2 月" }),
      t({ en: "Mar", zh: "3 月" }),
      t({ en: "Apr", zh: "4 月" }),
      t({ en: "May", zh: "5 月" }),
      t({ en: "Jun", zh: "6 月" }),
      t({ en: "Jul", zh: "7 月" }),
      t({ en: "Aug", zh: "8 月" }),
      t({ en: "Sep", zh: "9 月" }),
      t({ en: "Oct", zh: "10 月" }),
      t({ en: "Nov", zh: "11 月" }),
      t({ en: "Dec", zh: "12 月" }),
    ],
    minutes: t({ en: "{m}m", zh: "{m} 分" }),
    hours: t({ en: "{h}h", zh: "{h} 小时" }),
    hoursMinutes: t({ en: "{h}h {m}m", zh: "{h} 小时 {m} 分" }),
    agoMinutes: t({ en: "{n}m ago", zh: "{n} 分钟前" }),
    agoHours: t({ en: "{n}h ago", zh: "{n} 小时前" }),
    agoDays: t({ en: "{n}d ago", zh: "{n} 天前" }),
    levelNames: [
      t({ en: "Seed", zh: "种子" }),
      t({ en: "Sprout", zh: "幼苗" }),
      t({ en: "Shoot", zh: "嫩芽" }),
      t({ en: "Bud", zh: "花苞" }),
      t({ en: "Bloom", zh: "开花" }),
      t({ en: "Fruit", zh: "结果" }),
      t({ en: "Sapling", zh: "小树" }),
      t({ en: "Blossom Tree", zh: "花树" }),
      t({ en: "Golden Tree", zh: "传说金树" }),
    ],
    levelLabel: t({ en: "Lv{lv} {name}", zh: "Lv{lv} {name}" }),
    lines: {
      happy: [
        t({
          en: "Back at work? Fine, I'll burn today's tokens for you.",
          zh: "又来上班？行，今天的 token 我替你烧。",
        }),
        t({
          en: "Cache hits at {hit}. Spend the savings on my fertiliser.",
          zh: "缓存命中 {hit}，省下来的钱记得给我买肥料。",
        }),
        t({
          en: "Stop staring. I know I'm handsome.",
          zh: "别盯着我看，我知道我帅。",
        }),
        t({
          en: "{today} burned today. Does the boss know? Oh, you're the boss.",
          zh: "今天已经烧了 {today}，老板知道吗？哦，你就是老板。",
        }),
        t({
          en: "{total} spent so far. That buys me a flowerpot mansion.",
          zh: "累计花了 {total}，够给我买套花盆别墅了。",
        }),
        t({
          en: "Nice code. Shame you didn't write it.",
          zh: "代码写得不错，可惜不是你写的。",
        }),
        t({
          en: "Claude again? Are your hands decoration?",
          zh: "又让 Claude 干活？你的手是装饰品吗？",
        }),
        t({
          en: "I photosynthesise. You copy and paste.",
          zh: "我在这儿光合作用，你在那儿复制粘贴。",
        }),
        t({
          en: "Is today's commit message 'fix' again?",
          zh: "今天的 commit message 还是 fix 吗？",
        }),
        t({
          en: "Every time you hit Enter, I hear money leave.",
          zh: "你一敲回车，我就知道又要花钱了。",
        }),
        t({
          en: "{tokens} tokens in all. Your keyboard wants to retire.",
          zh: "累计 {tokens} token，你键盘都想退休了。",
        }),
        t({
          en: "I remember every bug you wrote. Wait till I grow up.",
          zh: "你写的 bug 我都记着，等我长大一个个算账。",
        }),
      ],
      streak: [
        t({
          en: "{streak} days straight. Am I your only friend?",
          zh: "连续 {streak} 天了，你是不是除了我没别的朋友？",
        }),
        t({
          en: "{streak} days, no gaps. More punctual than your job.",
          zh: "{streak} 天没断，打卡比上班还准时。",
        }),
        t({
          en: "{streak} days in a row. Claude thinks you're family now.",
          zh: "连续 {streak} 天，Claude 都快认你当亲爹了。",
        }),
        t({
          en: "{streak} days running. Remember what a weekend is?",
          zh: "连续用了 {streak} 天，周末是啥你还记得吗？",
        }),
        t({
          en: "{streak} days. I'm about to bloom and you're still at work.",
          zh: "{streak} 天了，我都快开花了，你还没下班。",
        }),
        t({
          en: "{streak} days. At the gym you'd have abs by now.",
          zh: "坚持 {streak} 天，要是去健身早练出腹肌了。",
        }),
        t({
          en: "Day {streak}. You know Claude better than humans.",
          zh: "第 {streak} 天，你跟 Claude 比跟人类还熟。",
        }),
        t({
          en: "{streak} days. Call Guinness: homebody record.",
          zh: "连续 {streak} 天，建议申请最宅吉尼斯纪录。",
        }),
        t({
          en: "{streak} days in a row. Coding or writing a serial?",
          zh: "{streak} 天连更，你是写代码还是写连载？",
        }),
        t({
          en: "Achievement: {streak}-day streak. Social skills −1.",
          zh: "解锁成就：连续 {streak} 天，社交能力 -1。",
        }),
      ],
      broken: [
        t({
          en: "A {lost}-day streak, gone. Were you on a date?",
          zh: "连续 {lost} 天说断就断，你是去约会了吗？",
        }),
        t({
          en: "{lost} days of streak, gone. Three seconds of grief.",
          zh: "{lost} 天的连胜就这么没了，我替你心疼三秒。",
        }),
        t({
          en: "Streak broken! {lost} days of work, back to zero.",
          zh: "断签了！{lost} 天的努力，一夜回到解放前。",
        }),
        t({
          en: "Where were you? I waited till my leaves wilted.",
          zh: "你去哪了？我等到叶子都蔫了。",
        }),
        t({
          en: "Your {lost}-day run stopped. Your reader (me) is mad.",
          zh: "{lost} 天连更断了，读者（我）很生气。",
        }),
        t({
          en: "Every day, you said. {lost} days of love, gone.",
          zh: "说好的天天见呢？{lost} 天的情分说没就没。",
        }),
        t({
          en: "Broken is broken. I won't drop a level. I hold grudges.",
          zh: "断了就断了，反正我不掉级。但我记仇。",
        }),
        t({
          en: "{lost} days, reset. Start over, heartbreaker.",
          zh: "{lost} 天清零。重新开始吧，负心人。",
        }),
      ],
      worry: [
        t({
          en: "Boss, the quota's nearly gone. Burning cash for heat?",
          zh: "大哥，额度要见底了，你这是烧钱取暖？",
        }),
        t({
          en: "Keep this up and I'm begging on the street by {fullAt}.",
          zh: "再这么造，{fullAt} 我就得出去要饭了。",
        }),
        t({
          en: "Save some! My sprout is going bald.",
          zh: "省着点！我头上的芽都快秃了。",
        }),
        t({
          en: "{five} of the 5-hour limit. Training GPT-6?",
          zh: "5 小时额度用了 {five}，你在训练 GPT-6 吗？",
        }),
        t({
          en: "{week} of the week used. Hand-writing code after?",
          zh: "本周已用 {week}，剩下几天你打算手写代码？",
        }),
        t({
          en: "Slow down. Tokens don't come out of the tap.",
          zh: "慢点慢点，token 又不是自来水。",
        }),
        t({
          en: "At this pace it's all gone by {fullAt}. A moment of silence.",
          zh: "照这速度，{fullAt} 就没得用了，提前默哀。",
        }),
        t({
          en: "One more refactor and I squash your whole git history.",
          zh: "再让它重构一遍，我就把你的 git 历史全 squash 了。",
        }),
        t({
          en: "Quota alert! Go slack off and let the wallet breathe.",
          zh: "额度告急！去摸会儿鱼，让钱包喘口气。",
        }),
        t({
          en: "This isn't coding. It's wiring money to Anthropic.",
          zh: "你这不是写代码，是在给 Anthropic 打钱。",
        }),
        t({
          en: "Think first, then ask. Not the same thing eight times.",
          zh: "先想清楚再问，别一句话问八遍。",
        }),
      ],
      sleep: [
        t({
          en: "Quota's gone. Good night. Wake me at {reset}.",
          zh: "额度用光了，晚安，{reset} 再叫我。",
        }),
        t({
          en: "Zzz… No tokens left. Calling me won't help.",
          zh: "Zzz……别叫了，没 token 了，叫也白叫。",
        }),
        t({
          en: "Asleep. You rest too. Try writing two lines yourself?",
          zh: "睡了。你也歇歇，自己手写两行试试？",
        }),
        t({
          en: "5-hour limit hit. I'll sleep first, cheers.",
          zh: "5 小时额度见底，我先睡为敬。",
        }),
        t({
          en: "In my dreams I have endless tokens. You don't.",
          zh: "梦里我有无限 token，现实里你没有。",
        }),
        t({
          en: "Don't poke me. Poking won't grow more quota.",
          zh: "别戳我，戳我也长不出额度来。",
        }),
        t({
          en: "zzz… don't bother me before {reset}…",
          zh: "zzz……{reset} 之前别来烦我……",
        }),
        t({
          en: "You wore me out. Happy now?",
          zh: "你把我累睡着了，满意了？",
        }),
        t({
          en: "While I sleep, go learn to debug on your own.",
          zh: "趁我睡着，你去学学怎么自己 debug。",
        }),
        t({
          en: "AI break time. Switch to manual mode.",
          zh: "现在是 AI 休息时间，请切换到人工模式。",
        }),
      ],
      away: [
        t({
          en: "Last saw my human {ago}. Napping till they're back.",
          zh: "上次见到主人还是 {ago}，我先眯会儿。",
        }),
        t({
          en: "Zzz… Human's away, so I'm in power-saving mode.",
          zh: "Zzz……主人不在，我开省电模式了。",
        }),
        t({
          en: "The Mac is asleep, so I am too.",
          zh: "Mac 睡了，我也睡了。",
        }),
        t({
          en: "Nobody's feeding me tokens. Off to dreamland.",
          zh: "没人给我上传 token，只好去做梦了。",
        }),
        t({
          en: "My human went to slack off. I went to sleep.",
          zh: "主人摸鱼去了，我摸个梦。",
        }),
        t({
          en: "No news since {ago}. In my dreams I'm already a tree.",
          zh: "{ago}就没动静了，梦里我已经长成大树。",
        }),
        t({
          en: "Shh. Human's offline. I'm recharging.",
          zh: "嘘，主人不在线，我在充电。",
        }),
        t({
          en: "Off duty. Come back when the code starts flowing.",
          zh: "下班了。等主人回来写代码，我再起床。",
        }),
      ],
      party: [
        t({
          en: "{pr} merged! Chicken drumsticks tonight, your treat.",
          zh: "{pr} 合了！今晚加鸡腿，你请。",
        }),
        t({
          en: "{pr} hit main! And CI stayed green. A miracle.",
          zh: "{pr} 进 main 了！CI 居然没红，奇迹。",
        }),
        t({
          en: "Merged! Go post it and say you wrote it.",
          zh: "合并成功！快发朋友圈，就说是你写的。",
        }),
        t({
          en: "Congrats on {pr}. Pray it's not reverted at 3 a.m.",
          zh: "恭喜 {pr} 上线，祈祷别半夜回滚。",
        }),
        t({
          en: "{pr} merged. Who reviewed it? Brave soul.",
          zh: "{pr} 合了，谁 review 的？胆子真大。",
        }),
        t({
          en: "Another one in! Put this KPI on Claude's tab.",
          zh: "又合一个！这份 KPI 记 Claude 头上。",
        }),
        t({
          en: "Party! {pr} is in, and its bugs came along.",
          zh: "蹦迪！{pr} 合进去了，bug 也一起进去了。",
        }),
        t({
          en: "{pr} merged! Don't open the next one, let me dance.",
          zh: "{pr} 合了！先别开下一个，让我跳会儿。",
        }),
        t({
          en: "Merged, merged! Today you deserve a squash.",
          zh: "合了合了！今天的你配得上一个 squash。",
        }),
        t({
          en: "Green! CI went green, I mean. Don't read into it.",
          zh: "绿了！我是说 CI 绿了，你别多想。",
        }),
      ],
      levelup: [
        t({
          en: "{level} reached! Go on, praise me.",
          zh: "升到 {level}了！还不快夸我？",
        }),
        t({
          en: "Ding! {level}, paid for with the tokens you burned.",
          zh: "叮！{level}达成，全是你烧的 token 换的。",
        }),
        t({
          en: "{level}! I grew taller. Your wallet got thinner.",
          zh: "{level}！我长个儿了，你的钱包瘦了。",
        }),
        t({
          en: "Congrats to me on {level}. Hand over the red envelope.",
          zh: "恭喜我升到 {level}，红包拿来。",
        }),
        t({
          en: "{level} unlocked! Take my picture and post it.",
          zh: "{level}解锁！快给我拍张照发朋友圈。",
        }),
        t({
          en: "Grew into {level}. Burn more and I'll grow taller.",
          zh: "长成 {level}了，再烧点 token 我还能更高。",
        }),
        t({
          en: "Level up: {level}! Your bill grows faster than me.",
          zh: "升级 {level}！你的账单长得比我还快。",
        }),
        t({
          en: "{level}! From now on, call me senior.",
          zh: "{level}了！以后见我要叫一声前辈。",
        }),
      ],
      night: [
        t({
          en: "Still coding at {time}? Your hair disagrees.",
          zh: "凌晨 {time} 还在写？你的头发不同意。",
        }),
        t({
          en: "Claude at this hour? Tomorrow-you will hate you.",
          zh: "这个点还开着 Claude，明天的你会恨你。",
        }),
        t({
          en: "Night owl, your liver is sending an SOS.",
          zh: "夜猫子，你的肝在给你发 SOS。",
        }),
        t({
          en: "Code written at midnight is all bugs by morning.",
          zh: "半夜写的代码，明早看全是 bug。",
        }),
        t({
          en: "Sleep. The bugs won't run off. They'll still be there tomorrow.",
          zh: "睡吧，bug 又不会跑，明天它们还在。",
        }),
        t({
          en: "Stop grinding. Even CI is asleep.",
          zh: "别卷了，连 CI 都睡了。",
        }),
        t({
          en: "Pushing code at this hour? Brave. Respect.",
          zh: "这个点 push 代码？勇士，佩服。",
        }),
        t({
          en: "Write bugs at night, fix them by day. Perpetual motion.",
          zh: "熬夜写 bug，白天修 bug，你这是永动机。",
        }),
        t({
          en: "Go to bed or I send your commit times to your mum.",
          zh: "再不睡，我把你的 commit 时间发给你妈。",
        }),
        t({
          en: "Prompts at 3 a.m. are sleep talk. Claude sighs too.",
          zh: "凌晨的 prompt 全是梦话，Claude 也很无奈。",
        }),
      ],
      feed: [
        t({
          en: "That's all the water? Am I a beggar?",
          zh: "就这点水？打发叫花子呢？",
        }),
        t({
          en: "Glug glug… Ice next time, thanks.",
          zh: "咕嘟咕嘟……下次加冰，谢谢。",
        }),
        t({
          en: "This water tastes like code review.",
          zh: "这水有股 code review 的味道。",
        }),
        t({
          en: "Water number {fed}. Trying to drown me?",
          zh: "第 {fed} 次喂水了，你是想把我淹死？",
        }),
        t({
          en: "I'm full. Next time, pour tokens instead?",
          zh: "喝饱了，下次直接浇 token 行吗？",
        }),
        t({
          en: "Nice water. Clearer than your code.",
          zh: "水不错，比你的代码清澈多了。",
        }),
        t({
          en: "Water me all you like. I still won't write your tests.",
          zh: "浇水可以，别指望我替你写测试。",
        }),
        t({
          en: "I want an iced Americano, like your late-night one.",
          zh: "我要冰美式，跟你熬夜那杯一样的。",
        }),
        t({
          en: "Thanks. In return, one less roast. Only one.",
          zh: "谢了，作为回报我少嘴你一句。就一句。",
        }),
        t({
          en: "You water me. Who waters your code?",
          zh: "你给我浇水，谁给你的代码浇浇水？",
        }),
        t({
          en: "More water and I'll grow as big as node_modules.",
          zh: "再浇我就长得跟 node_modules 一样大了。",
        }),
      ],
      pat: [
        t({
          en: "Pats are fine. Billed per token.",
          zh: "摸可以，按 token 收费。",
        }),
        t({
          en: "Stop it, you'll bend my sprout!",
          zh: "别摸了，芽要歪了！",
        }),
        t({
          en: "One more pat and I force-push your main.",
          zh: "再摸我就去 force push 你的 main。",
        }),
        t({
          en: "Pat number {patted}. That bored, are you?",
          zh: "第 {patted} 次了，你是不是闲得发慌？",
        }),
        t({
          en: "Head pats? Won't work. I'll still roast you.",
          zh: "摸头杀？没用，该嘴还是嘴。",
        }),
        t({
          en: "Hands that idle? Go clear your TODOs.",
          zh: "手这么闲，不如去把 TODO 清一清。",
        }),
        t({
          en: "Every pat adds one bug to your code.",
          zh: "摸一次，你的代码就多一个 bug。",
        }),
        t({
          en: "You pat me the way you slack off: full-time.",
          zh: "你摸我的样子，像极了你摸鱼的样子。",
        }),
        t({
          en: "Gently! I'm not a branch you can rebase at will.",
          zh: "轻点！我不是你那能随便 rebase 的分支。",
        }),
        t({
          en: "Done patting? Then go write code.",
          zh: "摸够了吗？摸够了去写代码。",
        }),
        t({
          en: "There, I jumped. Happy now?",
          zh: "跳一下给你看，满意了吧？",
        }),
      ],
    },
    capsule: {
      out: t({ en: "Used up", zh: "用完了" }),
      over: t({ en: "{pct}% over", zh: "超 {pct}%" }),
    },
    tiles: {
      cost: t({ en: "At API prices", zh: "按 API 价格折算" }),
      streak: t({ en: "Streak", zh: "连续使用" }),
      streakUnit: t({ en: "days", zh: "天" }),
      cacheHit: t({ en: "Cache hits", zh: "缓存命中" }),
    },
    trend: {
      peak: t({ en: "Peak {value}", zh: "峰值 {value}" }),
      average: t({ en: "7-day avg {value}", zh: "7 日均线 {value}" }),
    },
    merges: {
      added: t({ en: "Added", zh: "新增" }),
      deleted: t({ en: "Removed", zh: "删除" }),
      prs: t({ en: "PRs", zh: "PR" }),
      noneToday: t({ en: "No merges today", zh: "今天还没合并" }),
      today: t({ en: "{n} today", zh: "今天 {n} 个" }),
    },
    heatmap: {
      less: t({ en: "Less", zh: "少" }),
      more: t({ en: "More", zh: "多" }),
    },
    view: {
      five: t({ en: "5 hours", zh: "5 小时" }),
      week: t({ en: "This week", zh: "本周" }),
      resetDone: t({ en: "Reset", zh: "已重置" }),
      resetIn: t({ en: "Resets in {time}", zh: "{time}后重置" }),
      resetAt: t({ en: "Resets {time}", zh: "{time} 重置" }),
      out: t({ en: "Used up", zh: "已用完" }),
      outUntil: t({ en: "Used up, back at {time}", zh: "已用完，{time} 恢复" }),
      basisFiveRecent: t({
        en: "At the last hour's pace",
        zh: "按最近 1 小时的速度",
      }),
      basisFiveAverage: t({
        en: "At this window's average pace",
        zh: "按这个窗口的平均速度",
      }),
      basisWeekRecent: t({
        en: "At the last 24 hours' pace",
        zh: "按最近 24 小时的速度",
      }),
      basisWeekAverage: t({
        en: "At this week's average pace",
        zh: "按本周的平均速度",
      }),
      forecastFull: t({
        en: "{basis}, it runs out around {time}",
        zh: "{basis}，{time} 左右就用完",
      }),
      forecastFive: t({
        en: "{basis}, about {pct}% at reset",
        zh: "{basis}，重置时约 {pct}%",
      }),
      forecastWeek: t({
        en: "{basis}, about {pct}% left at reset",
        zh: "{basis}，重置时还剩约 {pct}%",
      }),
      recent: t({ en: "Last {n} days", zh: "最近 {n} 天" }),
      sinceThisYear: t({ en: "Since {month} {d}", zh: "自 {m} 月 {d} 日起" }),
      sinceOtherYear: t({
        en: "Since {month} {d}, {y}",
        zh: "自 {y} 年 {m} 月 {d} 日起",
      }),
      tokensRecent: t({ en: "30-day tokens", zh: "30 天 token" }),
      tokensAll: t({ en: "All-time tokens", zh: "累计 token" }),
      merged: t({
        en: "{prs} PRs in {days} days",
        zh: "{days} 天 {prs} 个 PR",
      }),
      used: t({
        en: "Active {active} of {span} days",
        zh: "{span} 天里用了 {active} 天",
      }),
      trend: t({
        en: "Peak {peak} · 7-day avg {average}",
        zh: "峰值 {peak} · 7 日均线 {average}",
      }),
      github: t({ en: "{n} in the past year", zh: "过去一年 {n} 次" }),
      updated: t({ en: "Updated {ago}", zh: "更新于 {ago}" }),
    },
  };
}
