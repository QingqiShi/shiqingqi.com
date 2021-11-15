import { useEffect, useState } from 'react';
import vs from './shaders/vs.glsl';
import fs from './shaders/fs.glsl';
import { init, start } from './loop';
import classes from './FlowGradient.module.css';
import { useTheme } from '../../contexts/theme';

interface FlowGradientProps {}

function FlowGradient(_props: FlowGradientProps) {
  const { theme } = useTheme();
  const [ref, setRef] = useState<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (ref) {
      const context = init(ref, vs, fs);
      if (context) {
        return start(
          context,
          theme === 'dark'
            ? { colorBackground: [0.161, 0.161, 0.161] }
            : { colorBackground: [0.953, 0.929, 0.929] }
        );
      }
    }
  }, [ref, theme]);

  return <canvas className={classes.canvas} ref={setRef} />;
}

export default FlowGradient;
