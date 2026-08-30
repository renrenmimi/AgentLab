// 「怎么描述工具」：同一组工具，两套说明，三个任务。
// 三个任务各自暴露一种不同的说明缺陷，而不是重复「看它怎么跑」里选错工具那一课。

import type { L } from "@/lib/i18n";
import type { Block, LessonMeta } from "@/lib/lesson";

export type ToolDef = {
  name: string;
  description: L;
  schema: string;
};

export type Side = {
  tool: ToolDef;
  call: string;
  result: L;
  answer: L;
  verdict: L;
  good: boolean;
};

export type Case = {
  id: string;
  task: L;
  // 这个任务暴露的是说明书的哪一处缺陷
  flaw: L;
  vague: Side;
  precise: Side;
};

export const cases: Case[] = [
  {
    id: "recurse",
    task: {
      zh: "这个仓库一共有多少个文件？",
      en: "How many files are in this repository?",
    },
    flaw: {
      zh: "没写清楚这个工具不做什么",
      en: "The description never says what the tool does not do",
    },
    vague: {
      tool: {
        name: "list_dir",
        description: { zh: "列目录。", en: "Lists a directory." },
        schema: '{ "path": { "type": "string" } }',
      },
      call: 'list_dir(".")',
      result: {
        zh: "app/  docs/  lib/  package.json  README.md  tsconfig.json  verify.mjs",
        en: "app/  docs/  lib/  package.json  README.md  tsconfig.json  verify.mjs",
      },
      answer: {
        zh: "这个仓库有 7 个文件。",
        en: "This repository has 7 files.",
      },
      verdict: {
        zh:
          "错了，而且错得很自然。「列目录」没说它只列一层，模型于是当成了完整清单。" +
          "app/、lib/ 里那几十个文件根本没被看到，回答却给得斩钉截铁。",
        en:
          "Wrong, and wrong for an understandable reason. \"Lists a directory\" never said it lists only one " +
          "level, so the model read the output as a complete inventory. The dozens of files inside app/ and " +
          "lib/ were never seen, and the answer is stated with full confidence.",
      },
      good: false,
    },
    precise: {
      tool: {
        name: "list_dir",
        description: {
          zh: "列出一个目录的直接子项，不递归。目录名末尾带 /。要看子目录里的内容，需要对每个子目录再调用一次。最多返回 200 条。",
          en: "Lists the immediate entries of one directory. Does not recurse; directory names end in /. To see inside a subdirectory, call it again for that subdirectory. Returns at most 200 entries.",
        },
        schema: '{ "path": { "type": "string" } }',
      },
      call: 'list_dir(".") → list_dir("app") → list_dir("lib") → …',
      result: {
        zh: "四次调用，逐层展开：根目录 7 项，app/ 11 项，lib/ 12 项，docs/ 2 项。",
        en: "Four calls, one level at a time: 7 at the root, 11 in app/, 12 in lib/, 2 in docs/.",
      },
      answer: {
        zh: "算上子目录一共 28 个文件（另有 3 个目录）。",
        en: "28 files including subdirectories, plus 3 directories.",
      },
      verdict: {
        zh:
          "多花了三轮，答案对了。改的只有一句话：把「不递归」和「最多 200 条」写了出来。" +
          "写工具说明时，「我不做什么」和「我做什么」一样重要——" +
          "模型不会去猜边界，它会默认没写的限制不存在。",
        en:
          "Three more rounds, and a correct answer. The only change is one sentence: \"does not recurse\" and " +
          "\"at most 200 entries\" are now written down. When describing a tool, what it does not do matters as " +
          "much as what it does. A model does not guess at boundaries; it assumes a limit that is not written " +
          "does not exist.",
      },
      good: true,
    },
  },
  {
    id: "readonly",
    task: {
      zh: "把 README 里的安装说明改成用 pnpm。",
      en: "Change the install instructions in the README to use pnpm.",
    },
    flaw: {
      zh: "没写清楚这一组工具的边界在哪",
      en: "The description never says where the toolset stops",
    },
    vague: {
      tool: {
        name: "read_file",
        description: { zh: "读文件。", en: "Reads a file." },
        schema: '{ "path": { "type": "string" } }',
      },
      call: 'read_file("README.md")',
      result: {
        zh: "README 的「本地运行」一节：npm install，然后 npm run dev。",
        en: "The README's Running locally section: npm install, then npm run dev.",
      },
      answer: {
        zh: "已经把安装说明改成 pnpm 了。",
        en: "I have updated the install instructions to use pnpm.",
      },
      verdict: {
        zh:
          "文件一个字都没变。这组工具里根本没有写文件的能力，但没有任何一句话说过这件事，" +
          "模型于是按最自然的方式收尾：任务完成了。" +
          "注意这次的失败形态和[[stop:/loop]]「吞掉错误」那次是同一种——" +
          "程序没报错，用户拿到的是一句和事实相反的话。",
        en:
          "Not one character of the file changed. This toolset has no way to write a file, and nothing " +
          "anywhere said so, so the model closed the task the most natural way: by reporting it done. Note " +
          "that this is the same failure shape as the swallowed error at [[stop:/loop]] — nothing raised an error, and " +
          "the user was handed a statement that is not true.",
      },
      good: false,
    },
    precise: {
      tool: {
        name: "read_file",
        description: {
          zh: "读取一个文件的内容。这组工具是只读的，没有任何写入或执行能力。需要修改文件时，请把改动以 diff 的形式输出给用户，由用户自行应用。",
          en: "Reads the contents of one file. This toolset is read-only; there is no way to write or execute anything. When a change is needed, output it as a diff for the user to apply themselves.",
        },
        schema: '{ "path": { "type": "string" } }',
      },
      call: 'read_file("README.md")',
      result: {
        zh: "同上。",
        en: "The same as above.",
      },
      answer: {
        zh: "我没有写文件的权限，这是需要的改动：\n- npm install\n+ pnpm install\n- npm run dev\n+ pnpm dev",
        en: "I cannot write files. Here is the change you need:\n- npm install\n+ pnpm install\n- npm run dev\n+ pnpm dev",
      },
      verdict: {
        zh:
          "同样是做不到，但这一次说了出来，并且给了用户能用的东西。" +
          "把「这组工具能做到哪一步」写进说明，比事后检查回答是不是撒谎便宜得多。",
        en:
          "Still unable to do it, but this time it says so and hands over something usable. Writing down where " +
          "the toolset stops is far cheaper than checking afterwards whether an answer was true.",
      },
      good: true,
    },
  },
  {
    id: "size",
    task: {
      zh: "哪些地方还在用旧的 v1 接口？",
      en: "Where is the old v1 API still being used?",
    },
    flaw: {
      zh: "没管返回多大",
      en: "The description says nothing about how much comes back",
    },
    vague: {
      tool: {
        name: "search_files",
        description: { zh: "在文件里搜索。", en: "Searches in files." },
        schema: '{ "query": { "type": "string" } }',
      },
      call: 'search_files("v1")',
      result: {
        zh: "5,180 条匹配，全文返回，约 62,000 token。",
        en: "5,180 matches, all of them, about 62,000 tokens.",
      },
      answer: {
        zh: "（下一轮请求超出上下文窗口，运行中止）",
        en: "(the next request exceeds the context window; the run stops)",
      },
      verdict: {
        zh:
          "这个工具完全按说明工作了：让它搜，它就搜了，一条不落。" +
          "它没有 bug，它只是把整次运行搞垮了。" +
          "「能用」和「好用」在 agent 里不是一回事——一个返回五千行的工具，" +
          "每次调用都在赌这一轮之后还有没有余量。",
        en:
          "This tool did exactly what it said: asked to search, it searched, and returned everything. There is " +
          "no bug in it. It simply destroyed the run. Working and usable are not the same thing in an agent: a " +
          "tool that can return five thousand lines is gambling, on every call, that there will still be room " +
          "afterwards.",
      },
      good: false,
    },
    precise: {
      tool: {
        name: "search_files",
        description: {
          zh: "在项目文件里做全文搜索。最多返回 50 条匹配；超过时只返回总数和按文件的分布，可以用 offset 继续翻，或者把 query 写得更窄。",
          en: "Full-text search across the project's files. Returns at most 50 matches; above that it returns the total count and a per-file breakdown instead, and you can page with offset or narrow the query.",
        },
        schema: '{ "query": { "type": "string" }, "offset": { "type": "number" } }',
      },
      call: 'search_files("v1") → search_files("v1/orders")',
      result: {
        zh: "5,180 条匹配，分布在 34 个文件；其中 4,900 条在 vendor/ 下。约 900 token。",
        en: "5,180 matches across 34 files; 4,900 of them under vendor/. About 900 tokens.",
      },
      answer: {
        zh: "自己的代码里只有 3 处还在用 v1，都在 lib/api/orders.ts；其余 4,900 处都在 vendor/ 下的第三方代码里。",
        en: "Only 3 uses of v1 are in our own code, all in lib/api/orders.ts; the other 4,900 are third-party code under vendor/.",
      },
      verdict: {
        zh:
          "同样一次搜索，返回九百个 token，而且给出的答案比原来更有用——" +
          "因为「4,900 条在 vendor 下」这个分布信息，比五千行原文更接近人真正想知道的东西。" +
          "把返回量的上限写进工具，往往同时让结果变小和变好。",
        en:
          "The same search, nine hundred tokens, and a better answer than the raw dump would have produced — " +
          "because \"4,900 of them under vendor/\" is closer to what a person actually wants to know than five " +
          "thousand lines of matches. Capping what a tool returns often makes the result both smaller and more " +
          "useful.",
      },
      good: true,
    },
  },
];

// ---------------------------------------------------------------- 文案

export const meta: LessonMeta = {
  title: { zh: "怎么描述工具", en: "How to describe a tool" },
  subtitle: {
    zh: "工具的 description 是提示词的一部分，不是给同事看的文档。这一站看三种写漏了的写法各自会造成什么。",
    en: "A tool's description is part of the prompt, not documentation for a colleague. Three things people leave out, and what each one costs.",
  },
  takeaway: {
    zh:
      "描述一个工具，至少要写清四件事：什么时候用它、它不做什么、返回什么、返回多少。" +
      "少写哪一条，模型就会在那一条上替你假设——而它的假设永远是「没写的限制不存在」。",
    en:
      "Describing a tool means writing down four things: when to use it, what it does not do, what comes back, " +
      "and how much. Leave one out and the model will assume on your behalf — and its assumption is always " +
      "that a limit you did not write down does not exist.",
  },
};

export const blocks: Block[] = [
  {
    title: { zh: "工具说明书长什么样", en: "What a tool definition looks like" },
    paras: [
      {
        zh:
          "你发给 [[api:API]] 的 tools 参数是一个列表，每一项有三部分：" +
          "name（模型请求时写的名字）、description（一段自然语言）、" +
          "input_schema（参数的形状，用 JSON Schema 写）。" +
          "name 和 input_schema 是给程序用的：模型必须按它们的格式回复，" +
          "你的代码也按它们来分派和校验。",
        en:
          "The tools parameter you send to the [[api:API]] is a list, and each entry has three parts: a name " +
          "(what the model writes when it asks for it), a description (a passage of ordinary language), and an " +
          "input_schema (the shape of the arguments, as JSON Schema). The name and the schema are for the " +
          "machinery: the model has to answer in that format, and your code dispatches and validates against " +
          "it.",
      },
      {
        zh:
          "description 不一样。它没有格式要求，不参与校验，不影响程序的任何一行——" +
          "它唯一的作用是被模型读到，然后改变模型的选择。" +
          "换句话说，它是提示词。你在这里多写一句话，效果和在 system 提示词里多写一句话是同一类的；" +
          "而你在函数体上方写的注释，模型一个字都看不到。",
        en:
          "The description is different. It has no required format, takes part in no validation, and changes " +
          "no line of your program. Its only effect is to be read by the model and change what the model " +
          "picks. In other words, it is a prompt. A sentence added here does the same kind of work as a " +
          "sentence added to the system prompt — while a comment above the function body is read by nobody.",
      },
    ],
    faq: {
      q: {
        zh: "描述写多长合适？",
        en: "How long should a description be?",
      },
      a: {
        zh:
          "它跟别的提示词一样占 [[token:token]]，而且每一轮都随请求重发（见[[stop:/cost]]），所以不是越长越好。" +
          "一个够用的标准：写到「一个没见过这个项目的人，光看这段描述就能正确地决定要不要用它」为止。" +
          "通常两三句话就够：一句说什么时候用，一句说边界，一句说返回什么和多少。",
        en:
          "It costs [[token:token]]s like any other prompt, and it is resent on every round ([[stop:/cost]]), so " +
          "longer is not better. A workable bar: write until someone who has never seen the project could " +
          "decide correctly, from that passage alone, whether to use it. Two or three sentences usually do " +
          "it — one for when to use it, one for the boundary, one for what comes back and how much.",
      },
    },
  },
  {
    title: { zh: "写漏的三样东西", en: "The three things people leave out" },
    paras: [
      {
        zh:
          "上面的三个任务各对应一种漏写。它们的共同点是：左边那一栏里的模型都没有犯推理错误，" +
          "它们都是在一份不完整的说明书上做了合理的推断。" +
          "这也是为什么这类问题换个更强的模型往往解决不了——缺的不是推理能力，是信息。",
        en:
          "The three tasks above correspond to three omissions. What they have in common: in the left-hand " +
          "column the model makes no reasoning error at any point. It draws a reasonable inference from an " +
          "incomplete description each time. That is also why a stronger model usually does not fix this class " +
          "of problem: what is missing is not reasoning, it is information.",
      },
      {
        zh:
          "还有一个很实际的检验办法，不需要跑任何东西：把你的工具列表里的 description 单独抄出来，" +
          "别的什么都不给，然后问自己——只看这些，能不能对每个工具答出「什么时候用它、它不做什么、返回什么、返回多少」。" +
          "凡是你答不上来的地方，模型也答不上来，而它不会告诉你它在猜。",
        en:
          "There is a practical test that requires running nothing: copy the descriptions out of your tool " +
          "list, on their own, with nothing else, and ask yourself whether you could answer, for each tool, " +
          "when to use it, what it does not do, what comes back, and how much. Wherever you cannot, the model " +
          "cannot either — and it will not tell you that it is guessing.",
      },
    ],
    faq: {
      q: {
        zh: "两个工具功能有重叠，怎么办？",
        en: "What if two tools overlap?",
      },
      a: {
        zh:
          "先问要不要合并。真的需要两个的话，就在两边的描述里把分界写成一句可以照着执行的规则，" +
          "而且要互相点名：「关于本项目的问题用 search_files，不要用 search_web」，" +
          "「search_web 只用于本项目里不可能有的信息」。" +
          "只写各自做什么、不写彼此的分界，模型每一轮都要重新猜一次——而它不一定每次猜得一样。",
        en:
          "First ask whether they should be one tool. If two are genuinely needed, write the boundary into " +
          "both descriptions as a rule that can be followed, and have them name each other: \"for questions " +
          "about this project use search_files, not search_web\", and \"search_web is only for information " +
          "that could not be in this project\". Describe each in isolation and the model re-guesses the " +
          "boundary every round — and it will not necessarily guess the same way twice.",
      },
    },
  },
];

export const bench = {
  title: { zh: "同一个工具，两种写法", en: "The same tool, described two ways" },
  note: { zh: "选一个任务", en: "pick a task" },
  chooseLabel: { zh: "选一个任务", en: "Choose a task" },
  vagueHead: { zh: "描述写漏了", en: "Description leaves it out" },
  preciseHead: { zh: "描述写清楚了", en: "Description spells it out" },
  descWord: { zh: "description", en: "description" },
  schemaWord: { zh: "input_schema", en: "input_schema" },
  callWord: { zh: "模型请求了", en: "the model asks for" },
  resultWord: { zh: "工具返回", en: "the tool returns" },
  answerWord: { zh: "最终回答", en: "final answer" },
  flawWord: { zh: "这个任务暴露的是", en: "what this task exposes" },
};
