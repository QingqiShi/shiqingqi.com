# Implementation Plan: Conversational AI Movie & TV Search with Streaming

**Status:** in_progress
**Created:** 2025-10-14
**Spec Reference:** `ai-artifacts/specs/011-conversational-ai-search.md`
**Planning Scope:** Full implementation of conversational AI search with streaming responses

## Executive Summary

This plan implements a conversational AI search feature that allows users to have multi-turn dialogues with an AI assistant about movies and TV shows. The key architectural decisions are:

1. **Streaming Architecture**: Use OpenAI's Responses API with streaming enabled, proxied through a Next.js API route that forwards Server-Sent Events (SSE) to the client
2. **Two-Phase Approach**: Extend the existing agent's two-phase pattern (Phase 1: tool calling, Phase 2: structured output) to work with streaming
3. **Client-Side State**: Maintain conversation history in React state (no server-side persistence)
4. **Progressive Rendering**: Display thinking summaries, stream text tokens with 200ms buffering, and show results as soon as TMDB data is available

The implementation is broken into 6 phases, each independently testable and deployable.

## Architecture Research

### Existing Patterns

- **AI Agent Pattern** (src/ai/agent.ts:127-284): Two-phase agent - Phase 1 executes tools in parallel, Phase 2 generates structured output. Currently synchronous, needs streaming support.
- **API Route Wrapper** (src/utils/api-route-wrapper.ts): Standard wrapper for TMDB API routes with referer validation and error handling
- **Translation System** (src/hooks/use-translations.ts:10-36): Client components use `useTranslations()` hook which reads from `TranslationContext`
- **TanStack Query Pattern** (src/hooks/use-ai-search.ts:45-52): Client hooks use `useMutation` for POST requests to API routes
- **Component Styling** (src/components/movie-database/search-button.tsx): StyleX with design tokens, responsive breakpoints, mobile-first approach

### Key Files and Components

- `src/ai/agent.ts`: Current agent implementation with tool calling loop and structured output
- `src/ai/client.ts`: OpenAI client singleton with API key management
- `src/ai/tools.ts`: Available tools for TMDB data fetching
- `src/app/api/ai-search/route.ts`: Current API route for non-streaming AI search
- `src/app/[locale]/movie-database/ai-search/page.tsx`: Current single-query results page
- `src/components/movie-database/grid.tsx`: Responsive grid layout for media cards
- `src/components/movie-database/media-card.tsx`: Individual movie/TV card component
- `src/tokens.stylex.ts`: Design system tokens (color, space, font, etc.)

### Data Flow Analysis

**Current Flow (Single Query)**:

1. User submits query via SearchButton overlay
2. Navigation to `/[locale]/movie-database/ai-search?q=...`
3. Server component calls `performAISearch()` which invokes `agent()`
4. Agent executes two phases synchronously, returns structured results
5. Results rendered in Grid with media cards

**New Flow (Conversational Streaming)**:

1. User submits message in chat interface
2. Client sends POST to `/api/ai-search/stream` with full conversation history
3. Server starts OpenAI streaming, proxies SSE events to client
4. Client receives: thinking summary → tool calls → text deltas → results
5. Client buffers text (200ms), displays results progressively
6. User sends follow-up, repeating with updated conversation history

### Integration Points

- **OpenAI Responses API**: Streaming responses with `stream: true`, handles reasoning summaries and tool execution
- **TMDB API**: Existing tool functions (`discoverMovies`, `searchMovies`, etc.) called during Phase 1
- **Translation System**: New translations for chat UI (input placeholder, thinking indicator, error messages)
- **Next.js Streaming**: API route returns `ReadableStream` with SSE formatting
- **React State Management**: Conversation history, streaming state, message updates managed in client component

## Implementation Phases

### Phase 1: Server-Side Streaming Agent

**Goal:** Extend the existing agent to support streaming responses with conversation context
**Deliverable:** New `streamingAgent()` function that yields events during AI processing

#### Event Type Definitions

```typescript
// Define explicit event types for streaming
type StreamingEvent =
  | { type: "thinking"; summary: string }
  | { type: "tool_call"; name: string; status: "started" | "completed" }
  | { type: "text_delta"; delta: string }
  | { type: "results"; items: MediaListItem[] }
  | { type: "done" }
  | { type: "error"; message: string; code?: string };

// Conversation history format
type ClientMessage = {
  role: "user" | "assistant";
  content: string;
  results?: MediaListItem[];
};
type ResponseInput = {
  role: "user" | "developer" | "assistant";
  content: string;
};

// Conversion: Strip results from assistant messages, keep only text content
function convertToResponseInput(messages: ClientMessage[]): ResponseInput[] {
  return messages.map((msg) => ({
    role: msg.role === "assistant" ? "assistant" : "user",
    content: msg.content,
  }));
}
```

#### OpenAI Streaming Event Handling

The Responses API supports streaming with function calling. Key event types from OpenAI:

- `response.reasoning_summary_text.delta` - Reasoning summary chunks
- `response.function_call_arguments.delta` - Tool call argument chunks
- `response.output_item.added` - New tool call or text item
- `response.text.delta` - Text response chunks

#### Tasks

- [x] Create `src/ai/streaming-agent.ts` with `streamingAgent()` async generator function
- [x] Define `StreamingEvent` type union with all possible events
- [x] Accept `messages: ClientMessage[]` parameter for conversation history
- [x] Convert conversation history to ResponseInput format (strip results, keep text only)
- [x] Implement streaming event emission: `thinking`, `tool_call`, `text_delta`, `results`, `done`, `error`
- [x] Enable OpenAI streaming with `responses.create({ stream: true })`
- [x] Maintain two-phase pattern: Phase 1 (tool calling), Phase 2 (structured output)
- [x] During Phase 1:
  - [x] Emit `thinking` events from `response.reasoning_summary_text.delta`
  - [x] Accumulate tool call arguments from `response.function_call_arguments.delta`
  - [x] Emit `tool_call` events when tool starts and completes
- [x] Execute tool calls in parallel (preserve existing pattern from agent.ts:203-224)
- [x] During Phase 2:
  - [x] Stream text deltas by chunking text output (responses.parse doesn't support streaming)
  - [x] Emit `results` event with MediaListItem[] after structured output completes
- [x] Validate message count limit (20 messages max) before processing
- [x] Add error handling for OpenAI streaming failures (network, parsing, rate limits)

#### Acceptance Criteria

- [x] `streamingAgent()` accepts conversation history and locale
- [x] Function yields typed events: `{type: 'thinking', summary: string}`, `{type: 'text_delta', delta: string}`, etc.
- [x] Reasoning summaries are emitted before text streaming begins
- [x] Tool calls execute in parallel with results emitted after completion
- [x] Final results are emitted as MediaListItem[] array
- [x] Errors are caught and yielded as error events
- [x] 20-message limit is enforced with clear error

#### Validation Strategy

- **Unit Tests**: Mock OpenAI client, verify event emission sequence (thinking → tool_call → text_delta → results → done)
- **Unit Tests**: Test conversation history conversion to ResponseInput format
- **Unit Tests**: Test 20-message limit enforcement
- **Manual Verification**: Log events to console during development, verify correct ordering

---

### Phase 2: Streaming API Route

**Goal:** Create API endpoint that proxies OpenAI streaming events to client via SSE
**Deliverable:** `/api/ai-search/stream` route returning Server-Sent Events

#### SSE Event Format

```typescript
// SSE format: "data: {JSON}\n\n"
// Each event is a single line with "data: " prefix and double newline terminator

// Example events:
// data: {"type":"thinking","summary":"Analyzing your request..."}\n\n
// data: {"type":"text_delta","delta":"Here are some "}\n\n
// data: {"type":"results","items":[...]}\n\n
// data: {"type":"done"}\n\n
// data: {"type":"error","message":"Rate limit exceeded","code":"429"}\n\n

function formatSSE(event: StreamingEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}
```

#### Tasks

- [x] Create `src/app/api/ai-search/stream/route.ts` with POST handler
- [x] Accept request body: `{messages: ClientMessage[], locale: string}`
- [x] Validate referer using ALLOWED_REFERER constant (same as existing route)
- [x] Validate message format and count (max 20 messages)
- [x] Sanitize user message content (escape HTML entities, prevent XSS)
- [x] Validate individual message length (1000 character limit per message)
- [x] Call `streamingAgent()` with conversation history
- [x] Convert agent events to SSE format: `data: ${JSON.stringify(event)}\n\n`
- [x] Return `ReadableStream` with proper headers:
  - [x] `Content-Type: text/event-stream`
  - [x] `Cache-Control: no-cache`
  - [x] `Connection: keep-alive`
  - [x] `X-Accel-Buffering: no` (disable nginx buffering)
- [x] Handle client disconnection (detect aborted request, stop streaming, cleanup resources)
- [x] Handle OpenAI errors:
  - [x] Catch 429 (rate limit) and return as error event
  - [x] Catch connection errors and return as error event
  - [x] Catch JSON parsing errors in tool results
  - [x] Catch stream interruption errors
- [x] Add 90-second idle timeout using AbortController (kill stream if no events)
- [x] Implement CSRF protection (validate request origin matches allowed referers)

#### Acceptance Criteria

- [x] POST /api/ai-search/stream accepts conversation history
- [x] Response headers include proper SSE headers
- [x] Events are sent in SSE format with correct structure
- [x] Referer validation prevents unauthorized access
- [x] Message validation rejects >1000 char messages
- [x] 20-message limit is enforced with 400 error
- [x] Rate limit errors (429) are caught and returned as error events
- [x] Stream stops gracefully when client disconnects
- [x] 90-second idle timeout terminates stale streams

#### Validation Strategy

- **Unit Tests**: Test message validation logic (length, count, format)
- **Unit Tests**: Test SSE formatting (verify `data:` prefix, double newline)
- **Integration Tests**: Use MSW to mock OpenAI, verify full SSE stream
- **Manual Verification**: Use curl or fetch to test stream: `curl -N http://localhost:3000/api/ai-search/stream`
- **Manual Verification**: Test timeout by pausing stream mid-response
- **Manual Verification**: Test disconnection by killing client mid-stream

---

### Phase 3: Chat UI Components

**Goal:** Build reusable chat interface components with message display and input
**Deliverable:** `ChatMessage`, `ChatInput`, `ChatContainer` components

#### Tasks

- [x] Create `src/components/ai-search/chat-message.tsx` component
  - [x] Display user vs assistant messages with visual distinction (alignment, background color)
  - [x] Show thinking indicator: inline element with `color.textMuted` (e.g., "Thinking: analyzing your request...")
  - [x] Render message text with proper typography (font.size_2, line-height 1.5)
  - [x] Display result grid below message text (reuse Grid component)
  - [x] Show streaming indicator (animated dots) while message is incomplete
  - [x] Use semantic HTML: `<article>` for messages
  - [x] Add ARIA live region for screen reader announcements
- [x] Create `src/components/ai-search/chat-input.tsx` component
  - [x] Text input with auto-resize (grow vertically as user types)
  - [x] Send button (disabled when input empty or streaming)
  - [x] Character counter showing `{chars}/1000`
  - [x] Validate max 1000 characters
  - [x] Handle Enter key to submit (Shift+Enter for new line)
  - [x] Disable input while streaming
  - [x] Focus management: auto-focus after message sent
  - [x] Use semantic HTML: `<form>` with proper labels
  - [x] Minimum 44x44px touch targets for mobile
- [x] Create `src/components/ai-search/chat-container.tsx` component
  - [x] Full-height layout with scroll container
  - [x] Sticky input at bottom
  - [x] Auto-scroll to newest message (smooth scroll behavior)
  - [x] Clear conversation button in header
  - [x] Empty state with example queries
  - [x] Responsive padding for mobile safe areas
  - [x] Handle keyboard appearance on mobile (input stays visible)
- [x] Create `src/components/ai-search/chat-message.translations.json`
  - [x] `thinking` - "Thinking: {summary}..."
  - [x] `stillProcessing` - "Still processing..."
  - [x] `retryButton` - "Retry"
  - [x] `errorMessage` - "An error occurred"
  - [x] `noResults` - "No results found"
  - [x] `streamingIndicator` - "●●●" (animated dots)
- [x] Update `src/app/[locale]/movie-database/translations.json`
  - [x] `chatInputPlaceholder` - "Ask about movies or TV shows..." / "询问电影或电视剧..."
  - [x] `clearConversation` - "Clear conversation" / "清空对话"
  - [x] `clearConversationConfirm` - "Are you sure? This cannot be undone." / "确定要清空吗？此操作无法撤销。"
  - [x] `exampleQuery1` - "Recent superhero movies" / "最近的超级英雄电影"
  - [x] `exampleQuery2` - "Highly rated sci-fi TV shows" / "高分科幻电视剧"
  - [x] `exampleQuery3` - "Oscar-winning dramas from 2023" / "2023年奥斯卡获奖剧情片"
  - [x] `messagesRemaining` - "{count} messages remaining" / "还剩 {count} 条消息"
  - [x] `conversationLimitReached` - "Conversation limit reached. Please clear to continue." / "已达对话上限。请清空以继续。"
  - [x] `reconnecting` - "Reconnecting..." / "重新连接中..."
  - [x] `connectionLost` - "Connection lost" / "连接已断开"
  - [x] `retrying` - "Retrying ({attempt}/3)..." / "重试中 ({attempt}/3)..."

#### Acceptance Criteria

- [x] ChatMessage visually distinguishes user vs assistant messages
- [x] Thinking indicator displays inline before message text
- [x] ChatMessage supports streaming state (animated indicator)
- [x] Result cards render in grid layout within message
- [x] ChatInput enforces 1000 character limit with validation
- [x] ChatInput disables during streaming
- [x] Enter submits, Shift+Enter creates new line
- [x] ChatContainer auto-scrolls to newest message smoothly
- [x] Clear button resets conversation without page reload
- [x] Empty state shows example queries in both languages
- [x] All interactive elements meet 44x44px touch target size
- [x] Components use semantic HTML with proper ARIA attributes

#### Validation Strategy

- **Unit Tests**: Test ChatInput validation logic (character limit, empty input)
- **Unit Tests**: Test message formatting (thinking indicator, streaming state)
- **Component Tests**: Render ChatMessage with fixtures, verify visual distinction
- **Component Tests**: Test ChatInput keyboard interactions (Enter, Shift+Enter)
- **Manual Verification**: Test on mobile device, verify keyboard doesn't obscure input
- **Manual Verification**: Test with screen reader, verify announcements
- **Manual Verification**: Test responsive behavior at mobile/tablet/desktop breakpoints

---

### Phase 4: Client-Side Streaming Hook

**Goal:** Create React hook that manages SSE connection and conversation state
**Deliverable:** `useConversationalAISearch()` hook with streaming state management

#### 200ms Text Buffering Implementation

```typescript
// Buffering strategy: Accumulate deltas in a ref, flush to state every 200ms
const textBufferRef = useRef("");
const flushTimerRef = useRef<NodeJS.Timeout | null>(null);

function handleTextDelta(delta: string) {
  // Accumulate in buffer
  textBufferRef.current += delta;

  // Clear existing timer
  if (flushTimerRef.current) {
    clearTimeout(flushTimerRef.current);
  }

  // Schedule flush in 200ms
  flushTimerRef.current = setTimeout(() => {
    setMessages((prev) => {
      const updated = [...prev];
      const lastMessage = updated[updated.length - 1];
      if (lastMessage?.role === "assistant") {
        lastMessage.content += textBufferRef.current;
      }
      return updated;
    });
    textBufferRef.current = ""; // Clear buffer after flush
  }, 200);
}

function handleStreamEnd() {
  // Immediate flush of remaining buffer
  if (flushTimerRef.current) {
    clearTimeout(flushTimerRef.current);
  }
  if (textBufferRef.current) {
    setMessages((prev) => {
      const updated = [...prev];
      const lastMessage = updated[updated.length - 1];
      if (lastMessage?.role === "assistant") {
        lastMessage.content += textBufferRef.current;
      }
      return updated;
    });
    textBufferRef.current = "";
  }
}
```

#### Tasks

- [x] Create `src/hooks/use-conversational-ai-search.ts`
- [x] Define message type: `{id: string, role: 'user' | 'assistant', content: string, thinking?: string, results?: MediaListItem[], status: 'streaming' | 'complete' | 'error', error?: string}`
- [x] Implement state management: `messages`, `isStreaming`, `error`
- [x] Implement text buffering refs: `textBufferRef`, `flushTimerRef`
- [x] Create `sendMessage(content: string)` function
  - [x] Validate message length (1000 chars)
  - [x] Enforce 20-message limit (10 user + 10 assistant)
  - [x] Add user message to history immediately with unique ID
  - [x] Create placeholder assistant message with `status: 'streaming'`
  - [x] Open SSE connection to `/api/ai-search/stream` using fetch
  - [x] Set `isStreaming = true`
- [x] Handle SSE events:
  - [x] `thinking`: Update current message's `thinking` field (displayed inline)
  - [x] `text_delta`: Append to `textBufferRef`, schedule 200ms flush to message content
  - [x] `results`: Set current message's `results` field (displayed immediately)
  - [x] `done`: Flush remaining buffer, mark message status as `complete`, set `isStreaming = false`
  - [x] `error`: Set message status as `error`, store error message, set `isStreaming = false`
- [x] Implement 200ms text buffering logic (accumulate → flush on timer)
- [x] Implement immediate flush on stream end (don't wait for timer)
- [x] Implement stream interruption: abort fetch when new message sent
- [x] Create `clearConversation()` function to reset state and clear buffers
- [x] Create `retryLastMessage()` function to resend failed message
- [x] Handle network errors and timeouts gracefully (show error, offer retry)
- [x] Abort SSE connection on component unmount (cleanup timers and fetch)

#### Acceptance Criteria

- [x] Hook returns `messages`, `sendMessage`, `clearConversation`, `isStreaming`, `error`
- [x] `sendMessage()` validates message length and conversation limit
- [x] SSE connection opens and receives events correctly
- [x] Thinking summaries update message before text streaming begins
- [x] Text deltas are buffered (200ms) for smooth rendering
- [x] Results display as soon as received (even during text streaming)
- [x] Message status updates correctly (streaming → complete/error)
- [x] Sending new message interrupts current stream
- [x] `clearConversation()` resets to empty state without page reload
- [x] Network errors are caught and displayed with retry option
- [x] SSE connection closes on unmount (no memory leaks)

#### Validation Strategy

- **Unit Tests**: Test message validation (length, count)
- **Unit Tests**: Test state transitions (idle → streaming → complete)
- **Unit Tests**: Test text buffering logic with fake timers
- **Integration Tests**: Mock SSE endpoint, verify event handling
- **Manual Verification**: Send message, verify 200ms buffering creates smooth text appearance
- **Manual Verification**: Test stream interruption by sending new message mid-stream
- **Manual Verification**: Test retry functionality after network error
- **Manual Verification**: Monitor network tab for connection cleanup on unmount

---

### Phase 5: Conversational AI Search Page

**Goal:** Replace existing single-query page with conversational chat interface
**Deliverable:** Updated `/[locale]/movie-database/ai-search` page with full chat UI

#### Tasks

- [x] Update `src/app/[locale]/movie-database/ai-search/page.tsx`
  - [x] Remove query param handling (no more `?q=...`)
  - [x] Convert to client component (needs `"use client"`)
  - [x] Wrap with `TranslationContextProvider` to provide translations
  - [x] Remove SearchContent component (replaced by chat UI)
  - [x] Remove Suspense wrapper (client-side rendering)
- [x] Create `src/components/ai-search/conversational-search.tsx`
  - [x] Use `useConversationalAISearch()` hook
  - [x] Render ChatContainer with messages
  - [x] Map messages to ChatMessage components
  - [x] Render ChatInput with sendMessage handler
  - [x] Handle clear conversation action
  - [x] Show empty state on initial load
  - [x] Display thinking summaries inline
  - [x] Render result grids within assistant messages
  - [x] Handle loading states during streaming
  - [x] Handle error states with retry option
- [x] Update metadata in page.tsx
  - [x] Set `robots: noindex` to prevent indexing
  - [x] Update title to "AI Search" in both languages
- [x] Update SearchButton component (src/components/movie-database/search-button.tsx)
  - [x] **Decision: Keep overlay, pre-fill first message**
  - [x] Modify overlay to navigate to chat page with initial query
  - [x] On submit: Navigate to `/[locale]/movie-database/ai-search?initial={encodeURIComponent(query)}`
  - [x] Chat page reads `initial` param on mount, sends as first message if present
  - [x] Clear `initial` param from URL after sending (using `router.replace`)

#### Acceptance Criteria

- [x] Page loads with empty chat interface and example queries
- [x] User can send messages and see them appear immediately
- [x] AI responses stream in progressively with thinking summaries
- [x] Result cards display within assistant messages
- [x] Clear conversation button resets chat without page reload
- [x] Error messages display inline with retry option
- [x] Page title and meta tags updated correctly
- [x] SearchButton navigates to chat page with initial query param
- [x] Translations work in both English and Chinese
- [x] Mobile layout is fully responsive
- [x] Keyboard interactions work correctly (Enter to send, focus management)

#### Validation Strategy

- **Unit Tests**: Test ConversationalSearch component rendering with fixtures
- **E2E Tests**: Full user flow - open page, send message, receive response, send follow-up
- **E2E Tests**: Test clear conversation functionality
- **E2E Tests**: Test error handling and retry
- **E2E Tests**: Test 20-message limit warning
- **Manual Verification**: Test full conversation flow with real OpenAI API
- **Manual Verification**: Test on mobile device (iOS and Android)
- **Manual Verification**: Test with screen reader
- **Manual Verification**: Verify thinking summaries appear before text
- **Manual Verification**: Verify 200ms buffering creates smooth text appearance

---

### Phase 6: Polish and Edge Cases

**Goal:** Handle edge cases, improve UX polish, and add final refinements
**Deliverable:** Production-ready conversational AI search with all edge cases handled

#### Tasks

- [x] Implement "Still processing..." indicator for >5 second delays
- [ ] Handle vague follow-up queries gracefully (AI asks for clarification) - DEFERRED (AI model capability)
- [ ] Handle malformed streaming responses (JSON parsing errors) - PARTIALLY DONE (basic try-catch exists in hook)
- [x] Add confirmation dialog for clearing conversation (prevent accidental loss)
- [x] Implement scroll-to-top button for long conversations
- [ ] Add visual feedback for message send (button pulse animation) - SKIPPED (not critical for MVP)
- [x] Optimize auto-scroll: only scroll if user is near bottom (don't interrupt manual scrolling)
- [x] Add keyboard shortcut: Cmd/Ctrl+K to focus input
- [ ] Add accessibility improvements:
  - [ ] Announce streaming start/end to screen readers - DEFERRED (requires manual verification)
  - [ ] Add skip link to jump to input field - DEFERRED (low priority)
  - [ ] Ensure color contrast meets WCAG AA in both themes - DEFERRED (manual verification needed)
  - [ ] Test full keyboard navigation (no mouse) - DEFERRED (manual verification needed)
- [ ] Add error recovery:
  - [ ] Auto-retry on transient network errors (max 3 attempts) - DEFERRED (requires network simulation)
  - [ ] Preserve partial responses when stream fails - PARTIALLY DONE (messages preserve content)
  - [ ] Clear error state when retry succeeds - DEFERRED (depends on auto-retry)
- [x] Performance optimizations:
  - [ ] Virtualize message list for conversations >50 messages - NOT NEEDED (20 message limit)
  - [x] Debounce scroll events for auto-scroll logic (50ms debounce)
  - [x] Use React.memo for ChatMessage to prevent unnecessary re-renders
- [x] Update e2e tests at `e2e/ai-search.spec.ts`
  - [x] Test UI components (search button, overlay, navigation)
  - [x] Test empty state with example queries
  - [x] Test clear conversation button visibility
  - [x] Test Cmd/Ctrl+K keyboard shortcut
  - [x] Test character counter and 1000-char limit
  - [x] Test initial query from URL parameter
  - [x] Test both English and Chinese locales
  - [x] Test mobile responsive behavior
  - [ ] Test full conversation flow (query → follow-up → refine) - DEFERRED (requires API)
  - [ ] Test 20-message limit - DEFERRED (requires API)
  - [ ] Test error states - DEFERRED (requires API or mock)

#### Acceptance Criteria

- [x] "Still processing..." appears if no response after 5 seconds
- [ ] AI handles vague queries by asking for clarification - DEFERRED (model capability)
- [x] Malformed JSON responses are caught and handled gracefully (basic error handling)
- [x] Clear conversation requires confirmation (prevent accidents)
- [x] Auto-scroll doesn't interrupt user when manually scrolling up
- [x] Keyboard shortcuts work correctly (Cmd/Ctrl+K focuses input)
- [ ] All accessibility checks pass (WCAG AA contrast, keyboard navigation, screen reader) - DEFERRED
- [ ] Transient network errors auto-retry up to 3 times - DEFERRED
- [x] Partial responses are preserved when stream fails
- [x] All E2E tests pass with consistent results (11/11 tests passing)

#### Validation Strategy

- **Unit Tests**: Test error recovery logic (retry mechanism) - DEFERRED
- **Unit Tests**: Test scroll behavior logic (detect user scroll position) - DEFERRED
- **E2E Tests**: UI components and interactions - ✅ COMPLETED (11 tests passing)
- **E2E Tests**: Full conversation flow with multiple turns - DEFERRED (requires API)
- **E2E Tests**: Test 20-message limit enforcement - DEFERRED (requires API)
- **E2E Tests**: Test clear confirmation dialog - DEFERRED (requires API for messages to exist)
- **Manual Verification**: Test with real OpenAI API in production-like environment - REQUIRED
- **Manual Verification**: Test keyboard shortcuts (Cmd/Ctrl+K) - REQUIRED
- **Manual Verification**: Test on slow network (throttle in DevTools) - REQUIRED
- **Manual Verification**: Test screen reader announcements (VoiceOver/NVDA) - REQUIRED
- **Manual Verification**: Test color contrast in both light and dark themes - REQUIRED
- **Manual Verification**: Complete full conversation with complex queries in both languages - REQUIRED

#### Implementation Notes

**Completed Features:**

1. **"Still Processing..." Indicator** (src/hooks/use-conversational-ai-search.ts:56-60, 195-205)
   - Added 5-second timer that displays "Still processing..." in thinking indicator
   - Timer is cleared when first streaming event arrives
   - Timer is also cleared on errors and when clearing conversation

2. **Confirmation Dialog for Clear** (src/components/shared/confirm-dialog.tsx)
   - Created new ConfirmDialog component using portal pattern
   - Shows centered modal with backdrop
   - Prevents accidental conversation loss
   - Added translations for "clear" and "cancel" buttons

3. **Scroll-to-Top Button** (src/components/ai-search/chat-container.tsx:208-229)
   - Appears when scrolled >300px from top
   - Circular button with ArrowUp icon
   - Uses controlActive color theme
   - Positioned absolutely at bottom-right

4. **Optimized Auto-Scroll** (src/components/ai-search/chat-container.tsx:31-72)
   - Only auto-scrolls if user is within 100px of bottom
   - Detects manual scrolling with debounced scroll listener (50ms)
   - Maintains isNearBottom state
   - Prevents interrupting user when reading older messages

5. **Keyboard Shortcut Cmd/Ctrl+K** (src/components/ai-search/conversational-search.tsx:46-57)
   - Global keyboard listener for Cmd/Ctrl+K
   - Focuses input using forwardRef and useImperativeHandle
   - Updated ChatInput to expose focus() method via ref

6. **E2E Tests** (e2e/ai-search.spec.ts - 11 tests, all passing):
   - UI Components: Button visibility, overlay open/close, navigation
   - Chat Interface: Empty state, Cmd/Ctrl+K shortcut, character counter
   - Internationalization: English and Chinese locale support
   - Responsive Design: Mobile viewport (375x667) layout
   - Input Validation: 1000-character limit enforcement

**Quality Gates:**

- ✅ TypeScript: PASSED
- ✅ ESLint: PASSED
- ✅ Unit Tests: PASSED (102 tests)
- ✅ E2E Tests: PASSED (11 tests - UI components and interactions)

**Deferred Items:**

- Auto-retry on network errors (requires more complex error handling and testing)
- Full accessibility audit (requires manual testing with screen readers)
- Full conversation E2E tests (require real API or complex SSE mocking)
- Visual feedback for message send (not critical for MVP)

---

## Risk Assessment

### Potential Issues

- **~~OpenAI Streaming Complexity~~**: ✅ **RESOLVED** - Initially thought Responses API didn't support streaming with tools, but documentation confirms it does. Can use `responses.create({ stream: true, tools: [...] })` with event types like `response.function_call_arguments.delta` and `response.reasoning_summary_text.delta`.
  - **Impact**: None - No migration needed
  - **Likelihood**: N/A - False alarm

- **SSE Connection Reliability**: Server-Sent Events can fail on mobile networks with intermittent connectivity
  - **Impact**: Medium - Users see errors mid-conversation
  - **Likelihood**: Medium - Common on mobile networks

- **Token Cost Growth**: Full conversation history sent with each request - costs grow linearly with conversation length
  - **Impact**: Medium - Could exceed budget with heavy usage
  - **Likelihood**: Medium - Mitigated by 20-message limit

- **Race Conditions**: User sends new message while previous response is streaming
  - **Impact**: Low - Could show mixed responses or partial messages
  - **Likelihood**: Low - Mitigated by disabling input during streaming

- **Context Window Limits**: Very long messages + conversation history could exceed OpenAI's context window
  - **Impact**: Low - API returns error, breaks conversation
  - **Likelihood**: Low - 20-message limit and 1000-char message limit provide buffer

### Mitigation Strategies

- **~~OpenAI Streaming + Tools~~**: ✅ **NO MITIGATION NEEDED** - Responses API natively supports streaming with tools. Use existing architecture with `stream: true` flag.

- **SSE Reliability**:
  - Implement automatic reconnection with exponential backoff (max 3 retries)
  - Preserve conversation state across reconnections
  - Display clear error messages with manual retry option
  - Add 90-second idle timeout to clean up stale connections

- **Token Cost Growth**:
  - Enforce 20-message limit strictly (10 user + 10 assistant)
  - Display warning at 15 messages (e.g., "5 messages remaining before reset")
  - Consider conversation summarization in future (out of scope for initial release)

- **Race Conditions**:
  - Disable input field while streaming (`isStreaming` state)
  - If new message sent (edge case), abort current SSE connection explicitly
  - Clear streaming state before starting new request

- **Context Window**:
  - Validate total token count before sending (rough estimate: message count × 500 tokens)
  - If approaching limit (>90%), force conversation reset with clear message
  - Display character counter to encourage concise messages

## Success Metrics

### Definition of Done

- [ ] All 11 acceptance scenarios from spec are working end-to-end
- [ ] All 40 functional requirements are implemented and verified
- [ ] E2E tests cover full conversation flow (initial query, follow-ups, refinements, clear)
- [ ] Streaming text appears within 1-2 seconds of query submission
- [ ] Text buffering (200ms) creates smooth appearance (no jarring character-by-character)
- [ ] Thinking summaries appear before text streaming begins
- [ ] Results display as soon as TMDB data is ready (even during text streaming)
- [ ] 20-message conversation limit is enforced with clear warnings
- [ ] All translations are complete in English and Chinese
- [ ] Mobile experience is fully responsive and usable
- [ ] Accessibility requirements met (WCAG AA, keyboard navigation, screen reader)
- [ ] `pnpm build:tsc` passes with no type errors
- [ ] `pnpm lint:changed` passes with no warnings
- [ ] `pnpm test` passes all unit tests
- [ ] `pnpm test:e2e` passes all E2E tests

### Quality Gates

- [x] Phase 1 complete: Streaming agent yields events in correct sequence (verified with unit tests)
- [x] Phase 2 complete: SSE endpoint returns valid stream (verified with curl/fetch test)
- [x] Phase 3 complete: Chat UI components render correctly in isolation (verified with component tests)
- [x] Phase 4 complete: Hook manages state correctly with mocked SSE (verified with integration tests)
- [x] Phase 5 complete: Full page integration complete - TypeScript, ESLint, unit tests passing (ready for manual verification)
- [ ] Phase 6 complete: All edge cases handled, E2E tests passing (automated + manual verification)
- [ ] Code review completed with focus on error handling and accessibility
- [ ] Performance validated: First token within 1-2 seconds, smooth scrolling at 60fps
- [ ] Cross-browser testing: Chrome, Firefox, Safari (desktop and mobile)
- [ ] Load testing: Verify API can handle 10 concurrent streaming connections

## Dependencies & Prerequisites

### External Dependencies

- **OpenAI API**: Requires active API key with Responses API or Chat Completions API access
  - **Impact**: Blocking - Cannot develop without API access
  - **Mitigation**: Use development/test API key, implement mock mode for local development

- **TMDB API**: Existing dependency, no changes needed
  - **Impact**: None - Already integrated

- **Browser SSE Support**: Requires EventSource API or Fetch streaming support
  - **Impact**: Low - Modern browsers all support (Chrome 6+, Firefox 6+, Safari 5+)
  - **Mitigation**: Polyfill for older browsers (unlikely to be needed)

### Internal Prerequisites

- **Existing Agent System**: Phase 1 extends `src/ai/agent.ts` - must understand current two-phase pattern
  - **Prerequisite**: Read and understand existing agent implementation

- **Translation System**: Phase 3 requires adding new translation keys
  - **Prerequisite**: Understand translation context provider pattern

- **OpenAI SDK Knowledge**: Need to understand Responses API streaming with tools
  - **Prerequisite**: Review OpenAI event types (`response.function_call_arguments.delta`, `response.reasoning_summary_text.delta`, `response.text.delta`)

- **SSE Protocol Knowledge**: Phase 2 requires implementing SSE server
  - **Prerequisite**: Research SSE format, headers, and error handling best practices

### Migration Considerations

- **Existing AI Search Page**: Current implementation at `/[locale]/movie-database/ai-search?q=...` will be completely replaced
  - **Impact**: Breaking change for any users who bookmarked specific queries
  - **Mitigation**: No migration needed - search is ephemeral (no persistence), users can simply re-submit queries

- **SearchButton Component**: Will change behavior (no more overlay with query input)
  - **Impact**: Low - UX change, but navigation remains to same page
  - **Option**: Keep overlay for query input, send first message automatically when navigating
