import { useEffect, useRef, useState } from 'react';
import classes from './Switch.module.css';

export enum SwitchState {
  OFF,
  ON,
  INDETERMINATE,
}

interface SwitchProps extends Omit<React.ComponentProps<'input'>, 'onChange'> {
  value?: SwitchState;
  onChange?: (state: SwitchState) => void;
}

function Switch({ value, onChange, ...rest }: SwitchProps) {
  const [el, setEl] = useState<HTMLInputElement | null>(null);

  // Set input state to match value prop
  useEffect(() => {
    if (!el) return;
    switch (value) {
      case SwitchState.OFF:
        el.indeterminate = false;
        el.checked = false;
        break;
      case SwitchState.ON:
        el.indeterminate = false;
        el.checked = true;
        break;
      case SwitchState.INDETERMINATE:
        el.indeterminate = true;
        break;
    }
  }, [el, value]);

  // onChange ref
  const onChangeRef = useRef<(state: SwitchState) => void>();
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  // Drag and drop
  useEffect(() => {
    if (!el) return;

    let initialX = 0;
    let isDragging = false;
    let rect: DOMRect | null = null;

    const preventDefault = (e: MouseEvent) => {
      e.preventDefault();
    };

    const dragInit = (e: PointerEvent) => {
      if (el.disabled) return;
      rect = el.getBoundingClientRect();
      initialX = e.clientX;
      document.addEventListener('pointermove', dragging);
    };

    const dragging = (e: PointerEvent) => {
      if (!rect) return;
      if (!isDragging && Math.abs(e.clientX - initialX) < 5) return;
      isDragging = true;
      const x = e.clientX - rect.left - rect.height / 2;
      const clampedX = Math.max(0, Math.min(rect.width - rect.height, x));
      el.style.setProperty('--thumb-transition-duration', '0s');
      el.style.setProperty('--thumb-position', `${clampedX}px`);
    };

    const dragEnd = (e: PointerEvent) => {
      document.removeEventListener('pointermove', dragging);

      if (isDragging) {
        isDragging = false;
        el.style.setProperty('--thumb-transition-duration', null);
        el.style.setProperty('--thumb-position', null);

        if (!rect) return;
        if (el.indeterminate) el.indeterminate = false;

        el.checked = e.clientX > rect.left + rect.width / 2;
        if (onChangeRef.current) {
          onChangeRef.current(el.checked ? SwitchState.ON : SwitchState.OFF);
        }
      } else if (e.target === el) {
        el.checked = !el.checked;
        if (onChangeRef.current) {
          onChangeRef.current(el.checked ? SwitchState.ON : SwitchState.OFF);
        }
      }

      if (!isDragging) return;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        el.checked = !el.checked;
        if (onChangeRef.current) {
          onChangeRef.current(el.checked ? SwitchState.ON : SwitchState.OFF);
        }
      }
    };

    el.addEventListener('click', preventDefault);
    el.addEventListener('pointerdown', dragInit);
    el.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerup', dragEnd);
    return () => {
      el.removeEventListener('click', preventDefault);
      el.removeEventListener('pointerdown', dragInit);
      el.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerup', dragEnd);
    };
  }, [el]);

  return (
    <input ref={setEl} className={classes.switch} type="checkbox" {...rest} />
  );
}

export default Switch;
