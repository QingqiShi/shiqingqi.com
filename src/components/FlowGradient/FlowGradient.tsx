import { useEffect, useState } from 'react';
import vs from './shaders/vs';
import fs from './shaders/fs';
import { init, start } from './loop';
import classes from './FlowGradient.module.css';

interface FlowGradientProps {}

function FlowGradient(_props: FlowGradientProps) {
  const [ref, setRef] = useState<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (ref && vs && fs) {
      const context = init(ref, vs, fs);
      if (context) {
        return start(context, {});
      }
    }
  }, [ref, vs, fs]);

  return <canvas className={classes.canvas} ref={setRef} />;
}

export default FlowGradient;
