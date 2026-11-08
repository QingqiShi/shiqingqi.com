# 词汇表

- **待办（Todo）**：owner 要做的一件事，由 owner 或晨报 agent 添加。代码里是 `todos` 表的一行。
- **空档（Slot）**：待办在 owner 日历上占的一个事件，为做这件事留出时间。代码里是待办行的 `calendar_*` 列。
- **关闭（Close）**：标记待办完成。若它占着未开始的空档，同时删除该日历事件，二者一起成功或一起失败；删除待办同理。代码里见 `apps/assistant/src/assistant/report/close-todos.ts`。
