import { evalite } from "evalite";
import { generateResponse } from "./helpers.ts";
import { matchesPattern, minLength } from "./scorers.ts";

evalite("Locale: Chinese response", {
  data: () => [
    {
      input: "推荐一部科幻电影",
    },
    {
      input: "有什么好看的喜剧片吗？",
    },
  ],
  task: async (input) => {
    return generateResponse(input, "zh");
  },
  scorers: [minLength(30), matchesPattern(/[\u4e00-\u9fff]{10,}/)],
});

evalite("Locale: English response", {
  data: () => [
    {
      input: "Recommend a sci-fi movie",
    },
    {
      input: "What's a good comedy film?",
    },
  ],
  task: async (input) => {
    return generateResponse(input, "en");
  },
  scorers: [minLength(50), matchesPattern(/[a-zA-Z]+(?: [a-zA-Z]+){5,}/)],
});
