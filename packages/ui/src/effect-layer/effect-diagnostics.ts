// Lab-only diagnostics: remove this file and every call to it before the PR.
// They show on a phone screen why the effect layer is off or draws nothing.

type Listener = () => void;

const MAX_LOG = 120;
const NOTIFY_MS = 250;

let enabled = false;
let status: Readonly<Record<string, string>> = {};
let log: readonly string[] = [];
let snapshot = { status, log };
let notifyTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<Listener>();

function notify() {
  if (notifyTimer !== null) {
    return;
  }
  notifyTimer = setTimeout(() => {
    notifyTimer = null;
    snapshot = { status, log };
    for (const listener of listeners) {
      listener();
    }
  }, NOTIFY_MS);
}

/**
 * Lab-only diagnostics: `enable` starts to record, before the device is
 * requested; `subscribe` and `read` serve `useSyncExternalStore`.
 */
export const effectDiagnostics = {
  enable: () => {
    enabled = true;
    setEffectStatus(
      "page",
      `isSecureContext ${String(window.isSecureContext)}, navigator.gpu ${"gpu" in navigator ? "present" : "MISSING"}, ${window.location.origin}`,
    );
  },
  subscribe: (listener: Listener) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  read: () => snapshot,
};

/** Lab-only diagnostics: sets one line of state. */
export function setEffectStatus(key: string, value: string) {
  if (!enabled || status[key] === value) {
    return;
  }
  status = { ...status, [key]: value };
  notify();
}

/** Lab-only diagnostics: adds one event to the log. */
export function noteEffect(text: string) {
  if (!enabled) {
    return;
  }
  log = [...log, `${(performance.now() / 1000).toFixed(2)}s ${text}`].slice(
    -MAX_LOG,
  );
  notify();
}

export function describeError(error: unknown) {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }
  return String(error);
}

function shaderName(code: string, label: string | undefined) {
  if (label !== undefined && label !== "") {
    return label;
  }
  const entries = [
    ...code.matchAll(/@(?:vertex|fragment|compute)[^\n]*\n?\s*fn (\w+)/g),
  ].map((match) => match[1]);
  return entries.length > 0 ? entries.join("+") : "shader";
}

/**
 * Lab-only diagnostics: wraps the device so that each shader module reports
 * its compilation messages, each async pipeline its rejection, and the
 * device its uncaptured errors and its loss.
 */
export function instrumentEffectDevice(device: GPUDevice) {
  if (!enabled) {
    return;
  }
  device.addEventListener("uncapturederror", (event) => {
    noteEffect(`uncapturederror: ${event.error.message}`);
  });
  void device.lost.then((info) => {
    noteEffect(`device.lost reason=${info.reason} message=${info.message}`);
    setEffectStatus("device", `lost (${info.reason}) ${info.message}`);
  });

  const createShaderModule = device.createShaderModule.bind(device);
  device.createShaderModule = (descriptor) => {
    const name = shaderName(descriptor.code, descriptor.label);
    device.pushErrorScope("validation");
    const module = createShaderModule(descriptor);
    void device.popErrorScope().then(
      (error) => {
        if (error !== null) {
          noteEffect(`module ${name} validation error: ${error.message}`);
        }
      },
      (error: unknown) => {
        noteEffect(`module ${name} popErrorScope: ${describeError(error)}`);
      },
    );
    if (typeof module.getCompilationInfo !== "function") {
      noteEffect(`module ${name}: no getCompilationInfo`);
      return module;
    }
    const lines = descriptor.code.split("\n");
    module.getCompilationInfo().then(
      (info) => {
        const counts = { error: 0, warning: 0, info: 0 };
        for (const message of info.messages) {
          counts[message.type] += 1;
          const line = lines[message.lineNum - 1]?.trim() ?? "";
          noteEffect(
            `module ${name} ${message.type} ${String(message.lineNum)}:${String(message.linePos)} ${message.message} | ${line}`,
          );
        }
        noteEffect(
          `module ${name} compiled: ${String(counts.error)} errors, ${String(counts.warning)} warnings`,
        );
      },
      (error: unknown) => {
        noteEffect(
          `module ${name} getCompilationInfo: ${describeError(error)}`,
        );
      },
    );
    return module;
  };

  const createRenderPipelineAsync =
    device.createRenderPipelineAsync.bind(device);
  device.createRenderPipelineAsync = (descriptor) => {
    const name = `${descriptor.vertex.entryPoint ?? "?"}/${descriptor.fragment?.entryPoint ?? "-"}`;
    return createRenderPipelineAsync(descriptor).then(
      (pipeline) => {
        noteEffect(`render pipeline ${name} ok`);
        return pipeline;
      },
      (error: unknown) => {
        noteEffect(`render pipeline ${name} FAILED: ${describeError(error)}`);
        throw error;
      },
    );
  };

  const createComputePipelineAsync =
    device.createComputePipelineAsync.bind(device);
  device.createComputePipelineAsync = (descriptor) => {
    const name = descriptor.compute.entryPoint ?? "?";
    return createComputePipelineAsync(descriptor).then(
      (pipeline) => {
        noteEffect(`compute pipeline ${name} ok`);
        return pipeline;
      },
      (error: unknown) => {
        noteEffect(`compute pipeline ${name} FAILED: ${describeError(error)}`);
        throw error;
      },
    );
  };
}
